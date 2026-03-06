/**
 * Thin persistence layer for game state using sessionStorage.
 */

import type { GameSessionState } from '../types';
import { SESSION_STORAGE_KEY } from '../constants';

export function save(state: GameSessionState): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or security errors
  }
}

export function load(): GameSessionState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameSessionState;
    if (
      typeof state.difficulty !== 'number' ||
      typeof state.currentCardIndex !== 'number' ||
      !Array.isArray(state.guesses) ||
      typeof state.deckSeed !== 'number' ||
      typeof state.deckLength !== 'number'
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clear(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
