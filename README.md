# Refactored Dollop

Astro-based site with a voice-controlled guessing game.

## Tech stack

- **Site**: Astro 4, Tailwind CSS, TypeScript
- **Game**: TypeScript, GSAP (animations), Three.js (3D shapes), Web Speech API (voice), Web Audio API, Web Vibration API (haptics)

## Setup

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). The game is at [http://localhost:4321/game](http://localhost:4321/game).

### Build and preview

```bash
npm run build
npm run preview
```

Production build outputs to `./dist/`.

## Project structure

```text
/
├── public/
│   ├── assets/           # Optional images/assets
│   ├── fonts/
│   ├── sounds/           # Game audio (see public/sounds/README.md)
│   │   └── README.md
│   └── favicon.svg
├── src/
│   ├── game/             # Voice guessing game (TypeScript)
│   │   ├── main.ts       # Game bootstrap, UI wiring
│   │   ├── constants.ts
│   │   ├── types.ts      # Enums, CardData, ShapeNameMap, etc.
│   │   ├── mockData.ts   # Deck generation, seeded RNG
│   │   └── components/
│   │       ├── Card.ts
│   │       ├── Shape2D.ts
│   │       ├── Shape3D.ts
│   │       ├── VoiceController.ts
│   │       ├── AudioController.ts
│   │       ├── Haptics.ts
│   │       ├── GameEngine.ts
│   │       ├── SessionStorage.ts
│   │       ├── NormalizeGuess.ts
│   │       ├── OrientationHandler.ts
│   │       ├── FPSMonitor.ts
│   │       └── DebugPanel.ts
│   ├── components/       # Astro components (e.g. Card.astro, Scripts.astro)
│   ├── layouts/
│   │   ├── Layout.astro
│   │   └── Modal.astro
│   ├── pages/
│   │   ├── index.astro   # Home
│   │   └── game.astro    # Game page
│   ├── scripts/
│   └── env.d.ts          # Types for Astro, Web Speech API, three
├── docs/
│   ├── adrs/             # Architecture decision records
│   └── decision-log.md
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

- **Routes**: `src/pages/*.astro` → `/` and `/game`. Static assets in `public/` are served at the root.
- **Game entry**: `src/pages/game.astro` mounts `#game-root` and runs `src/game/main.ts`.

## Dev notes

### Game

- **Voice**: Uses Web Speech API (`SpeechRecognition`). Works best in Chrome/Edge over HTTPS. If unsupported or blocked, the game still runs (e.g. 6s timeout → “no response”).
- **Audio**: Placeholder sounds live under `public/sounds/` (see `public/sounds/README.md`). If files are missing, the game uses a short Web Audio beep. First playback is gated by user gesture (Start/Resume).
- **Session**: Game state (difficulty, card index, guesses, deck seed) is stored in `sessionStorage` and cleared when a round finishes. On reload with an in-progress game, “Resume game?” is shown.
- **Debug panel**: In development (`import.meta.env.DEV`), press **D** or long-press the **?** in the top-right to open the debug panel (current card, transcript, haptics/audio, FPS, session state). Disabled in production unless explicitly enabled.
- **Orientation**: On small screens, landscape shows a “Rotate to portrait” overlay and pauses voice/animations until portrait.
- **3D**: Three.js is used for 3D shapes. The `three` module has no types in the package; `src/env.d.ts` declares `declare module 'three'` so the build succeeds. For full typings, consider `@types/three` or a three build that ships types.

### Site

- **Styling**: Tailwind with `darkMode: 'media'` (`prefers-color-scheme`). Custom tokens (e.g. `logo`, screens) are in `tailwind.config.mjs`.
- **Layout**: `Layout.astro` provides the shell (font, header, main, footer). Game page uses the same layout with minimal chrome.

### Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Install dependencies                             |
| `npm run dev`             | Start dev server at `localhost:4321`             |
| `npm run build`           | Type-check and build to `./dist/`                |
| `npm run preview`         | Serve the production build locally               |
| `npm run astro ...`       | Run Astro CLI (e.g. `astro check`)               |
| `npm run astro -- --help` | Astro CLI help                                   |

### Docs and decisions

- **ADRs**: `docs/adrs/` (e.g. `ADR-20250306-voice-guessing-game.md`).
- **Decision log**: `docs/decision-log.md` (table of decisions with dates and links).

## Learn more

- [Astro docs](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com/docs)
