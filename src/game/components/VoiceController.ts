/**
 * Web Speech API wrapper: start/stop recognition, 6s timeout per card, callback with raw transcript or "no response".
 */

import { VOICE_TIMEOUT_MS } from '../constants';


export type VoiceResultCallback = (transcript: string) => void;

export class VoiceController {
  private recognition: SpeechRecognition | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private onResult: VoiceResultCallback | null = null;
  private _listening = false;

  constructor() {
    const Ctor = (typeof window !== 'undefined' && (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition) ||
      (typeof window !== 'undefined' && (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
    if (Ctor) {
      const rec = new (Ctor as new () => SpeechRecognition)();
      this.recognition = rec;
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (e: SpeechRecognitionEvent) => {
        this.clearTimeout();
        const result = e.results[e.results.length - 1];
        const transcript = result.isFinal ? result[0].transcript : '';
        if (transcript && this.onResult) {
          this.onResult(transcript.trim());
        }
      };
      rec.onerror = () => {
        this.clearTimeout();
      };
      rec.onend = () => {
        this._listening = false;
      };
    }
  }

  isSupported(): boolean {
    return this.recognition != null;
  }

  get listening(): boolean {
    return this._listening;
  }

  private clearTimeout(): void {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Start listening for one card. On result or 6s timeout, invokes callback and stops.
   */
  startListening(callback: VoiceResultCallback): void {
    this.onResult = callback;
    this.clearTimeout();
    if (!this.recognition) {
      callback('no response');
      return;
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.stop();
      if (this.onResult) {
        this.onResult('no response');
      }
    }, VOICE_TIMEOUT_MS);
    try {
      this.recognition.start();
      this._listening = true;
    } catch {
      this.clearTimeout();
      callback('no response');
    }
  }

  stop(): void {
    this.clearTimeout();
    if (this.recognition && this._listening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this._listening = false;
    }
  }

  setCallback(cb: VoiceResultCallback | null): void {
    this.onResult = cb;
  }
}
