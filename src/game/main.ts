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
import { Haptics } from './components/Haptics';
import * as SessionStorage from './components/SessionStorage';
import { normalize, resolveToCanonical } from './components/NormalizeGuess';
import { DEBUG_PANEL_ENABLED } from './constants';

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

  audio = new AudioController();
  audio.setOnBlocked(() => {
    if (audioOverlay) audioOverlay.classList.remove('hidden');
  });
  (root.querySelector('[data-audio-unlock]') as HTMLElement)?.addEventListener('click', async () => {
    await audio?.unlock();
    if (audioOverlay) audioOverlay.classList.add('hidden');
  });

  const savedState = SessionStorage.load();
  if (savedState && savedState.currentCardIndex < savedState.deckLength) {
    showScreen('resume');
  } else {
    SessionStorage.clear();
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
    voice = new VoiceController();
    engine = new GameEngine({
      onPhaseChange: (phase) => {
        if (phase === 'results') showScreen('results');
      },
      onCardChange: (c: CardData, _index: number, _total: number) => {
        if (!card || !playingEl) return;
        card.setContent(c);
        setDebugDesc(`${c.kind} ${c.color ?? ''} ${c.shape2d ?? ''} ${c.shape3d ?? ''}`);
        if (voice?.isSupported() && !orientationPaused) {
          voice.startListening(onVoiceResult);
        }
        debugPanel?.update();
      },
      onResults: (results) => {
        audio?.playRoundComplete();
        Haptics.roundEnd();
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
          if (cur) voice.startListening(onVoiceResult);
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
        hapticsSupported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
        audioUnlocked: audio?.isUnlocked() ?? false,
        fps: fpsMonitor?.getAverageFPS() ?? 0,
        sessionState: JSON.stringify(SessionStorage.load()),
      }));
    }
  }

  function onVoiceResult(transcript: string): void {
    if (orientationPaused || !engine) return;
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
    const selected = root.querySelector('input[name="difficulty"]:checked') as HTMLInputElement;
    const difficulty = (selected ? Number(selected.value) : 1) as DifficultyLevel;
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 6) return;
    startNewGame(difficulty);
  });

  function startNewGame(difficulty: DifficultyLevel): void {
    voice = new VoiceController();
    engine = new GameEngine({
      onPhaseChange: (phase) => {
        if (phase === 'results') showScreen('results');
      },
      onCardChange: (c: CardData, _index: number, _total: number) => {
        if (!card || !playingEl) return;
        card.setContent(c);
        setDebugDesc(`${c.kind} ${c.color ?? ''} ${c.shape2d ?? ''} ${c.shape3d ?? ''}`);
        if (voice?.isSupported() && !orientationPaused) {
          voice.startListening(onVoiceResult);
        }
        debugPanel?.update();
      },
      onResults: (results) => {
        audio?.playRoundComplete();
        Haptics.roundEnd();
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
          if (cur) voice.startListening(onVoiceResult);
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
        hapticsSupported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
        audioUnlocked: audio?.isUnlocked() ?? false,
        fps: fpsMonitor?.getAverageFPS() ?? 0,
        sessionState: JSON.stringify(SessionStorage.load()),
      }));
    }
  }

  (root.querySelector('[data-play-again-btn]') as HTMLButtonElement)?.addEventListener('click', () => {
    showScreen('menu');
    card?.dispose();
    orientation?.dispose();
    fpsMonitor?.stop();
    debugPanel?.dispose();
    engine = null;
    card = null;
    voice = null;
    orientation = null;
    fpsMonitor = null;
    debugPanel = null;
  });
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
