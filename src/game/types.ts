/**
 * Game types: difficulty, card data, guess result, shape/color enums, and ShapeNameMap for voice synonyms.
 */

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Shape2DType = 'circle' | 'square' | 'triangle' | 'star' | 'hexagon';
export type Shape3DType = 'cube' | 'sphere' | 'cone' | 'torus' | 'pyramid';

export type CardContentKind = 'color' | 'shape2d' | 'shape3d';

export interface CardData {
  kind: CardContentKind;
  /** For kind 'color': hex or Tailwind color name. For shapes: fill color. */
  color?: string;
  shape2d?: Shape2DType;
  shape3d?: Shape3DType;
}

export interface StoredGuess {
  raw: string;
  resolved: string | null;
}

export interface GuessResult {
  cardIndex: number;
  actual: string;
  guessed: StoredGuess;
  correct: boolean;
}

/** Session state persisted to sessionStorage. */
export interface GameSessionState {
  difficulty: DifficultyLevel;
  currentCardIndex: number;
  guesses: StoredGuess[];
  deckSeed: number;
  deckLength: number;
}

/**
 * Canonical naming for shapes/colors: internalId, displayName, and voice synonyms for matching.
 */
export interface ShapeNameMapEntry {
  internalId: string;
  displayName: string;
  voiceSynonyms: string[];
}

/** Map for resolving voice input to canonical shape/color names. */
export const SHAPE_NAME_MAP: ShapeNameMapEntry[] = [
  // 2D shapes
  { internalId: 'circle', displayName: 'Circle', voiceSynonyms: ['circle', 'round', 'dot', 'round shape'] },
  { internalId: 'square', displayName: 'Square', voiceSynonyms: ['square', 'box', 'quad'] },
  { internalId: 'triangle', displayName: 'Triangle', voiceSynonyms: ['triangle', 'tri'] },
  { internalId: 'star', displayName: 'Star', voiceSynonyms: ['star', 'stars'] },
  { internalId: 'hexagon', displayName: 'Hexagon', voiceSynonyms: ['hexagon', 'hex'] },
  // 3D shapes
  { internalId: 'cube', displayName: 'Cube', voiceSynonyms: ['cube', 'box', 'square 3d', 'dice'] },
  { internalId: 'sphere', displayName: 'Sphere', voiceSynonyms: ['sphere', 'ball', 'round'] },
  { internalId: 'cone', displayName: 'Cone', voiceSynonyms: ['cone', 'cone shape'] },
  { internalId: 'torus', displayName: 'Torus', voiceSynonyms: ['torus', 'donut', 'ring'] },
  { internalId: 'pyramid', displayName: 'Pyramid', voiceSynonyms: ['pyramid', 'tetrahedron', 'triangle 3d'] },
  // Colors (Tailwind-style names)
  { internalId: 'red', displayName: 'Red', voiceSynonyms: ['red'] },
  { internalId: 'blue', displayName: 'Blue', voiceSynonyms: ['blue'] },
  { internalId: 'green', displayName: 'Green', voiceSynonyms: ['green'] },
  { internalId: 'yellow', displayName: 'Yellow', voiceSynonyms: ['yellow'] },
  { internalId: 'purple', displayName: 'Purple', voiceSynonyms: ['purple', 'violet'] },
  { internalId: 'orange', displayName: 'Orange', voiceSynonyms: ['orange'] },
  { internalId: 'pink', displayName: 'Pink', voiceSynonyms: ['pink'] },
  { internalId: 'indigo', displayName: 'Indigo', voiceSynonyms: ['indigo'] },
];

/** Tailwind color name to hex (subset). */
export const COLOR_TO_HEX: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  indigo: '#6366f1',
  gray: '#6b7280',
};
