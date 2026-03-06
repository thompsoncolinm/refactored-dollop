/**
 * GameEngine.ts
 * Orchestrates the full game flow:
 *   difficulty selection → deck generation → per-card loop → results screen.
 *
 * Depends on: Card, Shape2D, Shape3D, VoiceController, AudioController, Haptics.
 */

import { Card } from './Card';
import {
  renderShape2D,
  SHAPE_2D_TYPES,
  type Shape2DType,
} from './Shape2D';
import {
  renderShape3D,
  SHAPE_3D_TYPES,
  type Shape3DType,
  type Shape3DHandle,
} from './Shape3D';
import { VoiceController } from './VoiceController';
import { AudioController } from './AudioController';
import { hapticRoundEnd } from './Haptics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6;

export interface CardData {
  /** What type of content is on this card. */
  type: 'colour' | 'shape2d' | 'shape3d' | 'mixed';
  /** Human-readable correct answer label. */
  label: string;
  /** Hex colour to display / fill the shape with. */
  color: string;
  /** 2D shape, if applicable. */
  shape2d?: Shape2DType;
  /** 3D shape, if applicable. */
  shape3d?: Shape3DType;
}

export interface GuessRecord {
  card: CardData;
  guess: string;
  /**
   * True when the guess transcript contains every word in the correct label
   * (case-insensitive substring match – e.g. "red sphere" passes for label "red sphere").
   */
  isCorrect: boolean;
}

export interface GameConfig {
  /** Number of cards in the deck (default: 5). */
  deckSize?: number;
  /** Container element for the active card. */
  cardContainer: HTMLElement;
  /** Container element for the results section. */
  resultsContainer: HTMLElement;
  /** Element used to display status / prompt text. */
  statusEl: HTMLElement;
  /** Called when the game state changes (for UI updates). */
  onStateChange?: (state: GameState) => void;
}

export type GameState = 'idle' | 'playing' | 'listening' | 'results';

// ---------------------------------------------------------------------------
// Tailwind-compatible colour palette used for random colours
// ---------------------------------------------------------------------------

