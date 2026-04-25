// Affichage de la chaîne en serpentin de pierres :
// rang 0 gauche→droite, rang 1 droite→gauche, rang 2 gauche→droite, ...
// Reliés par des courbes de Bézier organiques. Bin-packing greedy basé
// sur la largeur naturelle des pebbles, recalculé via ResizeObserver.

import { googleTranslateUrl, naverUrl } from '../../util/naverLink';

export interface PebbleData {
  word: string;
  color: string;     // déjà résolue (var(--pX) ou couleur muette)
  auto: boolean;
  isHanbang: boolean;
  index: number;     // numéro chronologique 1-based affiché dans la pastille
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const PEBBLE_GAP = 16;
const STAGE_PAD_X = 14;

export function buildPebbleChain(items: readonly PebbleData[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'pebble-chain';

  const stage = document.createElement('div');
  stage.className = 'pebble-stage';
  wrap.appendChild(stage);

  // Couche SVG (en arrière-plan).
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pebble-paths');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');
  stage.appendChild(svg);

  // Conteneur des rangs (en avant-plan).
  const rowsContainer = document.createElement('div');
  rowsContainer.className = 'pebble-rows';
  stage.appendChild(rowsContainer);

  // Construire toutes les pebbles (réutilisées entre re-layouts).
  const pebbleEls = items.map((item) => buildPebble(item));

  const layout = () => {
    binPackIntoRows(wrap, rowsContainer, pebbleEls);
    drawPaths(stage, rowsContainer, svg, items);
  };

  // Recalcule sur tout changement de taille du conteneur.
  const ro = new ResizeObserver(layout);
  ro.observe(wrap);

  // Premier rendu après que les éléments soient dans le DOM.
  requestAnimationFrame(layout);

  return wrap;
}

function buildPebble(p: PebbleData): HTMLElement {
  const el = document.createElement('div');
  el.className = `pebble${p.isHanbang ? ' hanbang' : ''}`;
  el.style.setProperty('--c', p.color);

  const num = document.createElement('span');
  num.className = 'p-num';
  num.textContent = String(p.index);
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

function binPackIntoRows(
  wrap: HTMLElement,
  rowsContainer: HTMLElement,
  pebbles: readonly HTMLElement[],
) {
  const usableWidth = wrap.clientWidth - 2 * STAGE_PAD_X;
  if (usableWidth <= 0) return;

  // Vide les rangs sans détacher les pebbles (on les ré-attache).
  while (rowsContainer.firstChild) rowsContainer.removeChild(rowsContainer.firstChild);

  let rowIdx = 0;
  let row = makeRow(rowIdx);
  rowsContainer.appendChild(row);
  let rowWidth = 0;

  for (let i = 0; i < pebbles.length; i++) {
    const pebble = pebbles[i]!;
    row.appendChild(pebble);            // attache pour mesurer
    const w = pebble.offsetWidth;

    const candidateWidth = rowWidth === 0 ? w : rowWidth + PEBBLE_GAP + w;
    if (rowWidth > 0 && candidateWidth > usableWidth) {
      // Ne tient pas : on retire et on ouvre un nouveau rang.
      row.removeChild(pebble);
      rowIdx++;
      row = makeRow(rowIdx);
      rowsContainer.appendChild(row);
      row.appendChild(pebble);
      rowWidth = w;
    } else {
      rowWidth = candidateWidth;
    }
    pebble.dataset.row = String(rowIdx);
  }
}

function makeRow(idx: number): HTMLElement {
  const row = document.createElement('div');
  // Rangs pairs (0, 2, 4 …) gauche→droite ; impairs droite→gauche.
  row.className = idx % 2 === 1 ? 'pebble-row rtl' : 'pebble-row';
  return row;
}

function drawPaths(
  stage: HTMLElement,
  rowsContainer: HTMLElement,
  svg: SVGSVGElement,
  items: readonly PebbleData[],
) {
  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width === 0) return;

  svg.setAttribute('width', String(stageRect.width));
  svg.setAttribute('height', String(stageRect.height));
  svg.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const pebbleEls = rowsContainer.querySelectorAll<HTMLElement>('.pebble');
  for (let i = 0; i < pebbleEls.length - 1; i++) {
    const a = pebbleEls[i]!;
    const b = pebbleEls[i + 1]!;

    const rA = Number(a.dataset.row ?? 0);
    const rB = Number(b.dataset.row ?? 0);
    const dirA = rA % 2 === 0 ? 1 : -1; // 1 = LTR, -1 = RTL
    const dirB = rB % 2 === 0 ? 1 : -1;

    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();

    // Point sortant de A : côté droit si LTR, côté gauche si RTL.
    const x1 = (dirA === 1 ? aRect.right : aRect.left) - stageRect.left;
    const y1 = aRect.top + aRect.height / 2 - stageRect.top;
    // Point entrant de B : côté gauche si LTR, côté droit si RTL.
    const x2 = (dirB === 1 ? bRect.left : bRect.right) - stageRect.left;
    const y2 = bRect.top + bRect.height / 2 - stageRect.top;

    let d: string;
    if (rA === rB) {
      // Même rang : segment droit
      d = `M ${x1},${y1} L ${x2},${y2}`;
    } else {
      // Cross-row : U couché spacieux (control points horizontaux loin pour
      // une boucle large et détendue).
      const side = dirA;
      const bow = Math.max(55, Math.abs(y2 - y1));
      d = `M ${x1},${y1} C ${x1 + side * bow},${y1} ${x2 + side * bow},${y2} ${x2},${y2}`;
    }

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
