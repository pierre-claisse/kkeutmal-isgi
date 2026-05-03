// Écran de jeu : chaîne, clavier virtuel, IA.

import { ERROR_MESSAGES } from '../../engine/rules';
import { store } from '../../state/store';
import { HangulComposer } from '../../util/hangulIme';
import { buildHangulKeyboard } from '../components/hangulKeyboard';
import { buildPebbleChain, type PebbleData } from '../components/pebbleChain';
import { h } from '../dom';
import { colorFor } from '../theme';

export function renderGame(root: HTMLElement) {
  const s = store.state;
  const me = s.players[s.currentPlayerIdx]!;
  const prev = s.chain[s.chain.length - 1];

  const errBox = h('div', { class: 'err', role: 'alert' });

  const submit = (raw: string) => {
    if (me.isAI) return;
    const result = store.submitWord(raw);
    if (!result.ok) {
      errBox.textContent = ERROR_MESSAGES[result.reason];
    }
  };

  const composer = new HangulComposer();
  const placeholder = prev
    ? s.freeNextTurn
      ? '아무 단어나 입력 (자유)'
      : `${prev.word.charAt(prev.word.length - 1)}(으)로 시작하는 단어`
    : '첫 단어를 입력';

  // Display read-only : seul le clavier virtuel modifie le composer ;
  // ce div mirroir le texte (placeholder grisé quand vide).
  const displayEl = h(
    'div',
    {
      class: 'composer-display empty',
      role: 'textbox',
      'aria-readonly': 'true',
      'aria-label': '단어 입력',
    },
    placeholder,
  );

  const refreshDisplay = () => {
    const txt = composer.text();
    if (txt) {
      displayEl.textContent = txt;
      displayEl.classList.remove('empty');
    } else {
      displayEl.textContent = placeholder;
      displayEl.classList.add('empty');
    }
  };

  const handleSubmit = (e?: Event) => {
    if (e) e.preventDefault();
    if (me.isAI) return;
    const v = composer.text();
    if (!v.trim()) return;
    submit(v);
    composer.reset();
    refreshDisplay();
  };

  const inputBar = h(
    'form',
    { class: 'input-bar', onsubmit: handleSubmit },
    displayEl,
    h('button', { type: 'submit', class: 'btn primary', disabled: me.isAI }, '제출'),
    h(
      'button',
      {
        type: 'button',
        class: 'btn secondary',
        disabled: me.isAI,
        onclick: () => {
          if (me.isAI) return;
          const r = store.autoFind();
          if (!r.played) errBox.textContent = '가능한 단어가 없습니다.';
          composer.reset();
          refreshDisplay();
        },
      },
      '자동 찾기',
    ),
  );

  const keyboard = buildHangulKeyboard({
    onJamo: (j) => {
      if (me.isAI) return;
      composer.inputJamo(j);
      refreshDisplay();
    },
    onBackspace: () => {
      if (me.isAI) return;
      composer.backspace();
      refreshDisplay();
    },
  });
  if (me.isAI) keyboard.classList.add('disabled');

  const quitBtn = h(
    'button',
    {
      type: 'button',
      class: 'quit-button',
      title: '메뉴로 돌아가기',
      'aria-label': '메뉴로 돌아가기',
      onclick: () => {
        if (confirm('현재 게임을 종료하고 메뉴로 돌아갑니다.')) {
          store.reset();
        }
      },
    },
    '✕',
  );

  // Header
  const header = h(
    'header',
    { class: 'game-header' },
    h(
      'div',
      { class: 'turn-card', style: `--c: ${me.color}` },
      h('div', { class: 'turn-label' }, '현재 차례'),
      h('div', { class: 'turn-name' }, me.name + (me.isAI ? ' 🤖' : '')),
    ),
    h('h1', { class: 'game-title' }, '끝말잇기'),
    h('span', { class: 'game-target' }, `목표 ${s.scoreTarget}점`),
    h(
      'div',
      { class: 'scores' },
      ...s.players.map((p) =>
        h(
          'div',
          {
            class: `score ${p.id === me.id ? 'active' : ''}`,
            style: `--c: ${p.color}`,
          },
          h('span', { class: 'name' }, p.name),
          h('span', { class: 'pts' }, `${p.score}`),
        ),
      ),
    ),
    quitBtn,
  );

  // Chaîne de mots — pierres reliées par courbes organiques (ordre
  // chronologique : premier mot en haut, dernier en bas). Le scroll-to-
  // bottom est déclenché en interne par le composant, avant le premier
  // paint, pour éviter le flash/jump visible.
  const pebbles: PebbleData[] = s.chain.map((m, i) => {
    const owner =
      m.playerId >= 0 ? s.players.find((p) => p.id === m.playerId) : undefined;
    return {
      word: m.word,
      // Auto-found words : couleur neutre quel que soit le joueur, on
      // signale ainsi visuellement qu'il n'y a pas eu de point obtenu.
      color: m.auto
        ? 'var(--auto-c)'
        : owner
          ? colorFor(s.players.findIndex((p) => p.id === owner.id))
          : 'var(--fg-mute)',
      auto: m.auto,
      isHanbang: m.isHanbang,
      index: i + 1,
      // Pseudo en label sur la bordure : seulement pour les mots où
      // le joueur a effectivement marqué un point.
      author: !m.auto && owner ? owner.name : undefined,
    };
  });
  const chainList = buildPebbleChain(pebbles);

  const layout = h(
    'div',
    { class: 'layout' },
    header,
    chainList,
    errBox,
    inputBar,
    keyboard,
  );

  root.appendChild(layout);

  // Coup IA après 800ms
  if (me.isAI) {
    setTimeout(() => {
      if (store.state.phase === 'playing' && store.state.players[store.state.currentPlayerIdx]?.isAI) {
        store.aiPlay();
      }
    }, 800);
  }
}

