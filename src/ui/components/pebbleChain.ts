// Affichage de la chaîne sous forme de "pierres" (pebbles) reliées par des
// courbes de Bézier organiques. Wave subtile par nth-child + paths SVG
// recalculés via ResizeObserver.

import { googleTranslateUrl, naverUrl } from '../../util/naverLink';

export interface PebbleData {
  word: string;
  color: string;     // déjà résolue (var(--pX) ou couleur muette)
  auto: boolean;
  isHanbang: boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function buildPebbleChain(items: readonly PebbleData[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'pebble-chain';

  // Couche SVG pour les liens entre pierres (en arrière-plan).
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pebble-paths');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');
  wrap.appendChild(svg);

  // Conteneur flex des pierres, en avant-plan.
  const list = document.createElement('div');
  list.className = 'pebbles';
  for (let i = 0; i < items.length; i++) {
    list.appendChild(buildPebble(items[i]!, i + 1));
  }
  wrap.appendChild(list);

  const redraw = () => drawPaths(list, svg, items);

  // Recalcule les paths quand le layout change (resize, wrap recalcul).
  const ro = new ResizeObserver(redraw);
  ro.observe(list);

  // Premier rendu au prochain frame (les éléments doivent être attachés au DOM).
  requestAnimationFrame(redraw);

  return wrap;
}

function buildPebble(p: PebbleData, displayIdx: number): HTMLElement {
  const el = document.createElement('div');
  el.className = `pebble${p.isHanbang ? ' hanbang' : ''}`;
  el.style.setProperty('--c', p.color);

  const num = document.createElement('span');
  num.className = 'p-num';
  num.textContent = String(displayIdx);
  el.appendChild(num);

  const word = document.createElement('span');
  word.className = 'p-word';
  word.textContent = p.word;
  el.appendChild(word);

  const naver = document.createElement('a');
  naver.className = 'p-lookup naver';
  naver.href = naverUrl(p.word);
  naver.target = '_blank';
  naver.rel = 'noopener noreferrer';
  naver.title = 'Naver 사전에서 보기';
  naver.setAttribute('aria-label', `${p.word} - Naver 사전`);
  naver.textContent = '↗';
  el.appendChild(naver);

  const gt = document.createElement('a');
  gt.className = 'p-lookup gt';
  gt.href = googleTranslateUrl(p.word);
  gt.target = '_blank';
  gt.rel = 'noopener noreferrer';
  gt.title = 'Google 번역 (KO→FR)';
  gt.setAttribute('aria-label', `${p.word} - Traduction française`);
  gt.textContent = 'FR';
  el.appendChild(gt);

  if (p.auto) {
    const flag = document.createElement('span');
    flag.className = 'p-flag';
    flag.textContent = 'auto';
    el.appendChild(flag);
  }
  if (p.isHanbang) {
    const flag = document.createElement('span');
    flag.className = 'p-flag hb';
    flag.textContent = '한방';
    el.appendChild(flag);
  }

  return el;
}

function drawPaths(list: HTMLElement, svg: SVGSVGElement, items: readonly PebbleData[]) {
  const containerRect = list.getBoundingClientRect();
  if (containerRect.width === 0) return;

  svg.setAttribute('width', String(containerRect.width));
  svg.setAttribute('height', String(containerRect.height));
  svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const pebbleEls = list.querySelectorAll<HTMLElement>('.pebble');
  for (let i = 0; i < pebbleEls.length - 1; i++) {
    const a = pebbleEls[i]!.getBoundingClientRect();
    const b = pebbleEls[i + 1]!.getBoundingClientRect();

    const x1 = a.right - containerRect.left;
    const y1 = a.top + a.height / 2 - containerRect.top;
    const x2 = b.left - containerRect.left;
    const y2 = b.top + b.height / 2 - containerRect.top;
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Pas de path quand on saute de rang : la lecture top-left → bottom-right
    // suffit, et un cross-row path serait visuellement chargé.
    if (Math.abs(dy) > 30) continue;

    // Bézier cubic horizontale, légèrement bombée vers le haut, alternance
    // de bombement pour un rendu organique.
    const bend = i % 2 === 0 ? -10 : 10;
    const co = Math.max(18, Math.min(70, dx * 0.5));
    const d = `M ${x1},${y1} C ${x1 + co},${y1 + bend} ${x2 - co},${y2 + bend} ${x2},${y2}`;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', items[i + 1]!.color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '0.55');
    svg.appendChild(path);
  }
}
