/**
 * Audio: unlock on user gesture (Start), preload placeholder sounds, play methods. Fallback overlay if audio blocked.
 */

const SOUNDS = {
  nextCard: '/sounds/next-card.mp3',
  roundComplete: '/sounds/round-complete.mp3',
  correct: '/sounds/correct.mp3',
  incorrect: '/sounds/incorrect.mp3',
} as const;

type SoundKey = keyof typeof SOUNDS;

/** Fallback: short beep via Web Audio when file fails to load. */
function playFallbackBeep(ctx: AudioContext, frequency = 440, duration = 0.1): void {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore
  }
}

export class AudioController {
  private ctx: AudioContext | null = null;
  private cache: Map<SoundKey, HTMLAudioElement> = new Map();
  private unlocked = false;
  private onBlocked: (() => void) | null = null;

  /**
   * Call on first user gesture (e.g. Start click). Creates/resumes AudioContext and preloads sounds.
   */
  async unlock(): Promise<boolean> {
    if (this.unlocked) return true;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      await this.preloadAll();
      this.unlocked = true;
      return true;
    } catch {
      if (this.onBlocked) this.onBlocked();
      return false;
    }
  }

  setOnBlocked(cb: () => void): void {
    this.onBlocked = cb;
  }

  private async preloadAll(): Promise<void> {
    const keys = Object.keys(SOUNDS) as SoundKey[];
    for (const key of keys) {
      const url = SOUNDS[key];
      const audio = new Audio(url);
      audio.preload = 'auto';
      try {
        await new Promise<void>((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => resolve(), { once: true });
        audio.addEventListener('error', () => reject(new Error('Audio load failed')), { once: true });
        audio.load();
      });
        this.cache.set(key, audio);
      } catch {
        // File missing; we'll use fallback in play*
      }
    }
  }

  private async play(key: SoundKey, fallbackFreq = 440): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    const audio = this.cache.get(key);
    if (audio) {
      try {
        audio.currentTime = 0;
        await audio.play();
        return;
      } catch {
        // Fall through to fallback
      }
    }
    if (this.ctx) {
      playFallbackBeep(this.ctx, fallbackFreq);
    }
  }

  playNextCard(): Promise<void> {
    return this.play('nextCard', 523);
  }

  playRoundComplete(): Promise<void> {
    return this.play('roundComplete', 784);
  }

  playCorrect(): Promise<void> {
    return this.play('correct', 659);
  }

  playIncorrect(): Promise<void> {
    return this.play('incorrect', 330);
  }

  /**
   * Play a short test sound (e.g. for debug "Sound check"). Unlocks audio if needed.
   */
  async playTestSound(): Promise<void> {
    if (!this.unlocked) {
      const ok = await this.unlock();
      if (!ok) return;
    }
    await this.play('nextCard', 523);
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }
}
