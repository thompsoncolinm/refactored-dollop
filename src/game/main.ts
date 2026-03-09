/**
 * Game bootstrap: resume prompt, difficulty UI, Start → unlock audio + GameEngine; wires VoiceController, Card, Orientation, FPS, Debug.
 */

import type { CardData, DifficultyLevel, GameSessionState } from './types';
import { GameEngine } from './components/GameEngine';
import { CardComponent } from './components/Card';
import { VoiceController } from './components/VoiceController';
import { AudioController } from './components/AudioController';
import { OrientationHandler } from './components/OrientationHandler';
import { FPSMonitor } from './components/FPSMonitor';
import { DebugPanel } from './components/DebugPanel';
import { VoiceLevelIndicator } from './components/VoiceLevelIndicator';
import { Haptics } from './components/Haptics';
import * as SessionStorage from './components/SessionStorage';
import { normalize, resolveToCanonical } from './components/NormalizeGuess';
import { DEBUG_PANEL_ENABLED, DEBUG_VOICE } from './constants';

function getRoot(): HTMLElement {
  const el = document.getElementById('game-root');
  if (!el) throw new Error('game-root not found');
  return el;
}

function createCardMarkup(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'w-full max-w-md mx-auto';
  wrap.style.perspective = '1000px';
  wrap.innerHTML = `
    <div class="relative w-full aspect-[3/4]" data-card-face style="transform-style: preserve-3d;">
      <div class="absolute inset-0 rounded-xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center backface-hidden" data-card-content></div>
    </div>
  `;
  return wrap;
}

