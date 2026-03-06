/**
 * main.ts
 * Entry point for the Blindfold Guessing Game.
 * Wires together the UI elements on game.astro with GameEngine and its dependencies.
 */

import { GameEngine, type Difficulty, type GameState } from './components/GameEngine';

// ---------------------------------------------------------------------------
// DOM element references
// ---------------------------------------------------------------------------

const difficultyScreen = document.getElementById('difficulty-screen')!;
const gameScreen = document.getElementById('game-screen')!;
const resultsScreen = document.getElementById('results-screen')!;

const startBtn = document.getElementById('start-btn')!;
const difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;
const deckSizeInput = document.getElementById('deck-size') as HTMLInputElement;

const cardContainer = document.getElementById('card-container')!;
const statusEl = document.getElementById('status-text')!;
const guessInput = document.getElementById('guess-input') as HTMLInputElement;
const guessBtn = document.getElementById('guess-btn')!;

const resultsContainer = document.getElementById('results-container')!;
const playAgainBtn = document.getElementById('play-again-btn')!;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

let engine: GameEngine | null = null;

/** Switch which full-page "screen" is visible. */
function showScreen(name: 'difficulty' | 'game' | 'results'): void {
  difficultyScreen.classList.toggle('hidden', name !== 'difficulty');
  gameScreen.classList.toggle('hidden', name !== 'game');
  resultsScreen.classList.toggle('hidden', name !== 'results');
}

/** Called whenever the GameEngine changes state. */
function handleStateChange(state: GameState): void {
  const isListening = state === 'listening';
  // Show/hide the manual-guess fallback input
  guessInput.disabled = !isListening;
  guessBtn.toggleAttribute('disabled', !isListening);

  if (state === 'results') {
    showScreen('results');
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

startBtn.addEventListener('click', () => {
  const difficulty = parseInt(difficultySelect.value, 10) as Difficulty;
  const deckSize = Math.max(1, Math.min(20, parseInt(deckSizeInput.value, 10) || 5));

  engine = new GameEngine({
    deckSize,
    cardContainer,
    resultsContainer,
    statusEl,
    onStateChange: handleStateChange,
  });

  showScreen('game');
  engine.start(difficulty);
});

guessBtn.addEventListener('click', () => {
  const text = guessInput.value.trim();
  if (text) {
    engine?.submitGuess(text);
    guessInput.value = '';
  }
});

guessInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') guessBtn.click();
});

playAgainBtn.addEventListener('click', () => {
  showScreen('difficulty');
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

showScreen('difficulty');
