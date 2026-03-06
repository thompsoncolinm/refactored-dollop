/**
 * Tracks FPS over a sliding window (e.g. 3 seconds). getAverageFPS(), start(), stop(). Used for low-end device fallback.
 */

const WINDOW_MS = 3000;

export class FPSMonitor {
  private frameTimes: number[] = [];
  private rafId: number | null = null;
  private lastTime = 0;

  start(): void {
    this.frameTimes = [];
    this.lastTime = performance.now();
    const tick = (): void => {
      this.rafId = requestAnimationFrame(tick);
      const now = performance.now();
      const delta = now - this.lastTime;
      this.lastTime = now;
      this.frameTimes.push(delta);
      let sum = this.frameTimes.reduce((a, b) => a + b, 0);
      while (this.frameTimes.length > 1 && sum > WINDOW_MS) {
        this.frameTimes.shift();
        sum = this.frameTimes.reduce((a, b) => a + b, 0);
      }
    };
    tick();
  }

  stop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.frameTimes = [];
  }

  getAverageFPS(): number {
    if (this.frameTimes.length < 2) return 60;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    const avgMs = sum / this.frameTimes.length;
    return 1000 / avgMs;
  }

  isLowFPS(threshold = 30): boolean {
    return this.getAverageFPS() < threshold;
  }
}
