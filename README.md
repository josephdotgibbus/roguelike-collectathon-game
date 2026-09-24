# roguelike-collectathon-game

A browser-based top-down 3D platform in a dark void, built with Vite, TypeScript, and Three.js. The player is a 2D sprite standing in the 3D space, with a soft shadow that sits on whatever surface is underneath them.

This is the movement foundation: floating platforms, walking, and jumping. Collectibles, enemies, and the roguelike loop are not in yet.

## Controls

- `W` `A` `S` `D` or the arrow keys to move.
- `Space` to jump. Hold it for a higher jump.
- Fall into the void and you reappear on the center platform.

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
index.html
src/
  main.ts             # Animation loop
  style.css
  game/
    level.ts          # Hand-placed platforms
    physics.ts        # Movement, jumping, and collision
    player.ts         # Sprite, shadow, and respawn
    world.ts          # Three.js environment
    game.ts           # Camera, lighting, and frame update
    spriteFrames.ts   # Pixel frames for idle, run, jump, and fall
tests/                # Movement and sprite checks
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

## Cloud Agent environment

`.cursor/environment.json` installs dependencies and launches the Vite dev server
on port `5173`.
