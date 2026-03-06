/**
 * VoiceController.ts
 * Wraps the Web Speech API (SpeechRecognition) for capturing voice guesses.
 * Falls back gracefully when the API is not supported.
 *
 * The Web Speech API is not yet part of the TypeScript DOM lib, so the
 * relevant interfaces are declared inline below.
 */

// ---------------------------------------------------------------------------
// Minimal Web Speech API type declarations
// ---------------------------------------------------------------------------

interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

// ---------------------------------------------------------------------------
// VoiceController class
// ---------------------------------------------------------------------------

/** Callback invoked with the recognised transcript after each utterance. */
export type VoiceResultCallback = (transcript: string) => void;

export class VoiceController {
  private recognition: ISpeechRecognition | null = null;
  private supported: boolean;

  constructor() {
    // The SpeechRecognition constructor exists in Chrome/Edge, sometimes under a vendor prefix.
    const anyWindow = window as unknown as Record<string, unknown>;
    const SR = (anyWindow['SpeechRecognition'] ?? anyWindow['webkitSpeechRecognition']) as
      | SpeechRecognitionConstructor
      | undefined;

    this.supported = Boolean(SR);

    if (SR) {
      this.recognition = new SR();
      this.recognition.lang = 'en-US';
      // Return one result per utterance, then stop automatically.
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
    }
  }

  /** Returns true if voice recognition is available in this browser. */
  get isSupported(): boolean {
    return this.supported;
  }

  /**
   * Start listening for a single utterance.
   * @param onResult  Called with the best-match transcript.
   * @param onError   Optional callback for error handling.
   */
  startListening(onResult: VoiceResultCallback, onError?: (err: string) => void): void {
    if (!this.recognition) {
      onError?.('SpeechRecognition not supported in this browser.');
      return;
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Normalise to lower-case here so callers always receive a consistent format.
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      onResult(transcript);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is common and non-critical – surface it only via callback.
      onError?.(event.error);
    };

    this.recognition.start();
  }

  /** Stop an in-progress recognition session. */
  stopListening(): void {
    try {
      this.recognition?.stop();
    } catch {
      // Already stopped – ignore.
    }
  }
}
