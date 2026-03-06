/**
 * Web Speech API wrapper: listens for speech and auto-advances when a colour/word is recognized.
 * Also reports transcript updates for UI. Advance: on recognized speech (final or after short delay), or on 6s timeout ("no response").
 * Set DEBUG_VOICE in constants for console logs.
 */

import { VOICE_TIMEOUT_MS, DEBUG_VOICE } from '../constants';

/** Delay (ms) after last transcript before committing when isFinal is not received (e.g. some browsers). */
const COMMIT_DELAY_MS = 450;

function log(...args: unknown[]): void {
  if (DEBUG_VOICE) {
    console.log('[Voice]', ...args);
  }
}

export type VoiceResultCallback = (transcript: string) => void;
export type TranscriptUpdateCallback = (transcript: string) => void;
export type VoiceErrorCallback = (error: string, message?: string) => void;

export class VoiceController {
  private recognition: SpeechRecognition | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private commitTimerId: ReturnType<typeof setTimeout> | null = null;
  private onResult: VoiceResultCallback | null = null;
  private onTranscriptUpdate: TranscriptUpdateCallback | null = null;
  private onError: VoiceErrorCallback | null = null;
  private _listening = false;
  private resultAlreadySent = false;
  private lastTranscript = '';
  private _rawResultDumped = false;
  /** Last speech error (e.g. "network") for debug panel and UI. */
  private _lastError: { error: string; message?: string } | null = null;

  constructor() {
    const Ctor = (typeof window !== 'undefined' && (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition) ||
      (typeof window !== 'undefined' && (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
    if (Ctor) {
      log('SpeechRecognition supported, creating instance');
      const rec = new (Ctor as new () => SpeechRecognition)();
      this.recognition = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 3;
      rec.onresult = (e: SpeechRecognitionEvent) => {
        const results = e.results;
        log('onresult fired', 'results.length=', results?.length);
        if (!this._rawResultDumped && results?.length) {
          this._rawResultDumped = true;
          try {
            const first = results[0];
            const firstAlt = first?.length ? first[0] : null;
            log('RAW result structure (once):', {
              resultLength: first?.length,
              firstAltKeys: firstAlt ? Object.keys(firstAlt as object) : [],
              firstAlt: firstAlt,
            });
          } catch (err) {
            log('RAW dump error', err);
          }
        }
        if (!results || results.length === 0) {
          log('onresult: no results, returning');
          return;
        }
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          log(`  result[${i}] length=`, result.length, 'isFinal=', result.isFinal);
          let transcript = '';
          if (result.length > 0) {
            for (let a = 0; a < result.length; a++) {
              const alt = result[a];
              let t = '';
              if (alt) {
                const o = alt as unknown as { transcript?: string };
                if (typeof o.transcript === 'string') t = o.transcript.trim();
              }
              log(`    alternative[${a}] transcript=`, JSON.stringify(t));
              if (t) transcript = t;
            }
          }
          if (transcript) {
            this.lastTranscript = transcript;
            log('updating UI with transcript=', transcript, 'isFinal=', result.isFinal);
            this.onTranscriptUpdate?.(transcript);
            if (this.resultAlreadySent) continue;
            if (result.isFinal) {
              this.commitTranscript(transcript);
              break;
            }
            this.scheduleCommit();
          }
        }
      };
      rec.onerror = (e: Event) => {
        const err = e as { error?: string; message?: string };
        const code = err.error ?? 'unknown';
        const msg = err.message ?? '';
        log('onerror', 'error=', code, 'message=', msg);
        this._lastError = { error: code, message: msg || undefined };
        this.clearTimeout();
        this.onError?.(code, msg || undefined);
      };
      rec.onend = () => {
        log('onend fired');
        this._listening = false;
      };
      if ('onaudiostart' in rec) {
        (rec as unknown as { onaudiostart?: () => void }).onaudiostart = () => log('onaudiostart');
      }
      if ('onspeechstart' in rec) {
        (rec as unknown as { onspeechstart?: () => void }).onspeechstart = () => log('onspeechstart');
      }
      if ('onsoundstart' in rec) {
        (rec as unknown as { onsoundstart?: () => void }).onsoundstart = () => log('onsoundstart');
      }
    } else {
      log('SpeechRecognition NOT supported (no SpeechRecognition or webkitSpeechRecognition on window)');
    }
  }

  getLastTranscript(): string {
    log('getLastTranscript() =>', this.lastTranscript || '(empty)');
    return this.lastTranscript;
  }

  getLastError(): { error: string; message?: string } | null {
    return this._lastError;
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

  private clearCommitTimer(): void {
    if (this.commitTimerId != null) {
      clearTimeout(this.commitTimerId);
      this.commitTimerId = null;
    }
  }

  private scheduleCommit(): void {
    this.clearCommitTimer();
    this.commitTimerId = setTimeout(() => {
      this.commitTimerId = null;
      if (this.resultAlreadySent) return;
      const t = this.lastTranscript.trim();
      if (t) this.commitTranscript(t);
    }, COMMIT_DELAY_MS);
  }

  private commitTranscript(transcript: string): void {
    if (this.resultAlreadySent) return;
    this.resultAlreadySent = true;
    this.clearTimeout();
    this.clearCommitTimer();
    this.stop();
    log('commitTranscript (auto-advance)', transcript);
    this.onResult?.(transcript);
  }

  /**
   * Start listening. Auto-advances when speech is recognized (final result or after COMMIT_DELAY_MS).
   * Also calls onResult on 6s timeout ("no response"). On speech API error, calls onError.
   * Button/typed input can still submit via getLastTranscript() or explicit advance in main.
   */
  startListening(
    onResult: VoiceResultCallback,
    onTranscriptUpdate?: TranscriptUpdateCallback,
    onError?: VoiceErrorCallback
  ): void {
    log('startListening()');
    this.onResult = onResult;
    this.onTranscriptUpdate = onTranscriptUpdate ?? null;
    this.onError = onError ?? null;
    this._lastError = null;
    this.resultAlreadySent = false;
    this.lastTranscript = '';
    this._rawResultDumped = false;
    this.clearTimeout();
    if (!this.recognition) {
      log('startListening: no recognition, calling onResult("no response")');
      onResult('no response');
      return;
    }
    this.timeoutId = setTimeout(() => {
      log('timeout (6s) - no response');
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
          log('recognition.start() called successfully');
        } catch (err) {
          log('recognition.start() threw', err);
          this.clearTimeout();
          this.resultAlreadySent = true;
          onResult('no response');
        }
      }, 50);
    } catch (err) {
      log('startListening outer catch', err);
      this.clearTimeout();
      this.resultAlreadySent = true;
      onResult('no response');
    }
  }

  stop(): void {
    log('stop()');
    this.clearTimeout();
    this.clearCommitTimer();
    if (this.recognition && this._listening) {
      try {
        this.recognition.stop();
      } catch (e) {
        log('recognition.stop() threw', e);
      }
      this._listening = false;
    }
  }

  setCallback(cb: VoiceResultCallback | null): void {
    this.onResult = cb;
  }
}
