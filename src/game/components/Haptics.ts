/**
 * Haptic feedback via Web Vibration API. Fails silently on unsupported devices; optional console fallback for debugging.
 */

const FLIP_PATTERN = [40];
const ROUND_END_PATTERN = [0, 200, 50, 200];

function vibrate(pattern: number | number[]): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    return navigator.vibrate(pattern);
  }
  return false;
}

export const Haptics = {
  /** Short vibration on card flip (e.g. 40ms). */
  flip(): void {
    if (!vibrate(FLIP_PATTERN)) {
      console.debug('Haptics: flip');
    }
  },

  /** Longer pattern when round completes. */
  roundEnd(): void {
    if (!vibrate(ROUND_END_PATTERN)) {
      console.debug('Haptics: round end');
    }
  },
};
