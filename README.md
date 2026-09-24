# roguelike-collectathon-game

A small browser-based **roguelike collectathon**: explore a procedurally generated
dungeon, collect every gem on the floor, then find the stairs down. Fight (or dodge)
enemies, survive as deep as you can, and rack up the highest score.

Built with **Vite + TypeScript** and rendered on an HTML5 canvas. Game logic is
pure and unit-tested with **Vitest**.

## Gameplay

- Move with `W` `A` `S` `D` or the arrow keys (turn-based: enemies move after you).
- Walk over a gem to collect it (+10). Collect every gem to reveal the stairs (`>`).
- Walk into an enemy to attack it. Two hits defeats it (+5).
- Enemies chase you and hit you when adjacent. Reach the stairs to descend (+25, +2 HP).
- Reach 0 HP and it's game over. Press `R` (or the button) for a new run.

## Getting started

```bash
npm ci          # install dependencies (use `npm install` for a fresh clone)
npm run dev     # start the Vite dev server on http://localhost:5173
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (host `0.0.0.0`, port `5173`). |
| `npm run build` | Type-check and build the production bundle to `dist/`. |
| `npm run preview` | Preview the production build on port `4173`. |
| `npm run typecheck` | Run `tsc --noEmit`. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |

## Project structure

```
index.html            # App shell + HUD
src/
  main.ts             # Input handling, HUD sync, render loop
  style.css           # UI styling
  game/
    rng.ts            # Deterministic seedable PRNG (mulberry32)
    types.ts          # Shared types + tile constants
    dungeon.ts        # Procedural dungeon generation
    game.ts           # Game state, movement, combat, floor progression
    render.ts         # Canvas rendering
tests/                # Vitest unit tests for the pure game logic
```

## Play it online (GitHub Pages)

This repo auto-deploys to GitHub Pages on every push to `main` via
`.github/workflows/deploy-pages.yml` (it type-checks, tests, builds, and publishes
`dist/`). The build uses a relative base path, so it works from the project
subpath GitHub Pages serves.

One-time setup: in the repo, go to **Settings → Pages → Build and deployment →
Source** and choose **GitHub Actions**. After the next push to `main`, the game
is live at:

```
https://josephdotgibbus.github.io/roguelike-collectathon-game/
```

You can also trigger a deploy manually from the **Actions** tab
(**Deploy to GitHub Pages → Run workflow**).

## Add your own assets

Put images/audio/fonts in the [`public/`](public/) folder — they are copied to the
site root at build time. You can upload them straight from the GitHub web UI
(**Add file → Upload files**) or edit files in the browser by pressing `.` on the
repo to open github.dev. See [`public/README.md`](public/README.md) for details.

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment: it runs
`npm ci` to install dependencies and launches the Vite dev server in a `dev-server`
terminal on port `5173`.
