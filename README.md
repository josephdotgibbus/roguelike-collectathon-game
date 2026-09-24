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

https://josephdotgibbus.github.io/roguelike-collectathon-game/

Pages publishes the `main` branch root. That root is the production build
(`index.html`, `assets/`, and `.nojekyll`), with relative paths so the 3D game
loads from the project subpath. `npm run dev` still uses `dev.html`.

Pushes to `main` rebuild and commit that static root.

## Cloud Agent environment

`.cursor/environment.json` installs dependencies and launches the Vite dev server
on port `5173`.
