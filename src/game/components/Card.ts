/**
 * Card DOM + GSAP flip. Kill existing timeline before new flip; trigger Haptics.flip(); dispose Shape3D before next card when previous was 3D.
 */

import { gsap } from 'gsap';
import type { CardData } from '../types';
import { renderShape2D } from './Shape2D';
import { Shape3DRenderer } from './Shape3D';
import { Haptics } from './Haptics';

const FLIP_DURATION = 0.4;

export class CardComponent {
  private root: HTMLElement;
  private face: HTMLElement;
  private contentEl: HTMLElement;
  private flipTimeline: gsap.core.Timeline | null = null;
  private shape3d: Shape3DRenderer | null = null;
  private currentKind: CardData['kind'] | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.face = root.querySelector('[data-card-face]') as HTMLElement;
    this.contentEl = root.querySelector('[data-card-content]') as HTMLElement;
    if (!this.face || !this.contentEl) {
      this.face = root;
      this.contentEl = root;
    }
  }

  /**
   * Set card content (2D or 3D shape, or solid color). Disposes previous 3D if any.
   */
  setContent(data: CardData): void {
    if (this.currentKind === 'shape3d' && this.shape3d) {
      this.shape3d.dispose();
      this.shape3d = null;
    }
    this.contentEl.innerHTML = '';
    this.currentKind = data.kind;

    if (data.kind === 'color') {
      const div = document.createElement('div');
      div.className = 'w-full h-full rounded-lg';
      div.style.backgroundColor = data.color ?? '#6b7280';
      this.contentEl.appendChild(div);
      return;
    }

    if (data.kind === 'shape2d' && data.shape2d) {
      const wrap = document.createElement('div');
      wrap.className = 'w-full h-full flex items-center justify-center min-h-[200px]';
      this.contentEl.appendChild(wrap);
      renderShape2D(wrap, data.shape2d, data.color ?? 'gray');
      return;
    }

    if (data.kind === 'shape3d' && data.shape3d) {
      const wrap = document.createElement('div');
      wrap.className = 'w-full h-full min-h-[200px]';
      this.contentEl.appendChild(wrap);
      this.shape3d = new Shape3DRenderer();
      this.shape3d.mount(wrap, data.shape3d, data.color);
    }
  }

  /**
   * Run flip animation, trigger haptic, then call onComplete. Kills any existing flip timeline first.
   */
  flipToNext(onComplete?: () => void): void {
    if (this.flipTimeline) {
      this.flipTimeline.kill();
      this.flipTimeline = null;
    }
    this.flipTimeline = gsap.timeline({
      onComplete: () => {
        Haptics.flip();
        this.flipTimeline = null;
        onComplete?.();
      },
    });
    this.flipTimeline.to(this.face, {
      duration: FLIP_DURATION / 2,
      rotateY: 90,
      ease: 'power2.in',
    });
    this.flipTimeline.to(this.face, {
      duration: FLIP_DURATION / 2,
      rotateY: 0,
      ease: 'power2.out',
    });
  }

  /** Call before unmount or when switching away from 3D card. */
  dispose(): void {
    if (this.flipTimeline) {
      this.flipTimeline.kill();
      this.flipTimeline = null;
    }
    if (this.shape3d) {
      this.shape3d.dispose();
      this.shape3d = null;
    }
    this.currentKind = null;
  }

  getContentElement(): HTMLElement {
    return this.contentEl;
  }

  getRoot(): HTMLElement {
    return this.root;
  }
}
