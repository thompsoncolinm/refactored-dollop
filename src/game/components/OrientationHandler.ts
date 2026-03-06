/**
 * Listens for orientationchange; in landscape shows full-screen overlay "Rotate to portrait", pauses voice and animations. Resumes in portrait.
 */

export interface OrientationCallbacks {
  onPause: () => void;
  onResume: () => void;
}

function isLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(orientation: landscape)').matches;
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
    this.check();
  }

  private check(): void {
    if (!this.overlay) return;
    if (isLandscape()) {
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
      this.boundCheck = null;
    }
    this.overlay?.remove();
    this.overlay = null;
    this.callbacks = null;
    this.mediaQuery = null;
    this.paused = false;
  }
}
