/**
 * AudioController.ts
 * Manages playback of game sound effects using HTMLAudioElement.
 * All paths are relative to the /public directory.
 */

export class AudioController {
  private sounds: Record<string, HTMLAudioElement> = {};

  constructor() {
    // Pre-load all placeholder sound files
    this.sounds = {
      nextCard: this.load('/sounds/next-card.wav'),
      roundComplete: this.load('/sounds/round-complete.wav'),
      correct: this.load('/sounds/correct.wav'),
      incorrect: this.load('/sounds/incorrect.wav'),
    };
  }

  /** Create and cache an audio element for a given source path. */
  private load(src: string): HTMLAudioElement {
    const audio = new Audio(src);
    audio.preload = 'auto';
    return audio;
  }

  /** Play a sound by key; rewind to start if already playing. */
  private play(key: string): void {
    const audio = this.sounds[key];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay may be blocked before first user interaction – fail silently.
    });
  }

  /** Play the "next card" cue. */
  playNextCard(): void {
    this.play('nextCard');
  }

  /** Play the "round complete" fanfare. */
  playRoundComplete(): void {
    this.play('roundComplete');
  }

  /** Play the "correct guess" sound. */
  playCorrect(): void {
    this.play('correct');
  }

  /** Play the "incorrect guess" sound. */
  playIncorrect(): void {
    this.play('incorrect');
  }
}
