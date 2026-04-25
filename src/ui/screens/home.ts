// Écran d'accueil : configuration de la partie.

import { store } from '../../state/store';
import { h } from '../dom';
import { colorFor } from '../theme';

export function renderHome(root: HTMLElement) {
  let nbPlayers = 1;
  let scoreTarget = 50;
  let duumOn = true;

  const playersGrid = h('div', { class: 'players-grid' });
  const buildPlayersInputs = () => {
    playersGrid.innerHTML = '';
    for (let i = 0; i < nbPlayers; i++) {
      playersGrid.appendChild(
        h(
          'label',
          { class: 'player-input', style: `--c: ${colorFor(i)}` },
          h('span', { class: 'player-tag' }, `P${i + 1}`),
          h('input', {
            type: 'text',
            name: `player-${i}`,
            placeholder: `플레이어 ${i + 1}`,
            maxlength: 30,
            autocomplete: 'off',
          }),
        ),
      );
    }
  };
  buildPlayersInputs();

  const form = h(
    'form',
    {
      class: 'home-form',
      onsubmit: (e: Event) => {
        e.preventDefault();
        const fd = new FormData(form);
        const names: string[] = [];
        for (let i = 0; i < nbPlayers; i++) {
          names.push(String(fd.get(`player-${i}`) ?? '').trim());
        }
        store.startGame({
          playerNames: names,
          duumOn,
          scoreTarget: clamp(scoreTarget, 10, 1000),
        });
      },
    },
    h('h1', { class: 'title' }, '끝말잇기'),

    h(
      'fieldset',
      { class: 'card' },
      h('legend', {}, '플레이어 수'),
      h(
        'div',
        { class: 'row radios' },
        ...[1, 2, 3, 4, 5, 6].map((n) =>
          h(
            'label',
            { class: 'pill' },
            h('input', {
              type: 'radio',
              name: 'np',
              value: n,
              checked: n === nbPlayers,
              onchange: () => {
                nbPlayers = n;
                buildPlayersInputs();
              },
            }),
            h('span', {}, String(n)),
          ),
        ),
      ),
      playersGrid,
    ),

    h(
      'fieldset',
      { class: 'card' },
      h('legend', {}, '목표 점수'),
      h(
        'label',
        { class: 'row mode-value' },
        h('span', {}, '점수 (10–1000)'),
        h('input', {
          type: 'number',
          min: 10,
          max: 1000,
          value: scoreTarget,
          step: 1,
          // Clamp au blur (HTML5 min/max ne bloque pas la saisie manuelle).
          onchange: (e: Event) => {
            const el = e.target as HTMLInputElement;
            scoreTarget = clamp(Number(el.value), 10, 1000);
            el.value = String(scoreTarget);
          },
        }),
      ),
    ),

    h(
      'fieldset',
      { class: 'card' },
      h('legend', {}, '규칙'),
      h(
        'label',
        { class: 'row toggle' },
        h('input', {
          type: 'checkbox',
          checked: true,
          onchange: (e: Event) => {
            duumOn = (e.target as HTMLInputElement).checked;
          },
        }),
        h(
          'span',
          {},
          '두음 법칙 적용 ',
          h('em', { class: 'hint' }, '(녀→여, 료→요, 라→나 …)'),
        ),
      ),
    ),

    h('button', { type: 'submit', class: 'cta' }, '시작'),
  );

  root.appendChild(form);
}

function clamp(n: number, lo: number, hi: number) {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
