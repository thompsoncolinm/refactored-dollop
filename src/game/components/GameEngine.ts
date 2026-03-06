/**
 * Game state: difficulty, deck, current index, guesses. saveState/loadState/clearState; onGuess advances card and triggers audio/haptics. Clears state when round completes.
 */

import type { CardData, DifficultyLevel, GameSessionState, StoredGuess } from '../types';
import { generateDeck } from '../mockData';
import { normalize, resolveToCanonical } from './NormalizeGuess';
import * as SessionStorage from './SessionStorage';
import { SHAPE_NAME_MAP } from '../types';

export type GamePhase = 'menu' | 'playing' | 'results';

export interface GameEngineCallbacks {
  onPhaseChange: (phase: GamePhase) => void;
  onCardChange: (card: CardData, index: number, total: number) => void;
  onResults: (results: { card: CardData; guess: StoredGuess; actualLabel: string }[]) => void;
}

function getCardLabel(card: CardData): string {
  if (card.kind === 'color') {
    const entry = SHAPE_NAME_MAP.find((e) => e.internalId === (card.color ?? ''));
    return entry?.displayName ?? (card.color ?? '');
  }
  if (card.kind === 'shape2d' && card.shape2d) {
    const entry = SHAPE_NAME_MAP.find((e) => e.internalId === card.shape2d);
    return entry?.displayName ?? card.shape2d;
  }
  if (card.kind === 'shape3d' && card.shape3d) {
    const entry = SHAPE_NAME_MAP.find((e) => e.internalId === card.shape3d);
    return (entry?.displayName ?? card.shape3d) + (card.color ? ` (${card.color})` : '');
  }
  return 'Unknown';
}

export class GameEngine {
  private difficulty: DifficultyLevel = 1;
  private deck: CardData[] = [];
  private deckSeed = 0;
  private currentIndex = 0;
  private guesses: StoredGuess[] = [];
  private callbacks: GameEngineCallbacks;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  loadState(): GameSessionState | null {
    return SessionStorage.load();
  }

  saveState(): void {
    SessionStorage.save({
      difficulty: this.difficulty,
      currentCardIndex: this.currentIndex,
      guesses: this.guesses,
      deckSeed: this.deckSeed,
      deckLength: this.deck.length,
    });
  }

  clearState(): void {
    SessionStorage.clear();
  }

  startNewGame(difficulty: DifficultyLevel): void {
    this.difficulty = difficulty;
    this.deckSeed = Date.now();
    this.deck = generateDeck(difficulty, this.deckSeed);
    this.currentIndex = 0;
    this.guesses = [];
    this.callbacks.onPhaseChange('playing');
    if (this.deck.length > 0) {
      this.callbacks.onCardChange(this.deck[0], 0, this.deck.length);
    }
  }

  resumeGame(state: GameSessionState): void {
    this.difficulty = state.difficulty;
    this.deckSeed = state.deckSeed;
    this.deck = generateDeck(state.difficulty, state.deckSeed);
    this.currentIndex = state.currentCardIndex;
    this.guesses = state.guesses;
    this.callbacks.onPhaseChange('playing');
    if (this.currentIndex < this.deck.length) {
      this.callbacks.onCardChange(this.deck[this.currentIndex], this.currentIndex, this.deck.length);
    } else {
      this.finishRound();
    }
  }

  onGuess(rawTranscript: string): void {
    const normalized = normalize(rawTranscript);
    const resolved = rawTranscript === 'no response' ? 'No response' : (resolveToCanonical(normalized) ?? (normalized || 'No response'));
    this.guesses.push({ raw: rawTranscript, resolved });
    this.saveState();
  }

  advanceToNextCard(): void {
    this.currentIndex += 1;
    this.saveState();
    if (this.currentIndex >= this.deck.length) {
      this.finishRound();
    } else {
      this.callbacks.onCardChange(this.deck[this.currentIndex], this.currentIndex, this.deck.length);
    }
  }

  private finishRound(): void {
    const results = this.deck.map((card, i) => ({
      card,
      guess: this.guesses[i] ?? { raw: '', resolved: null },
      actualLabel: getCardLabel(card),
    }));
    this.clearState();
    this.callbacks.onResults(results);
    this.callbacks.onPhaseChange('results');
  }

  getCurrentCard(): CardData | null {
    if (this.currentIndex >= this.deck.length) return null;
    return this.deck[this.currentIndex];
  }

  getDeckLength(): number {
    return this.deck.length;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getGuesses(): StoredGuess[] {
    return [...this.guesses];
  }

  getDifficulty(): DifficultyLevel {
    return this.difficulty;
  }
}
