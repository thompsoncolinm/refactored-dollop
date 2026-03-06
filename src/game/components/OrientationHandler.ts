/**
 * Listens for orientationchange; on mobile/tablet only, in landscape shows full-screen overlay
 * "Rotate to portrait", pauses voice and animations. Desktop/wide viewports are never asked to rotate.
 */

export interface OrientationCallbacks {
  onPause: () => void;
  onResume: () => void;
}

/** Viewport width below this is treated as mobile/tablet for orientation overlay. */
const MOBILE_MAX_WIDTH_PX = 768;

function isLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(orientation: landscape)').matches;
}

/** True when viewport is narrow (phone/small tablet). Desktop users are not shown the rotate overlay. */
function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`).matches;
}

export class OrientationHandler {
  private overlay: HTMLElement | null = null;
  private callbacks: OrientationCallbacks | null = null;
  private paused = false;
  private mediaQuery: MediaQueryList | null = null;
  private boundCheck: (() => void) | null = null;

  mount(container: HTMLElement, callbacks: OrientationCallbacks): void {
    this.callbacks = callbacks;
    this.overlay = document.createElement('div');
    this.overlay.setAttribute('role', 'alert');
    this.overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white text-center p-6 hidden';
    this.overlay.innerHTML = '<p class="text-xl">Rotate device to portrait to continue</p>';
    container.appendChild(this.overlay);

    this.boundCheck = () => this.check();
    this.mediaQuery = window.matchMedia('(orientation: landscape)');
    this.mediaQuery.addEventListener('change', this.boundCheck);
    window.addEventListener('orientationchange', this.boundCheck);
    window.addEventListener('resize', this.boundCheck);
    this.check();
  }

  private check(): void {
    if (!this.overlay) return;
    const shouldPause = isMobileViewport() && isLandscape();
    if (shouldPause) {
      this.overlay.classList.remove('hidden');
      this.overlay.classList.add('flex');
      if (!this.paused && this.callbacks) {
        this.paused = true;
        this.callbacks.onPause();
      }
    } else {
      this.overlay.classList.add('hidden');
      this.overlay.classList.remove('flex');
      if (this.paused && this.callbacks) {
        this.paused = false;
        this.callbacks.onResume();
      }
    }
  }

  dispose(): void {
    if (this.boundCheck) {
      this.mediaQuery?.removeEventListener('change', this.boundCheck);
      window.removeEventListener('orientationchange', this.boundCheck);
      window.removeEventListener('resize', this.boundCheck);
      this.boundCheck = null;
    }
    this.overlay?.remove();
    this.overlay = null;
    this.callbacks = null;
    this.mediaQuery = null;
    this.paused = false;
  }
}
