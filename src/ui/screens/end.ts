// Écran de fin : podium + rejouer.

import { store } from '../../state/store';
import { h } from '../dom';

export function renderEnd(root: HTMLElement) {
  const s = store.state;
  const ranked = [...s.players].sort((a, b) => b.score - a.score);

  let title = '게임 종료';
  if (s.winnerId === -1) title = '무승부';
  else if (s.winnerId !== null) {
    const w = s.players.find((p) => p.id === s.winnerId);
    if (w) title = `${w.name} 승리!`;
  }

  const screen = h(
    'div',
    { class: 'end-screen' },
    h('h1', { class: 'title' }, title),
    h(
      'ol',
      { class: 'podium' },
      ...ranked.map((p, i) =>
        h(
          'li',
          {
            class: `podium-item rank-${i + 1}`,
            style: `--c: ${p.color}`,
          },
          h('span', { class: 'rank' }, `${i + 1}`),
          h('span', { class: 'pname' }, p.name + (p.isAI ? ' 🤖' : '')),
          h('span', { class: 'pscore' }, `${p.score} 점`),
        ),
      ),
    ),
    h(
      'div',
      { class: 'end-actions' },
      h(
        'button',
        {
          class: 'cta',
          onclick: () => store.reset(),
        },
        '다시 하기',
      ),
    ),
  );

  root.appendChild(screen);
}
