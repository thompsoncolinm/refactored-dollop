/**
 * Haptics.ts
 * Wrapper for the Web Vibration API.
 * Fails silently on unsupported devices and logs debug info to the console.
 */

/** Vibrate if supported; otherwise log for debugging. */
function vibrate(pattern: number | number[], label: string): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  } else {
    console.log(`Haptics: ${label}`);
  }
}

/** Short vibration when a card flips (≈40 ms). */
export function hapticFlip(): void {
  vibrate([40], 'flip');
}

/**
 * Longer vibration pattern when a round ends.
 * Pattern: silence → buzz → silence → buzz
 */
export function hapticRoundEnd(): void {
  vibrate([0, 200, 50, 200], 'round end');
}
