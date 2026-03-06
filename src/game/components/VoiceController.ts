/**
 * Web Speech API wrapper: listens for speech and reports transcript updates (for UI).
 * Advance happens only when caller submits (e.g. button click); or on 6s timeout ("no response").
 */

import { VOICE_TIMEOUT_MS } from '../constants';

export type VoiceResultCallback = (transcript: string) => void;
export type TranscriptUpdateCallback = (transcript: string) => void;

export class VoiceController {
  private recognition: SpeechRecognition | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private onResult: VoiceResultCallback | null = null;
  private onTranscriptUpdate: TranscriptUpdateCallback | null = null;
  private _listening = false;
  private resultAlreadySent = false;
  private lastTranscript = '';

  constructor() {
    const Ctor = (typeof window !== 'undefined' && (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition) ||
      (typeof window !== 'undefined' && (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
    if (Ctor) {
      const rec = new (Ctor as new () => SpeechRecognition)();
      this.recognition = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 3;
      rec.onresult = (e: SpeechRecognitionEvent) => {
        const results = e.results;
        if (!results || results.length === 0) return;
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          let transcript = '';
          if (result.length > 0) {
            for (let a = 0; a < result.length; a++) {
              const alt = result[a];
              if (alt && typeof (alt as { transcript?: string }).transcript === 'string') {
                const t = (alt as { transcript: string }).transcript.trim();
                if (t) {
                  transcript = t;
                  break;
                }
              }
            }
          }
          if (transcript) {
            this.lastTranscript = transcript;
            this.onTranscriptUpdate?.(transcript);
          }
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

  getLastTranscript(): string {
    return this.lastTranscript;
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
   * Start listening. Reports transcript updates via onTranscriptUpdate; only calls onResult on 6s timeout ("no response").
   * Caller submits guess (e.g. button click) by reading getLastTranscript() and advancing themselves.
   */
  startListening(
    onResult: VoiceResultCallback,
    onTranscriptUpdate?: TranscriptUpdateCallback
  ): void {
    this.onResult = onResult;
    this.onTranscriptUpdate = onTranscriptUpdate ?? null;
    this.resultAlreadySent = false;
    this.lastTranscript = '';
    this.clearTimeout();
    if (!this.recognition) {
      onResult('no response');
      return;
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.resultAlreadySent = true;
      this.stop();
      if (this.onResult) {
        this.onResult('no response');
      }
    }, VOICE_TIMEOUT_MS);
    try {
      setTimeout(() => {
        if (this.resultAlreadySent) return;
        try {
          this.recognition?.start();
          this._listening = true;
        } catch {
          this.clearTimeout();
          this.resultAlreadySent = true;
          onResult('no response');
        }
      }, 50);
    } catch {
      this.clearTimeout();
      this.resultAlreadySent = true;
      onResult('no response');
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