const COLORS: { name: string; hex: string }[] = [
  { name: 'red', hex: '#ef4444' },
  { name: 'orange', hex: '#f97316' },
  { name: 'yellow', hex: '#eab308' },
  { name: 'green', hex: '#22c55e' },
  { name: 'teal', hex: '#14b8a6' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'indigo', hex: '#6366f1' },
  { name: 'purple', hex: '#a855f7' },
  { name: 'pink', hex: '#ec4899' },
  { name: 'rose', hex: '#f43f5e' },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomColor(): { name: string; hex: string } {
  return randomItem(COLORS);
}

// ---------------------------------------------------------------------------
// Deck generation
// ---------------------------------------------------------------------------

function buildDeck(difficulty: Difficulty, size: number): CardData[] {
  const deck: CardData[] = [];

  for (let i = 0; i < size; i++) {
    const color = randomColor();

    switch (difficulty) {
      case 1: {
        // Solid colours only
        deck.push({ type: 'colour', label: color.name, color: color.hex });
        break;
      }
      case 2: {
        // Random 2D shapes (monochrome)
        const shape2d = randomItem(SHAPE_2D_TYPES);
        deck.push({
          type: 'shape2d',
          label: shape2d,
          color: '#6366f1',
          shape2d,
        });
        break;
      }
      case 3: {
        // Random 3D shapes (monochrome)
        const shape3d = randomItem(SHAPE_3D_TYPES);
        deck.push({
          type: 'shape3d',
          label: shape3d,
          color: '#6366f1',
          shape3d,
        });
        break;
      }
      case 4: {
        // Mix of 2D and 3D shapes (monochrome)
        if (Math.random() < 0.5) {
          const shape2d = randomItem(SHAPE_2D_TYPES);
          deck.push({ type: 'shape2d', label: shape2d, color: '#6366f1', shape2d });
        } else {
          const shape3d = randomItem(SHAPE_3D_TYPES);
          deck.push({ type: 'shape3d', label: shape3d, color: '#6366f1', shape3d });
        }
        break;
      }
      case 5: {
        // Random-coloured 2D shapes
        const shape2d = randomItem(SHAPE_2D_TYPES);
        deck.push({
          type: 'shape2d',
          label: `${color.name} ${shape2d}`,
          color: color.hex,
          shape2d,
        });
        break;
      }
      case 6: {
        // Random-coloured 3D shapes
        const shape3d = randomItem(SHAPE_3D_TYPES);
        deck.push({
          type: 'shape3d',
          label: `${color.name} ${shape3d}`,
          color: color.hex,
          shape3d,
        });
        break;
      }
    }
  }

  return deck;
}

// ---------------------------------------------------------------------------
// GameEngine class
// ---------------------------------------------------------------------------

export class GameEngine {
  private config: GameConfig;
  private deck: CardData[] = [];
  private currentIndex = 0;
  private guesses: GuessRecord[] = [];
  private card: Card;
  private voice: VoiceController;
  private audio: AudioController;
  private state: GameState = 'idle';
  /** Handle for the active Three.js renderer (needs disposal on card change). */
  private shape3dHandle: Shape3DHandle | null = null;

  constructor(config: GameConfig) {
    this.config = config;
    this.card = new Card(config.cardContainer);
    this.voice = new VoiceController();
    this.audio = new AudioController();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Start a new game session with the given difficulty. */
  start(difficulty: Difficulty): void {
    this.deck = buildDeck(difficulty, this.config.deckSize ?? 5);
    this.currentIndex = 0;
    this.guesses = [];
    this.setState('playing');
    this.showCard(0);
  }

  /** Manually submit a guess (used when voice is unavailable). */
  submitGuess(text: string): void {
    if (this.state !== 'listening') return;
    this.recordGuess(text);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private setState(next: GameState): void {
    this.state = next;
    this.config.onStateChange?.(next);
  }

  private showCard(index: number): void {
    const cardData = this.deck[index];
    if (!cardData) return;

    this.renderCard(cardData);
    this.card.show();
    this.setState('listening');
    this.setStatus(`Card ${index + 1} of ${this.deck.length} – speak your guess!`);

    if (this.voice.isSupported) {
      this.voice.startListening(
        (transcript) => this.recordGuess(transcript),
        (err) => {
          // On voice error, show a text input fallback
          this.setStatus(`Voice error (${err}). Type your guess below.`);
        },
      );
    } else {
      this.setStatus(`Card ${index + 1} of ${this.deck.length} – type your guess below.`);
    }
  }

  /** Dispose any active Three.js scene, then render the new card content. */
  private renderCard(cardData: CardData): void {
    this.shape3dHandle?.dispose();
    this.shape3dHandle = null;

    // Clear the card container and reset its inline background
    const container = this.config.cardContainer;
    container.innerHTML = '';
    container.style.backgroundColor = '';

    if (cardData.type === 'colour') {
      // Full-bleed colour swatch
      container.style.backgroundColor = cardData.color;
    } else if (cardData.shape2d) {
      renderShape2D(container, cardData.shape2d, cardData.color);
    } else if (cardData.shape3d) {
      this.shape3dHandle = renderShape3D(container, cardData.shape3d, cardData.color);
    }
  }

  private recordGuess(transcript: string): void {
    this.voice.stopListening();
    const cardData = this.deck[this.currentIndex];
    const isCorrect = this.checkGuess(transcript, cardData);

    this.guesses.push({ card: cardData, guess: transcript, isCorrect });

    // Play appropriate feedback sound
    if (isCorrect) {
      this.audio.playCorrect();
    } else {
      this.audio.playIncorrect();
    }

    this.setState('playing');
    this.advance();
  }

  /**
   * Check whether a transcript contains the correct answer keywords.
   * Comparison is case-insensitive substring matching.
   */
  private checkGuess(transcript: string, cardData: CardData): boolean {
    const lower = transcript.toLowerCase();
    // Split label into words and require ALL words to appear in the transcript
    return cardData.label.toLowerCase().split(' ').every((word) => lower.includes(word));
  }

  private advance(): void {
    this.currentIndex++;

    if (this.currentIndex >= this.deck.length) {
      // Deck exhausted – animate the last card away, then play the round-complete cue.
      this.card.exit(() => {
        this.audio.playRoundComplete();
        hapticRoundEnd();
        this.showResults();
      });
      return;
    }

    // Flip to the next card
    this.audio.playNextCard();
    this.card.flip(
      () => this.renderCard(this.deck[this.currentIndex]),
      () => {
        this.setState('listening');
        const idx = this.currentIndex;
        this.setStatus(`Card ${idx + 1} of ${this.deck.length} – speak your guess!`);

        if (this.voice.isSupported) {
          this.voice.startListening(
            (transcript) => this.recordGuess(transcript),
            (err) => this.setStatus(`Voice error (${err}). Type your guess below.`),
          );
        }
      },
    );
  }

  private setStatus(text: string): void {
    this.config.statusEl.textContent = text;
  }

  private showResults(): void {
    this.setState('results');
    this.shape3dHandle?.dispose();
    this.shape3dHandle = null;

    const container = this.config.resultsContainer;
    container.innerHTML = '';

    const correct = this.guesses.filter((g) => g.isCorrect).length;
    const total = this.guesses.length;

    // Score heading
    const heading = document.createElement('h2');
    heading.className =
      'text-2xl font-bold mb-4 dark:text-white';
    heading.textContent = `Score: ${correct} / ${total}`;
    container.appendChild(heading);

    // Per-guess table
    const table = document.createElement('table');
    table.className = 'w-full text-left border-collapse text-sm';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr class="bg-gray-100 dark:bg-gray-700">
        <th class="p-2 border dark:border-gray-600">#</th>
        <th class="p-2 border dark:border-gray-600">Correct Answer</th>
        <th class="p-2 border dark:border-gray-600">Your Guess</th>
        <th class="p-2 border dark:border-gray-600">Result</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    this.guesses.forEach((g, i) => {
      const tr = document.createElement('tr');
      tr.className = i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900';
      tr.innerHTML = `
        <td class="p-2 border dark:border-gray-600">${i + 1}</td>
        <td class="p-2 border dark:border-gray-600 font-medium">${g.card.label}</td>
        <td class="p-2 border dark:border-gray-600 italic">${g.guess || '(no answer)'}</td>
        <td class="p-2 border dark:border-gray-600">
          ${g.isCorrect
            ? '<span class="text-green-600 font-bold">✓ Correct</span>'
            : '<span class="text-red-500 font-bold">✗ Wrong</span>'}
        </td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }
}
