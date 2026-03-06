/**
 * Render 2D shapes (circle, square, triangle, star, hexagon) via SVG with shading: gradient fill and drop shadow.
 */

import type { Shape2DType } from '../types';
import { COLOR_TO_HEX } from '../types';

const SIZE = 120;
const HALF = SIZE / 2;

function getHex(color: string): string {
  return COLOR_TO_HEX[color] ?? color;
}

/** Darken a hex color by a factor (0–1). Simple darken for gradient stop. */
function darkenHex(hex: string, factor: number): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const r = Math.max(0, Math.floor(parseInt(m[1], 16) * (1 - factor)));
  const g = Math.max(0, Math.floor(parseInt(m[2], 16) * (1 - factor)));
  const b = Math.max(0, Math.floor(parseInt(m[3], 16) * (1 - factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function starPoints(cx: number, cy: number, outer: number, inner: number, spikes: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function hexagonPoints(cx: number, cy: number, r: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * i) / 3 - Math.PI / 6;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

export function renderShape2D(container: HTMLElement, shape: Shape2DType, color: string): void {
  const hex = getHex(color);
  const dark = darkenHex(hex, 0.35);
  container.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-hidden', 'true');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradId = `shape-grad-${shape}-${hex.replace(/[^a-f0-9]/gi, '')}`;
  const filterId = `shape-shadow-${shape}-${hex.replace(/[^a-f0-9]/gi, '')}`;
  const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  grad.setAttribute('id', gradId);
  grad.setAttribute('x1', '0%');
  grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%');
  grad.setAttribute('y2', '100%');
  grad.innerHTML = `<stop offset="0%" stop-color="${hex}" /><stop offset="100%" stop-color="${dark}" />`;
  defs.appendChild(grad);

  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', filterId);
  filter.setAttribute('x', '-30%');
  filter.setAttribute('y', '-30%');
  filter.setAttribute('width', '160%');
  filter.setAttribute('height', '160%');
  const feOffset = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
  feOffset.setAttribute('in', 'SourceAlpha');
  feOffset.setAttribute('dx', '2');
  feOffset.setAttribute('dy', '3');
  feOffset.setAttribute('result', 'offset');
  const feBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  feBlur.setAttribute('in', 'offset');
  feBlur.setAttribute('stdDeviation', '2');
  feBlur.setAttribute('result', 'blur');
  const feFlood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
  feFlood.setAttribute('flood-color', '#000000');
  feFlood.setAttribute('flood-opacity', '0.28');
  feFlood.setAttribute('result', 'flood');
  const feComp = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
  feComp.setAttribute('in', 'flood');
  feComp.setAttribute('in2', 'blur');
  feComp.setAttribute('operator', 'in');
  feComp.setAttribute('result', 'shadow');
  const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
  const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeNode1.setAttribute('in', 'shadow');
  const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeNode2.setAttribute('in', 'SourceGraphic');
  filter.appendChild(feOffset);
  filter.appendChild(feBlur);
  filter.appendChild(feFlood);
  filter.appendChild(feComp);
  feMerge.appendChild(mergeNode1);
  feMerge.appendChild(mergeNode2);
  filter.appendChild(feMerge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  let pathOrEl: SVGElement;
  switch (shape) {
    case 'circle':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pathOrEl.setAttribute('cx', String(HALF));
      pathOrEl.setAttribute('cy', String(HALF));
      pathOrEl.setAttribute('r', String(HALF - 4));
      pathOrEl.setAttribute('fill', `url(#${gradId})`);
      pathOrEl.setAttribute('filter', `url(#${filterId})`);
      break;
    case 'square':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      pathOrEl.setAttribute('x', '8');
      pathOrEl.setAttribute('y', '8');
      pathOrEl.setAttribute('width', String(SIZE - 16));
      pathOrEl.setAttribute('height', String(SIZE - 16));
      pathOrEl.setAttribute('fill', `url(#${gradId})`);
      pathOrEl.setAttribute('filter', `url(#${filterId})`);
      break;
    case 'triangle':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pathOrEl.setAttribute(
        'points',
        `${HALF},12 ${SIZE - 12},${SIZE - 12} 12,${SIZE - 12}`
      );
      pathOrEl.setAttribute('fill', `url(#${gradId})`);
      pathOrEl.setAttribute('filter', `url(#${filterId})`);
      break;
    case 'star':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pathOrEl.setAttribute(
        'points',
        starPoints(HALF, HALF, HALF - 8, HALF * 0.4, 5)
      );
      pathOrEl.setAttribute('fill', `url(#${gradId})`);
      pathOrEl.setAttribute('filter', `url(#${filterId})`);
      break;
    case 'hexagon':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pathOrEl.setAttribute('points', hexagonPoints(HALF, HALF, HALF - 8));
      pathOrEl.setAttribute('fill', `url(#${gradId})`);
      pathOrEl.setAttribute('filter', `url(#${filterId})`);
      break;
    default:
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pathOrEl.setAttribute('cx', String(HALF));
      pathOrEl.setAttribute('cy', String(HALF));
      pathOrEl.setAttribute('r', String(HALF - 4));
      pathOrEl.setAttribute('fill', `url(#${gradId})`);
      pathOrEl.setAttribute('filter', `url(#${filterId})`);
  }

  svg.appendChild(pathOrEl);
  container.appendChild(svg);
}
