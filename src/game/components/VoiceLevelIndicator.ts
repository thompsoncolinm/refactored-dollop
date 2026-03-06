/**
 * Discord-style voice input indicator: shows mic level via getUserMedia + AnalyserNode.
 * Call start() when listening, stop() when done. Renders a horizontal bar that fills with input level.
 */

export class VoiceLevelIndicator {
  private container: HTMLElement | null = null;
  private barEl: HTMLElement | null = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'flex items-center gap-2';
    wrap.setAttribute('aria-live', 'polite');
    const label = document.createElement('span');
    label.className = 'text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap';
    label.textContent = 'Mic';
    const track = document.createElement('div');
    track.className = 'flex-1 h-2 bg-gray-700 dark:bg-gray-600 rounded-full overflow-hidden min-w-[80px]';
    const bar = document.createElement('div');
    bar.className = 'h-full bg-green-500 dark:bg-green-400 rounded-full transition-all duration-75';
    bar.style.width = '0%';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', '0');
    track.appendChild(bar);
    wrap.appendChild(label);
    wrap.appendChild(track);
    container.appendChild(wrap);
    this.barEl = bar;
  }

  async start(): Promise<boolean> {
    this.stop();
    if (!this.barEl) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        this.stopStream();
        return false;
      }
      this.ctx = new Ctx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      const tick = (): void => {
        this.rafId = requestAnimationFrame(tick);
        if (!this.analyser || !this.dataArray || !this.barEl) return;
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
        const average = sum / this.dataArray.length;
        const level = Math.min(100, Math.round((average / 255) * 150));
        this.barEl.style.width = `${level}%`;
        this.barEl.setAttribute('aria-valuenow', String(level));
      };
      tick();
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  stop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.stopStream();
    if (this.barEl) {
      this.barEl.style.width = '0%';
      this.barEl.setAttribute('aria-valuenow', '0');
    }
    this.dataArray = null;
    this.analyser = null;
    this.source = null;
    this.ctx = null;
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  dispose(): void {
    this.stop();
    this.barEl = null;
    this.container?.replaceChildren();
    this.container = null;
  }
}
