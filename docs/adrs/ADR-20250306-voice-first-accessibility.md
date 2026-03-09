---
# ADR: Voice-first and screen-reader accessibility
Date: 2025-03-06
Status: Accepted
Context:
- Game is played blindfolded or without looking at the screen; must be playable by blind users.
- Browsers require a user gesture to enable audio/speech; we should not rely on finding a specific "Enable sound" button.

Decision:
- Unlock audio and start the menu voice listener on **first tap or key press anywhere** (game root or overlay), not only on a dedicated button. Overlay remains as fallback and is fully clickable ("tap anywhere").
- Add sr-only `aria-live` regions: initial instruction ("Tap anywhere or press any key to begin. Then say Start.") and dynamic announcer for "Card N of M. Say your guess." and "Round complete. Results ready." so screen readers announce state without requiring sight.

Alternatives Considered:
- Keep "Enable sound" button only: rejected because blind users cannot locate it.
- Auto-unlock on load: rejected; browsers block audio without a user gesture.

Consequences:
- Positive: One tap/key anywhere enables voice; blind users can tap once then say "Start"; card position and results are announced.
- Negative: None significant.
- Follow-ups: None.

Attachments / References:
- main.ts: onFirstGesture(), setAnnouncer(), root click/keydown once listeners, overlay click.
