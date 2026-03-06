/**
 * Card.ts
 * Manages a flippable card element animated with GSAP.
 * Fires haptic feedback on flip and calls an optional completion callback.
 */

import gsap from 'gsap';
import { hapticFlip } from './Haptics';

export interface CardContent {
  /** Element that carries the visual (SVG, canvas, colour swatch, etc.). */
  element: HTMLElement;
  /** Human-readable label used for the results screen. */
  label: string;
}

export class Card {
  /** The outer wrapper element that is rotated during the flip. */
  readonly element: HTMLElement;

  constructor(container: HTMLElement) {
    this.element = container;
  }

  /**
   * Show the front face of the card instantly (no animation).
   * Useful for the very first card after a deck is generated.
   */
  show(): void {
    gsap.set(this.element, { rotationY: 0, opacity: 1 });
  }

  /**
   * Animate a card-flip transition.
   *   1. Rotate first 90° (card disappears)
   *   2. Call midpoint callback (swap content)
   *   3. Rotate remaining 90° (new face appears)
   *
   * @param onMidpoint  Called at the midpoint so the caller can swap visible content.
   * @param onComplete  Called once the full flip animation finishes.
   */
  flip(onMidpoint?: () => void, onComplete?: () => void): void {
    hapticFlip();

    const tl = gsap.timeline({ onComplete });

    // First half – rotate to edge (card invisible at 90°)
    tl.to(this.element, {
      rotationY: 90,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        onMidpoint?.();
      },
    });

    // Second half – rotate to flat (new face revealed)
    tl.fromTo(
      this.element,
      { rotationY: -90 },
      {
        rotationY: 0,
        duration: 0.3,
        ease: 'power2.out',
      },
    );
  }

  /**
   * Animate the card off-screen to the left (deck exhausted).
   * @param onComplete  Called after the card has left the viewport.
   */
  exit(onComplete?: () => void): void {
    gsap.to(this.element, {
      x: '-120%',
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete,
    });
  }
}
