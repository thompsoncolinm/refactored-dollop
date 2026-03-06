/**
 * Render 2D shapes (circle, square, triangle, star, hexagon) via SVG. Input: shape type and fill color (hex or Tailwind name).
 */

import type { Shape2DType } from '../types';
import { COLOR_TO_HEX } from '../types';

const SIZE = 120;
const HALF = SIZE / 2;

function getHex(color: string): string {
  return COLOR_TO_HEX[color] ?? color;
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
  container.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-hidden', 'true');

  let pathOrEl: SVGElement;
  switch (shape) {
    case 'circle':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pathOrEl.setAttribute('cx', String(HALF));
      pathOrEl.setAttribute('cy', String(HALF));
      pathOrEl.setAttribute('r', String(HALF - 4));
      pathOrEl.setAttribute('fill', hex);
      break;
    case 'square':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      pathOrEl.setAttribute('x', '8');
      pathOrEl.setAttribute('y', '8');
      pathOrEl.setAttribute('width', String(SIZE - 16));
      pathOrEl.setAttribute('height', String(SIZE - 16));
      pathOrEl.setAttribute('fill', hex);
      break;
    case 'triangle':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pathOrEl.setAttribute(
        'points',
        `${HALF},12 ${SIZE - 12},${SIZE - 12} 12,${SIZE - 12}`
      );
      pathOrEl.setAttribute('fill', hex);
      break;
    case 'star':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pathOrEl.setAttribute(
        'points',
        starPoints(HALF, HALF, HALF - 8, HALF * 0.4, 5)
      );
      pathOrEl.setAttribute('fill', hex);
      break;
    case 'hexagon':
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pathOrEl.setAttribute('points', hexagonPoints(HALF, HALF, HALF - 8));
      pathOrEl.setAttribute('fill', hex);
      break;
    default:
      pathOrEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pathOrEl.setAttribute('cx', String(HALF));
      pathOrEl.setAttribute('cy', String(HALF));
      pathOrEl.setAttribute('r', String(HALF - 4));
      pathOrEl.setAttribute('fill', hex);
  }

  svg.appendChild(pathOrEl);
  container.appendChild(svg);
}
