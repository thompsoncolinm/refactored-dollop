/**
 * Three.js scene: one mesh (cube, sphere, cone, torus, pyramid). Random color, slow rotation. dispose() for cleanup.
 */

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  MeshLambertMaterial,
  AmbientLight,
  DirectionalLight,
  BoxGeometry,
  SphereGeometry,
  ConeGeometry,
  TorusGeometry,
  TetrahedronGeometry,
  Color,
} from 'three';
import type { Shape3DType } from '../types';
import { COLOR_TO_HEX } from '../types';

const COLOR_NAMES = Object.keys(COLOR_TO_HEX).filter((k) => k !== 'gray');

function pickColor(): number {
  const name = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
  const hex = COLOR_TO_HEX[name] ?? '#6b7280';
  return new Color(hex).getHex();
}

function createGeometry(shape: Shape3DType) {
  switch (shape) {
    case 'cube':
      return new BoxGeometry(1, 1, 1);
    case 'sphere':
      return new SphereGeometry(0.6, 32, 32);
    case 'cone':
      return new ConeGeometry(0.6, 1.2, 32);
    case 'torus':
      return new TorusGeometry(0.5, 0.2, 16, 32);
    case 'pyramid':
      return new TetrahedronGeometry(0.8);
    default:
      return new BoxGeometry(1, 1, 1);
  }
}

const MIN_SIZE = 1;

export class Shape3DRenderer {
  private scene: unknown = null;
  private camera: unknown = null;
  private renderer: unknown = null;
  private mesh: unknown = null;
  private geometry: unknown = null;
  private material: unknown = null;
  private animationId: number | null = null;
  private container: HTMLElement | null = null;
  private resizeHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private applySize(): void {
    if (!this.container || !this.camera || !this.renderer) return;
    const w = Math.max(MIN_SIZE, this.container.clientWidth);
    const h = Math.max(MIN_SIZE, this.container.clientHeight);
    (this.camera as { aspect: number; updateProjectionMatrix: () => void }).aspect = w / h;
    (this.camera as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
    (this.renderer as { setSize: (w: number, h: number) => void }).setSize(w, h);
  }

  mount(container: HTMLElement, shape: Shape3DType, colorName?: string): void {
    this.dispose();
    this.container = container;
    const scene = new Scene();
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 2.5;
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    const w = Math.max(MIN_SIZE, container.clientWidth);
    const h = Math.max(MIN_SIZE, container.clientHeight);
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const geometry = createGeometry(shape);
    const hex = colorName && COLOR_TO_HEX[colorName] ? new Color(COLOR_TO_HEX[colorName]).getHex() : pickColor();
    const material = new MeshLambertMaterial({ color: hex });
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const ambient = new AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir = new DirectionalLight(0xffffff, 0.85);
    dir.position.set(2, 3, 4);
    scene.add(dir);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.mesh = mesh;
    this.geometry = geometry;
    this.material = material;

    const animate = (): void => {
      this.animationId = requestAnimationFrame(animate);
      if (this.mesh) {
        (this.mesh as { rotation: { x: number; y: number } }).rotation.y += 0.008;
        (this.mesh as { rotation: { x: number; y: number } }).rotation.x += 0.003;
      }
      if (this.renderer && this.scene && this.camera) {
        (this.renderer as { render: (a: unknown, b: unknown) => void }).render(this.scene, this.camera);
      }
    };
    animate();

    this.resizeHandler = (): void => this.applySize();
    window.addEventListener('resize', this.resizeHandler);

    this.resizeObserver = new ResizeObserver(() => this.applySize());
    this.resizeObserver.observe(container);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.applySize());
    });
  }

  dispose(): void {
    if (this.animationId != null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.resizeObserver && this.container) {
      this.resizeObserver.unobserve(this.container);
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.geometry && typeof (this.geometry as { dispose?: () => void }).dispose === 'function') {
      (this.geometry as { dispose: () => void }).dispose();
      this.geometry = null;
    }
    if (this.material && typeof (this.material as { dispose?: () => void }).dispose === 'function') {
      (this.material as { dispose: () => void }).dispose();
      this.material = null;
    }
    if (this.renderer) {
      (this.renderer as { dispose: () => void; domElement?: HTMLElement }).dispose();
      const el = (this.renderer as { domElement?: HTMLElement }).domElement;
      if (el?.parentNode) el.parentNode.removeChild(el);
      this.renderer = null;
    }
    this.mesh = null;
    this.scene = null;
    this.camera = null;
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    this.container = null;
  }

  /** Reduce pixel ratio for low-end devices (call from FPS fallback). */
  setPixelRatio(ratio: number): void {
    if (this.renderer) {
      (this.renderer as { setPixelRatio: (r: number) => void }).setPixelRatio(ratio);
    }
  }
}