export function init(): void {
  const root = getRoot();
  let engine: GameEngine | null = null;
  let card: CardComponent | null = null;
  let voice: VoiceController | null = null;
  let audio: AudioController | null = null;
  let orientation: OrientationHandler | null = null;
  let fpsMonitor: FPSMonitor | null = null;
  let debugPanel: DebugPanel | null = null;
  let voiceLevelIndicator: VoiceLevelIndicator | null = null;
  let menuVoice: VoiceController | null = null;
  let menuVoiceLevelIndicator: VoiceLevelIndicator | null = null;
  let lastTranscriptRaw = '';
  let lastTranscriptResolved: string | null = null;
  let orientationPaused = false;
  const menuEl = root.querySelector('[data-game-menu]') as HTMLElement;
  const resumeEl = root.querySelector('[data-game-resume]') as HTMLElement;
  const playingEl = root.querySelector('[data-game-playing]') as HTMLElement;
  const resultsEl = root.querySelector('[data-game-results]') as HTMLElement;
  const cardContainer = root.querySelector('[data-card-container]') as HTMLElement;
  const debugDescEl = root.querySelector('[data-debug-desc]') as HTMLElement;
  const audioOverlay = root.querySelector('[data-audio-overlay]') as HTMLElement;

  function showScreen(which: 'menu' | 'resume' | 'playing' | 'results'): void {
    menuEl?.classList.toggle('hidden', which !== 'menu');
    resumeEl?.classList.toggle('hidden', which !== 'resume');
    playingEl?.classList.toggle('hidden', which !== 'playing');
    resultsEl?.classList.toggle('hidden', which !== 'results');
  }

  function setDebugDesc(text: string): void {
    if (debugDescEl) debugDescEl.textContent = text;
  }

  function setAnnouncer(text: string): void {
    const el = document.getElementById('game-announcer');
    if (el) el.textContent = text;
  }

  function setISaidItButtonLabel(transcript: string): void {
    if (DEBUG_VOICE) console.log('[Voice] setISaidItButtonLabel(', JSON.stringify(transcript), ')');
    const btn = root.querySelector('[data-i-said-it-btn]') as HTMLButtonElement | null;
    if (btn) btn.textContent = transcript ? `I said ${transcript}` : 'I said it';
  }

  function showVoiceError(error: string, _message?: string): void {
    const el = root.querySelector('[data-voice-error]') as HTMLElement | null;
    if (!el) return;
    const friendly =
      error === 'network'
        ? 'Speech recognition can\'t connect. Someone with you can type the guess below.'
        : error === 'not-allowed'
          ? 'Microphone access was denied. Someone with you can type the guess below.'
          : error === 'no-speech'
            ? 'No speech detected. Say it again or have someone type the guess below.'
            : `Speech error: ${error}. Someone with you can type the guess below.`;
    el.textContent = friendly;
    el.classList.remove('hidden');
    const input = root.querySelector('[data-voice-typed-input]') as HTMLInputElement | null;
    input?.focus();
  }

  function clearVoiceError(): void {
    const el = root.querySelector('[data-voice-error]') as HTMLElement | null;
    if (el) {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function getMenuDifficulty(): number {
    const fromUrl = root.dataset.initialLevel ? Number(root.dataset.initialLevel) : 0;
    if (fromUrl >= 1 && fromUrl <= 6) return fromUrl;
    if (root.dataset.initialDifficulty !== undefined) return 1;
    return 0;
  }

  function isStartCommand(transcript: string): boolean {
    const t = transcript.trim().toLowerCase();
    return t === 'start' || t === 'play' || t === 'go' || t.indexOf('start') !== -1 || t.indexOf('play') !== -1;
  }

  function doStart(): void {
    const difficulty = getMenuDifficulty();
    if (difficulty < 1 || difficulty > 6 || difficulty !== Math.floor(difficulty)) return;
    stopMenuVoice();
    startNewGame(difficulty as DifficultyLevel);
  }

  function stopMenuVoice(): void {
    if (menuVoice) {
      menuVoice.stop();
      menuVoice = null;
    }
    if (menuVoiceLevelIndicator) {
      menuVoiceLevelIndicator.dispose();
      menuVoiceLevelIndicator = null;
    }
  }

  function startMenuVoiceListener(): void {
    if (getMenuDifficulty() < 1 || getMenuDifficulty() > 6) return;
    stopMenuVoice();
    const menuLevelEl = root.querySelector('[data-menu-voice-level]') as HTMLElement | null;
    if (menuLevelEl) {
      menuVoiceLevelIndicator = new VoiceLevelIndicator();
      menuVoiceLevelIndicator.mount(menuLevelEl);
      void menuVoiceLevelIndicator.start();
    }
    menuVoice = new VoiceController();
    if (menuVoice.isSupported()) {
      menuVoice.startListening(
        (transcript) => {
          if (isStartCommand(transcript)) doStart();
        },
        undefined,
        undefined,
        { timeoutMs: 60000 }
      );
    }
  }

  function enableVoiceAndStartListening(): void {
    if (getMenuDifficulty() >= 1) {
      startMenuVoiceListener();
    }
  }

  async function onFirstGesture(): Promise<void> {
    await audio?.unlock();
    if (audioOverlay) audioOverlay.classList.add('hidden');
    enableVoiceAndStartListening();
  }

  audio = new AudioController();
  audio.setOnBlocked(() => {
    if (audioOverlay) audioOverlay.classList.remove('hidden');
  });

  (root.querySelector('[data-audio-unlock]') as HTMLElement)?.addEventListener('click', (e) => {
    e.preventDefault();
    void onFirstGesture();
  });

  const onceOpts = { capture: true, once: true };
  root.addEventListener('click', () => void onFirstGesture(), onceOpts);
  root.addEventListener('keydown', () => void onFirstGesture(), onceOpts);

  if (audioOverlay) {
    audioOverlay.addEventListener('click', (e) => {
      e.preventDefault();
      void onFirstGesture();
    });
  }

  const initialDifficulty = root.dataset.initialDifficulty;
  const initialLevel = root.dataset.initialLevel;
  const isLevelLocked = initialDifficulty !== undefined && initialDifficulty !== '';

  if (initialLevel) {
    const radio = root.querySelector(`input[name="difficulty"][value="${initialLevel}"]`) as HTMLInputElement | null;
    if (radio) {
      radio.checked = true;
    }
  }

  const savedState = SessionStorage.load();
  const canResume = savedState && savedState.currentCardIndex < savedState.deckLength;
  const showResume = canResume && (!isLevelLocked || savedState.difficulty === 1);

  if (showResume) {
    showScreen('resume');
  } else {
    if (!canResume) SessionStorage.clear();
    showScreen('menu');
  }

  (root.querySelector('[data-resume-btn]') as HTMLButtonElement)?.addEventListener('click', async () => {
    const state = SessionStorage.load();
    if (!state) return;
    await audio?.unlock();
    if (audioOverlay) audioOverlay.classList.add('hidden');
    startGameFromResume(state);
  });

  (root.querySelector('[data-new-game-btn]') as HTMLButtonElement)?.addEventListener('click', () => {
    SessionStorage.clear();
    showScreen('menu');
  });

  function startGameFromResume(state: GameSessionState): void {
    stopMenuVoice();
    voice = new VoiceController();
    engine = new GameEngine({
      onPhaseChange: (phase) => {
        if (phase === 'results') showScreen('results');
      },
      onCardChange: (c: CardData, index: number, total: number) => {
        if (!card || !playingEl) return;
        card.setContent(c);
        setDebugDesc(`${c.kind} ${c.color ?? ''} ${c.shape2d ?? ''} ${c.shape3d ?? ''}`);
        setAnnouncer(`Card ${index + 1} of ${total}. Say your guess.`);
        setISaidItButtonLabel('');
        clearVoiceError();
        const typedEl = root.querySelector('[data-voice-typed-input]') as HTMLInputElement | null;
        if (typedEl) typedEl.value = '';
        if (voice?.isSupported() && !orientationPaused) {
          void voiceLevelIndicator?.start();
          voice.startListening(onVoiceResult, setISaidItButtonLabel, showVoiceError);
        }
        debugPanel?.update();
      },
      onResults: (results) => {
        audio?.playRoundComplete();
        Haptics.roundEnd();
        setAnnouncer('Round complete. Results ready.');
        const list = root.querySelector('[data-results-list]');
        if (list) {
          list.innerHTML = results
            .map(
              (r) =>
                `<li class="border-b border-gray-600 py-2">Actual: ${escapeHtml(r.actualLabel)} | Guessed: ${escapeHtml(r.guess.raw)}${r.guess.resolved ? ` (${escapeHtml(r.guess.resolved)})` : ''}</li>`
            )
            .join('');
        }
        showScreen('results');
        debugPanel?.update();
      },
    });
    if (!cardContainer.querySelector('[data-card-face]')) {
      const cardMarkup = createCardMarkup();
      cardContainer.innerHTML = '';
      cardContainer.appendChild(cardMarkup);
    }
    card = new CardComponent(cardContainer.querySelector('[data-card-face]')?.parentElement ?? cardContainer);
    const voiceLevelContainer = root.querySelector('[data-voice-level-container]') as HTMLElement;
    if (voiceLevelContainer) {
      voiceLevelIndicator = new VoiceLevelIndicator();
      voiceLevelIndicator.mount(voiceLevelContainer);
    }
    engine.resumeGame(state);
    showScreen('playing');
    orientation = new OrientationHandler();
    orientation.mount(root, {
      onPause: () => {
        orientationPaused = true;
        voice?.stop();
      },
      onResume: () => {
        orientationPaused = false;
        if (engine && voice?.isSupported()) {
          const cur = engine.getCurrentCard();
          if (cur) voice.startListening(onVoiceResult, setISaidItButtonLabel, showVoiceError);
        }
      },
    });
    fpsMonitor = new FPSMonitor();
    fpsMonitor.start();
    if (DEBUG_PANEL_ENABLED) {
      debugPanel = new DebugPanel();
      debugPanel.mount(root, () => ({
        currentCard: engine?.getCurrentCard() ?? null,
        lastTranscriptRaw,
        lastTranscriptResolved,
        lastSpeechError: voice?.getLastError() ?? null,
        hapticsSupported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
        audioUnlocked: audio?.isUnlocked() ?? false,
        fps: fpsMonitor?.getAverageFPS() ?? 0,
        sessionState: JSON.stringify(SessionStorage.load()),
      }), {
        onSoundCheck: () => audio?.playTestSound(),
        onSimulateGuess: () => {
          const c = engine?.getCurrentCard();
          const word = c?.kind === 'color' ? (c.color ?? 'red') : (c?.shape2d ?? c?.shape3d ?? 'red');
          onVoiceResult(word);
        },
      });
    }
  }

  function onVoiceResult(transcript: string): void {
    if (orientationPaused || !engine) return;
    voiceLevelIndicator?.stop();
    voice?.stop();
    const normalized = normalize(transcript);
    lastTranscriptRaw = transcript;
    lastTranscriptResolved = transcript === 'no response' ? 'No response' : resolveToCanonical(normalized);
    engine.onGuess(transcript);
    audio?.playNextCard();
    card?.flipToNext(() => {
      engine?.advanceToNextCard();
    });
    debugPanel?.update();
  }

  (root.querySelector('[data-start-btn]') as HTMLButtonElement)?.addEventListener('click', async () => {
    await audio?.unlock();
    if (audioOverlay) audioOverlay.classList.add('hidden');
    doStart();
  });

  function startNewGame(difficulty: DifficultyLevel): void {
    stopMenuVoice();
    voice = new VoiceController();
    engine = new GameEngine({
      onPhaseChange: (phase) => {
        if (phase === 'results') showScreen('results');
      },
      onCardChange: (c: CardData, index: number, total: number) => {
        if (!card || !playingEl) return;
        card.setContent(c);
        setDebugDesc(`${c.kind} ${c.color ?? ''} ${c.shape2d ?? ''} ${c.shape3d ?? ''}`);
        setAnnouncer(`Card ${index + 1} of ${total}. Say your guess.`);
        setISaidItButtonLabel('');
        clearVoiceError();
        const typedEl = root.querySelector('[data-voice-typed-input]') as HTMLInputElement | null;
        if (typedEl) typedEl.value = '';
        if (voice?.isSupported() && !orientationPaused) {
          void voiceLevelIndicator?.start();
          voice.startListening(onVoiceResult, setISaidItButtonLabel, showVoiceError);
        }
        debugPanel?.update();
      },
      onResults: (results) => {
        audio?.playRoundComplete();
        Haptics.roundEnd();
        setAnnouncer('Round complete. Results ready.');
        const list = root.querySelector('[data-results-list]');
        if (list) {
          list.innerHTML = results
            .map(
              (r) =>
                `<li class="border-b border-gray-600 py-2">Actual: ${escapeHtml(r.actualLabel)} | Guessed: ${escapeHtml(r.guess.raw)}${r.guess.resolved ? ` (${escapeHtml(r.guess.resolved)})` : ''}</li>`
            )
            .join('');
        }
        showScreen('results');
        debugPanel?.update();
      },
    });

    if (!cardContainer.querySelector('[data-card-face]')) {
      const cardMarkup = createCardMarkup();
      cardContainer.innerHTML = '';
      cardContainer.appendChild(cardMarkup);
    }
    card = new CardComponent(cardContainer.querySelector('[data-card-face]')?.parentElement ?? cardContainer);
    const voiceLevelContainer = root.querySelector('[data-voice-level-container]') as HTMLElement;
    if (voiceLevelContainer) {
      voiceLevelIndicator = new VoiceLevelIndicator();
      voiceLevelIndicator.mount(voiceLevelContainer);
    }
    engine.startNewGame(difficulty);
    showScreen('playing');

    orientation = new OrientationHandler();
    orientation.mount(root, {
      onPause: () => {
        orientationPaused = true;
        voice?.stop();
      },
      onResume: () => {
        orientationPaused = false;
        if (engine && voice?.isSupported()) {
          const cur = engine.getCurrentCard();
          if (cur) voice.startListening(onVoiceResult, setISaidItButtonLabel, showVoiceError);
        }
      },
    });
    fpsMonitor = new FPSMonitor();
    fpsMonitor.start();
    if (DEBUG_PANEL_ENABLED) {
      debugPanel = new DebugPanel();
      debugPanel.mount(root, () => ({
        currentCard: engine?.getCurrentCard() ?? null,
        lastTranscriptRaw,
        lastTranscriptResolved,
        lastSpeechError: voice?.getLastError() ?? null,
        hapticsSupported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
        audioUnlocked: audio?.isUnlocked() ?? false,
        fps: fpsMonitor?.getAverageFPS() ?? 0,
        sessionState: JSON.stringify(SessionStorage.load()),
      }), {
        onSoundCheck: () => audio?.playTestSound(),
        onSimulateGuess: () => {
          const c = engine?.getCurrentCard();
          const word = c?.kind === 'color' ? (c.color ?? 'red') : (c?.shape2d ?? c?.shape3d ?? 'red');
          onVoiceResult(word);
        },
      });
    }
  }

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-i-said-it-btn]')) {
      if (!engine) return;
      const guessed = voice?.getLastTranscript()?.trim() || 'I said it';
      onVoiceResult(guessed);
      return;
    }
    if (target.closest('[data-voice-typed-submit]')) {
      if (!engine) return;
      const input = root.querySelector('[data-voice-typed-input]') as HTMLInputElement | null;
      const typed = input?.value?.trim() || '';
      if (DEBUG_VOICE) console.log('[Voice] typed submit:', JSON.stringify(typed));
      onVoiceResult(typed || 'no response');
      if (input) input.value = '';
    }
  });
  const typedInput = root.querySelector('[data-voice-typed-input]') as HTMLInputElement | null;
  typedInput?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!engine) return;
    const typed = (e.target as HTMLInputElement)?.value?.trim() || '';
    if (DEBUG_VOICE) console.log('[Voice] typed submit (Enter):', JSON.stringify(typed));
    onVoiceResult(typed || 'no response');
    (e.target as HTMLInputElement).value = '';
  });

  (root.querySelector('[data-play-again-btn]') as HTMLButtonElement)?.addEventListener('click', () => {
    showScreen('menu');
    card?.dispose();
    voiceLevelIndicator?.dispose();
    orientation?.dispose();
    fpsMonitor?.stop();
    debugPanel?.dispose();
    stopMenuVoice();
    engine = null;
    card = null;
    voice = null;
    voiceLevelIndicator = null;
    orientation = null;
    fpsMonitor = null;
    debugPanel = null;
    if (audio?.isUnlocked() && getMenuDifficulty() >= 1) startMenuVoiceListener();
  });
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
