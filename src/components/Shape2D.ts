/**
 * Shape2D.ts
 * Renders 2-D shapes onto an SVG element inside a given container.
 * Supported shapes: circle, square, triangle, star, hexagon.
 */

export type Shape2DType = 'circle' | 'square' | 'triangle' | 'star' | 'hexagon';

export const SHAPE_2D_TYPES: Shape2DType[] = [
  'circle',
  'square',
  'triangle',
  'star',
  'hexagon',
];

/** Compute the SVG path data for a regular star polygon. */
function starPath(cx: number, cy: number, r: number, innerR: number, points: number): string {
  const step = Math.PI / points;
  let d = '';
  for (let i = 0; i < 2 * points; i++) {
    const radius = i % 2 === 0 ? r : innerR;
    const angle = i * step - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    d += (i === 0 ? 'M' : 'L') + `${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d + 'Z';
}

/** Compute the SVG path data for a regular hexagon. */
function hexPath(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    d += (i === 0 ? 'M' : 'L') + `${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d + 'Z';
}

/**
 * Render a 2-D shape inside `container`.
 * Previous SVG content (if any) is replaced.
 *
 * @param container  The DOM element to render into.
 * @param shape      Which shape to draw.
 * @param color      CSS fill colour (hex, rgb, or named colour).
 */
export function renderShape2D(
  container: HTMLElement,
  shape: Shape2DType,
  color: string,
): void {
  const ns = 'http://www.w3.org/2000/svg';
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;

  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', shape);

  let el: SVGElement;

  switch (shape) {
    case 'circle': {
      el = document.createElementNS(ns, 'circle');
      el.setAttribute('cx', String(cx));
      el.setAttribute('cy', String(cy));
      el.setAttribute('r', String(r));
      break;
    }
    case 'square': {
      el = document.createElementNS(ns, 'rect');
      el.setAttribute('x', String(cx - r));
      el.setAttribute('y', String(cy - r));
      el.setAttribute('width', String(r * 2));
      el.setAttribute('height', String(r * 2));
      break;
    }
    case 'triangle': {
      el = document.createElementNS(ns, 'polygon');
      const h = r * Math.sqrt(3);
      const points = [
        `${cx},${cy - r}`,
        `${cx - h / 2},${cy + r / 2}`,
        `${cx + h / 2},${cy + r / 2}`,
      ].join(' ');
      el.setAttribute('points', points);
      break;
    }
    case 'star': {
      el = document.createElementNS(ns, 'path');
      el.setAttribute('d', starPath(cx, cy, r, r * 0.45, 5));
      break;
    }
    case 'hexagon': {
      el = document.createElementNS(ns, 'path');
      el.setAttribute('d', hexPath(cx, cy, r));
      break;
    }
    default:
      el = document.createElementNS(ns, 'circle');
  }

  el.setAttribute('fill', color);

  svg.appendChild(el);
  container.innerHTML = '';
  container.appendChild(svg);
}
