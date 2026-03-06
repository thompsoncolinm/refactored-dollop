/**
 * Game constants: session key, voice timeout, debug panel flag.
 */

export const SESSION_STORAGE_KEY = 'voice-guessing-game-session';

/** Voice recognition timeout per card (ms). */
export const VOICE_TIMEOUT_MS = 6000;

/** Enable debug panel (e.g. only in dev). */
export const DEBUG_PANEL_ENABLED =
  typeof import.meta.env !== 'undefined' && import.meta.env?.DEV === true;
