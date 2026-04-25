// Écran d'accueil : configuration de la partie.

import { store, type Mode } from '../../state/store';
import { h } from '../dom';
import { colorFor } from '../theme';

export function renderHome(root: HTMLElement) {
  let nbPlayers = 2;
  let modeKind = 'score' as 'time' | 'score';
  let timeSec = 180;
  let scoreTarget = 10;
  let duumOn = true;
  // TS narrowing helpers : éviter "comparison has no overlap" sur les `let` mutables
  // dont la valeur change uniquement dans des closures asynchrones.
  const isTime = () => modeKind === 'time';

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
            maxlength: 12,
            autocomplete: 'off',
          }),
        ),
      );
    }
  };
  buildPlayersInputs();

  const timeWrap = h(
    'label',
    { class: 'row mode-value', hidden: !isTime() },
    h('span', {}, '시간 (초, 60–3600)'),
    h('input', {
      type: 'number',
      min: 60,
      max: 3600,
      value: timeSec,
      step: 10,
      oninput: (e: Event) => {
        timeSec = clamp(Number((e.target as HTMLInputElement).value), 60, 3600);
      },
    }),
  );
  const scoreWrap = h(
    'label',
    { class: 'row mode-value', hidden: isTime() },
    h('span', {}, '목표 점수 (10–1000)'),
    h('input', {
      type: 'number',
      min: 10,
      max: 1000,
      value: scoreTarget,
      step: 1,
      oninput: (e: Event) => {
        scoreTarget = clamp(Number((e.target as HTMLInputElement).value), 10, 1000);
      },
    }),
  );

  const updateModeUI = () => {
    timeWrap.hidden = !isTime();
    scoreWrap.hidden = isTime();
  };

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
        const mode: Mode = isTime()
          ? { kind: 'time', seconds: clamp(timeSec, 60, 3600) }
          : { kind: 'score', target: clamp(scoreTarget, 10, 1000) };
        store.startGame({ playerNames: names, duumOn, mode });
      },
    },
    h('h1', { class: 'title neon' }, '끝말잇기'),
    h('p', { class: 'subtitle' }, 'Word Chain — Korean'),

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
      h('legend', {}, '게임 모드'),
      h(
        'div',
        { class: 'row radios' },
        h(
          'label',
          { class: 'pill' },
          h('input', {
            type: 'radio',
            name: 'mode',
            value: 'score',
            checked: modeKind === 'score',
            onchange: () => {
              modeKind = 'score';
              updateModeUI();
            },
          }),
          h('span', {}, '목표 점수'),
        ),
        h(
          'label',
          { class: 'pill' },
          h('input', {
            type: 'radio',
            name: 'mode',
            value: 'time',
            checked: modeKind === 'time',
            onchange: () => {
              modeKind = 'time';
              updateModeUI();
            },
          }),
          h('span', {}, '제한 시간'),
        ),
      ),
      scoreWrap,
      timeWrap,
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

    h('button', { type: 'submit', class: 'cta neon' }, '시작'),
  );

  root.appendChild(form);
}

function clamp(n: number, lo: number, hi: number) {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
