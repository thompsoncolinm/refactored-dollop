/**
 * Game constants: session key, voice timeout, debug panel flag.
 */

export const SESSION_STORAGE_KEY = 'voice-guessing-game-session';

/** Voice recognition timeout per card (ms). */
export const VOICE_TIMEOUT_MS = 6000;

/** Enable debug panel (e.g. only in dev). */
export const DEBUG_PANEL_ENABLED =
  typeof import.meta.env !== 'undefined' && import.meta.env?.DEV === true;

/** Enable verbose console logs for voice recognition. True in dev, or set localStorage.debugVoice = '1' and reload. */
export const DEBUG_VOICE =
  (typeof import.meta.env !== 'undefined' && import.meta.env?.DEV === true) ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('debugVoice') === '1');
