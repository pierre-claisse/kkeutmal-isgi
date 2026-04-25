// Clavier virtuel coréen 두벌식 (3 rangées de jamos + shift + backspace).

import { h } from '../dom';

const ROW1 = ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'];
const ROW2 = ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'];
const ROW3 = ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'];

const SHIFT_MAP: Record<string, string> = {
  ㅂ: 'ㅃ',
  ㅈ: 'ㅉ',
  ㄷ: 'ㄸ',
  ㄱ: 'ㄲ',
  ㅅ: 'ㅆ',
  ㅐ: 'ㅒ',
  ㅔ: 'ㅖ',
};

interface Options {
  onJamo: (j: string) => void;
  onBackspace: () => void;
}

export function buildHangulKeyboard(opts: Options): HTMLElement {
  let shifted = false;
  const tracked: { el: HTMLButtonElement; base: string }[] = [];

  const makeKey = (jamo: string): HTMLButtonElement => {
    const el = h(
      'button',
      {
        type: 'button',
        class: 'hk-key',
        // mousedown.preventDefault() pour ne pas voler le focus de l'input.
        onmousedown: (e: Event) => e.preventDefault(),
        onclick: () => {
          const out = shifted && SHIFT_MAP[jamo] ? SHIFT_MAP[jamo]! : jamo;
          opts.onJamo(out);
          if (shifted) {
            shifted = false;
            renderShift();
          }
        },
      },
      jamo,
    );
    tracked.push({ el, base: jamo });
    return el;
  };

  const shiftBtn = h(
    'button',
    {
      type: 'button',
      class: 'hk-key hk-util-key hk-shift',
      onmousedown: (e: Event) => e.preventDefault(),
      onclick: () => {
        shifted = !shifted;
        renderShift();
      },
    },
    '⇧',
  );

  const backBtn = h(
    'button',
    {
      type: 'button',
      class: 'hk-key hk-util-key hk-backspace',
      onmousedown: (e: Event) => e.preventDefault(),
      onclick: () => opts.onBackspace(),
    },
    '⌫',
  );

  const renderShift = () => {
    for (const t of tracked) {
      const swap = SHIFT_MAP[t.base];
      t.el.textContent = shifted && swap ? swap : t.base;
    }
    shiftBtn.classList.toggle('active', shifted);
  };

  return h(
    'div',
    { class: 'hangul-keyboard', role: 'group', 'aria-label': '한글 자판' },
    h('div', { class: 'hk-row' }, ...ROW1.map(makeKey)),
    h('div', { class: 'hk-row' }, ...ROW2.map(makeKey)),
    h('div', { class: 'hk-row' }, ...ROW3.map(makeKey)),
    h('div', { class: 'hk-row hk-util' }, shiftBtn, backBtn),
  );
}
