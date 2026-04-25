// Écran de jeu : chaîne, input, IA, timer.

import { ERROR_MESSAGES } from '../../engine/rules';
import { store } from '../../state/store';
import { naverUrl } from '../../util/naverLink';
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

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (me.isAI) return;
    const v = inputEl.value;
    if (!v.trim()) return;
    submit(v);
    inputEl.value = '';
  };

  const inputBar = h(
    'form',
    { class: 'input-bar', onsubmit: handleSubmit },
    inputEl,
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
      { class: 'turn-card neon-border', style: `--c: ${me.color}` },
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
    s.mode.kind === 'time' ? renderTimer(s.remainingMs ?? 0) : null,
  );

  // Chaîne de mots (scrollable)
  const chainList = h(
    'ol',
    { class: 'chain-list' },
    ...s.chain.map((m, idx) => {
      const c = m.playerId < 0 ? '#666' : colorFor(s.players.findIndex((p) => p.id === m.playerId));
      return h(
        'li',
        { class: `chain-item ${m.isHanbang ? 'hanbang' : ''}`, style: `--c: ${c}` },
        h('span', { class: 'idx' }, String(idx + 1)),
        h('span', { class: 'dot', 'aria-hidden': 'true' }),
        h('span', { class: 'word' }, m.word),
        h(
          'a',
          {
            class: 'naver',
            href: naverUrl(m.word),
            target: '_blank',
            rel: 'noopener noreferrer',
            title: 'Naver 사전에서 보기',
            'aria-label': `${m.word} - Naver 사전`,
          },
          '↗',
        ),
        m.auto ? h('span', { class: 'flag' }, 'auto') : null,
        m.isHanbang ? h('span', { class: 'flag hb' }, '한방') : null,
      );
    }),
  );

  // Auto-scroll vers le bas
  setTimeout(() => {
    chainList.scrollTop = chainList.scrollHeight;
  }, 0);

  const layout = h(
    'div',
    { class: 'layout' },
    header,
    hanbangBanner,
    chainList,
    errBox,
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

function renderTimer(ms: number): HTMLElement {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return h(
    'div',
    { class: 'timer neon', 'aria-label': '남은 시간' },
    `${m}:${sec.toString().padStart(2, '0')}`,
  );
}
