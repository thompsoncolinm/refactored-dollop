/**
 * Mock decks and shape lists for testing. Uses a seed for reproducible decks.
 */

import type { CardData, DifficultyLevel } from './types';
import type { Shape2DType } from './types';
import type { Shape3DType } from './types';
import { COLOR_TO_HEX } from './types';

const SHAPES_2D: Shape2DType[] = ['circle', 'square', 'triangle', 'star', 'hexagon'];
const SHAPES_3D: Shape3DType[] = ['cube', 'sphere', 'cone', 'torus', 'pyramid'];
const COLOR_NAMES = Object.keys(COLOR_TO_HEX);

/** Simple seeded random: returns 0..1. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Get deck size for difficulty (e.g. 3 for 1–2, 4 for 3–4, 5 for 5–6).
 */
export function getDeckSize(difficulty: DifficultyLevel): number {
  if (difficulty <= 2) return 3;
  if (difficulty <= 4) return 4;
  return 5;
}

/**
 * Generate a deck of cards for the given difficulty and seed.
 */
export function generateDeck(difficulty: DifficultyLevel, seed: number): CardData[] {
  const rng = seededRandom(seed);
  const size = getDeckSize(difficulty);
  const deck: CardData[] = [];

  for (let i = 0; i < size; i++) {
    switch (difficulty) {
      case 1: {
        deck.push({ kind: 'color', color: pick(COLOR_NAMES, rng) });
        break;
      }
      case 2: {
        deck.push({
          kind: 'shape2d',
          shape2d: pick(SHAPES_2D, rng),
          color: 'gray',
        });
        break;
      }
      case 3: {
        deck.push({
          kind: 'shape3d',
          shape3d: pick(SHAPES_3D, rng),
          color: 'gray',
        });
        break;
      }
      case 4: {
        const use3d = rng() > 0.5;
        if (use3d) {
          deck.push({
            kind: 'shape3d',
            shape3d: pick(SHAPES_3D, rng),
            color: 'gray',
          });
        } else {
          deck.push({
            kind: 'shape2d',
            shape2d: pick(SHAPES_2D, rng),
            color: 'gray',
          });
        }
        break;
      }
      case 5: {
        deck.push({
          kind: 'shape2d',
          shape2d: pick(SHAPES_2D, rng),
          color: pick(COLOR_NAMES, rng),
        });
        break;
      }
      case 6: {
        deck.push({
          kind: 'shape3d',
          shape3d: pick(SHAPES_3D, rng),
          color: pick(COLOR_NAMES, rng),
        });
        break;
      }
    }
  }

  return deck;
}

/**
 * Get a fixed mock deck for testing (e.g. first card always "red circle").
 */
export function getMockDeck(difficulty: DifficultyLevel): CardData[] {
  return generateDeck(difficulty, 12345);
}
