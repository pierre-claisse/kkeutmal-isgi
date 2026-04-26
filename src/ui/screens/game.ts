// Écran de jeu : chaîne, input, IA.

import { ERROR_MESSAGES } from '../../engine/rules';
import { store } from '../../state/store';
import { HangulComposer } from '../../util/hangulIme';
import { buildHangulKeyboard } from '../components/hangulKeyboard';
import { buildPebbleChain, type PebbleData } from '../components/pebbleChain';
import { h } from '../dom';
import { colorFor } from '../theme';

// État UI persistant entre re-renders : une fois le clavier virtuel
// ouvert par l'utilisateur, il reste ouvert tant qu'il ne le ferme pas.
let kbOpen = false;

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

  const inputEl = h('input', {
    type: 'text',
    inputmode: 'text',
    lang: 'ko',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    placeholder: prev
      ? s.freeNextTurn
        ? '아무 단어나 입력 (자유)'
        : `${prev.word.charAt(prev.word.length - 1)}(으)로 시작하는 단어`
      : '첫 단어를 입력',
    'aria-label': '단어 입력',
    disabled: me.isAI,
  }) as HTMLInputElement;

  // IME virtuel : pour les claviers physiques sans disposition coréenne.
  const composer = new HangulComposer();
  inputEl.addEventListener('input', () => {
    // Frappe physique → on resynchronise le composer (pending vidé).
    composer.setText(inputEl.value);
  });

  const syncFromComposer = () => {
    inputEl.value = composer.text();
    inputEl.focus();
  };

  const keyboardWrap = h(
    'div',
    { class: 'kb-wrap', hidden: !kbOpen },
    buildHangulKeyboard({
      onJamo: (j) => {
        composer.inputJamo(j);
        syncFromComposer();
      },
      onBackspace: () => {
        composer.backspace();
        syncFromComposer();
      },
    }),
  );

  const kbToggle = h(
    'button',
    {
      type: 'button',
      class: `btn kb-toggle${kbOpen ? ' active' : ''}`,
      disabled: me.isAI,
      title: '한글 자판',
      'aria-pressed': String(kbOpen),
      onclick: () => {
        kbOpen = !kbOpen;
        keyboardWrap.hidden = !kbOpen;
        kbToggle.classList.toggle('active', kbOpen);
        kbToggle.setAttribute('aria-pressed', String(kbOpen));
      },
    },
    '한',
  );

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (me.isAI) return;
    const v = inputEl.value;
    if (!v.trim()) return;
    submit(v);
    inputEl.value = '';
    composer.reset();
  };

  const inputBar = h(
    'form',
    { class: 'input-bar', onsubmit: handleSubmit },
    inputEl,
    kbToggle,
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
          inputEl.value = '';
          composer.reset();
        },
      },
      '자동 찾기',
    ),
  );

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
  const pebbles: PebbleData[] = s.chain.map((m, i) => ({
    word: m.word,
    // Auto-found words : couleur neutre quel que soit le joueur, on
    // signale ainsi visuellement qu'il n'y a pas eu de point obtenu.
    color: m.auto
      ? 'var(--auto-c)'
      : m.playerId < 0
        ? 'var(--fg-mute)'
        : colorFor(s.players.findIndex((p) => p.id === m.playerId)),
    auto: m.auto,
    isHanbang: m.isHanbang,
    index: i + 1,
  }));
  const chainList = buildPebbleChain(pebbles);

  const layout = h(
    'div',
    { class: 'layout' },
    header,
    chainList,
    errBox,
    keyboardWrap,
    inputBar,
  );

  root.appendChild(layout);
  if (!me.isAI) inputEl.focus();

  // Coup IA après 800ms
  if (me.isAI) {
    setTimeout(() => {
      if (store.state.phase === 'playing' && store.state.players[store.state.currentPlayerIdx]?.isAI) {
        store.aiPlay();
      }
    }, 800);
  }
}

