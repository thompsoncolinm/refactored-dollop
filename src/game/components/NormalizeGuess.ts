/**
 * Normalize voice transcript (trim, lowercase, remove filler words) and resolve to canonical name via ShapeNameMap synonyms.
 */

import { SHAPE_NAME_MAP } from '../types';

const FILLER_WORDS = new Set(['uh', 'um', 'the', 'a', 'an', 'like', 'so', 'well']);

/**
 * Normalize transcript: trim, toLowerCase, remove filler words.
 */
export function normalize(transcript: string): string {
  const lower = transcript.trim().toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 0 && !FILLER_WORDS.has(w));
  return words.join(' ');
}

/**
 * Resolve normalized string to canonical internalId by matching against SHAPE_NAME_MAP synonyms.
 * Returns displayName for the match, or null if no match.
 */
export function resolveToCanonical(normalized: string): string | null {
  if (!normalized) return null;
  const normalizedLower = normalized.toLowerCase();
  for (const entry of SHAPE_NAME_MAP) {
    for (const syn of entry.voiceSynonyms) {
      if (normalizedLower === syn || normalizedLower.includes(syn)) {
        return entry.displayName;
      }
    }
  }
  return null;
}
