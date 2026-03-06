---
# ADR: Voice-Based Guessing Game
Date: 2025-03-06
Status: Accepted
Context:
- Blindfolded users need a browser game that uses voice recognition to guess card content (shapes/colours).
- Existing repo is Astro 4.x with Tailwind and TypeScript; we want a single build and no second framework.

Decision:
- Implement the game as an Astro page (`src/pages/game.astro`) with all logic in `src/game/` (main.ts, components). Use Web Speech API, GSAP for card flip, Three.js for 3D shapes, Web Audio for placeholder sounds, Web Vibration for haptics. Add session persistence, accessibility (ARIA, keyboard, Debug Mode), shape naming/synonyms, voice timeout, Three.js dispose, GSAP timeline kill, audio unlock, orientation handling, FPS fallback, and a debug panel gated by env.

Alternatives Considered:
- Option B: Separate Vite app in /game — two builds, more complexity.
- Option C: Full SPA replacing site — drops Astro and current layout.

Consequences:
- Positive: Single toolchain, modular TS under src/game/, all features in one place.
- Negative: Game entry is game.astro not a standalone index.html.
- Follow-ups: Replace placeholder audio with real assets; consider service worker for offline.

Attachments / References:
- Plan: .cursor/plans/voice_guessing_game_e842d8b6.plan.md
---
