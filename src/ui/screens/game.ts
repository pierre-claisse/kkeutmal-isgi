// Écran de jeu : chaîne, input, IA, timer.

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
  const hanbangBanner = h(
    'div',
    {
      class: 'hanbang-banner',
      hidden: !s.freeNextTurn || s.chain.length === 0,
    },
    h('span', { class: 'hanbang-pulse' }, '한방단어!'),
    h('span', {}, '다음 차례는 자유 선택입니다.'),
  );

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

  let kbOpen = false;
  const keyboardWrap = h(
    'div',
    { class: 'kb-wrap', hidden: true },
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
      class: 'btn kb-toggle',
      disabled: me.isAI,
      title: '한글 자판',
      'aria-pressed': 'false',
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
    s.mode.kind === 'time' ? mountTimer(s.remainingMs ?? 0) : null,
  );

  // Chaîne de mots — pierres reliées par courbes organiques.
  // Reverse : le mot le plus récent doit apparaître en haut à gauche,
  // l'ordre chronologique du jeu se lit donc du présent vers le passé.
  const pebbles: PebbleData[] = s.chain
    .map((m, i) => ({
      word: m.word,
      color:
        m.playerId < 0
          ? 'var(--fg-mute)'
          : colorFor(s.players.findIndex((p) => p.id === m.playerId)),
      auto: m.auto,
      isHanbang: m.isHanbang,
      index: i + 1,
    }))
    .reverse();
  const chainList = buildPebbleChain(pebbles);

  const layout = h(
    'div',
    { class: 'layout' },
    header,
    hanbangBanner,
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

function setTimerText(el: HTMLElement, ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  el.textContent = `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Crée le DOM du timer et démarre une boucle locale qui rafraîchit son
 * texte sans toucher au reste de l'écran. La boucle s'arrête d'elle-même
 * quand l'élément est retiré du DOM (changement d'écran).
 */
function mountTimer(initialMs: number): HTMLElement {
  const el = h('div', { class: 'timer', 'aria-label': '남은 시간' });
  setTimerText(el, initialMs);
  const loop = () => {
    if (!el.isConnected) return;
    setTimerText(el, store.state.remainingMs ?? 0);
    setTimeout(loop, 250);
  };
  setTimeout(loop, 250);
  return el;
}
