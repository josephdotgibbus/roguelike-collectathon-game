import { Dungeon, floorTiles, generateDungeon } from "./dungeon";
import { Rng, makeRng, randInt } from "./rng";
import { Enemy, FLOOR, GameState, Vec } from "./types";

export const MAP_W = 22;
export const MAP_H = 22;
const MAX_HP = 10;

let enemyIdCounter = 0;

function keyOf(v: Vec): string {
  return `${v.x},${v.y}`;
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Number of gems / enemies scales gently with depth. */
function gemCountForFloor(floor: number): number {
  return 4 + Math.min(floor, 6);
}

function enemyCountForFloor(floor: number): number {
  return 1 + Math.min(floor, 6);
}

/**
 * Build a fresh floor (dungeon + player spawn + gems + enemies) and merge it
 * into the provided partial state (which carries score / floor / hp forward).
 */
export function buildFloor(
  floor: number,
  rng: Rng,
  carry: { score: number; hp: number; seed: number },
): GameState {
  const dungeon: Dungeon = generateDungeon(MAP_W, MAP_H, rng);
  const open = shuffle(rng, floorTiles(dungeon.grid));

  // Player spawns on the first open tile.
  const playerTile = open.shift() ?? { x: 1, y: 1 };

  const gems: Vec[] = [];
  const gemCount = Math.min(gemCountForFloor(floor), open.length);
  for (let i = 0; i < gemCount; i++) {
    gems.push(open.shift()!);
  }

  const enemies: Enemy[] = [];
  const enemyCount = Math.min(enemyCountForFloor(floor), open.length);
  for (let i = 0; i < enemyCount; i++) {
    const tile = open.shift()!;
    enemies.push({ id: enemyIdCounter++, x: tile.x, y: tile.y, hp: 2 });
  }

  return {
    width: MAP_W,
    height: MAP_H,
    grid: dungeon.grid,
    player: { x: playerTile.x, y: playerTile.y, hp: carry.hp, maxHp: MAX_HP },
    gems,
    enemies,
    stairs: null,
    floor,
    score: carry.score,
    status: "playing",
    message: `Floor ${floor}: collect all ${gems.length} gems!`,
    seed: carry.seed,
  };
}

export function createGame(seed: number = Date.now()): GameState {
  const rng = makeRng(seed);
  return buildFloor(1, rng, { score: 0, hp: MAX_HP, seed });
}

function isFloor(state: GameState, x: number, y: number): boolean {
  return (
    y >= 0 &&
    y < state.height &&
    x >= 0 &&
    x < state.width &&
    state.grid[y][x] === FLOOR
  );
}

function enemyAt(state: GameState, x: number, y: number): Enemy | undefined {
  return state.enemies.find((e) => e.x === x && e.y === y);
}

/** Reveal stairs on a random remaining floor tile once all gems are gone. */
function maybeSpawnStairs(state: GameState, rng: Rng): void {
  if (state.gems.length === 0 && !state.stairs) {
    const occupied = new Set<string>([
      keyOf(state.player),
      ...state.enemies.map(keyOf),
    ]);
    const candidates = floorTiles(state.grid).filter(
      (t) => !occupied.has(keyOf(t)),
    );
    if (candidates.length > 0) {
      state.stairs = candidates[randInt(rng, 0, candidates.length - 1)];
      state.message = "All gems collected! Reach the stairs (purple).";
    }
  }
}

/** Move each enemy one step toward the player (greedy, walls block). */
function moveEnemies(state: GameState): void {
  for (const enemy of state.enemies) {
    const dx = Math.sign(state.player.x - enemy.x);
    const dy = Math.sign(state.player.y - enemy.y);

    // If already adjacent, attack instead of moving onto the player.
    if (Math.abs(state.player.x - enemy.x) + Math.abs(state.player.y - enemy.y) === 1) {
      state.player.hp -= 1;
      continue;
    }

    const tries: Vec[] = [];
    if (Math.abs(state.player.x - enemy.x) > Math.abs(state.player.y - enemy.y)) {
      tries.push({ x: enemy.x + dx, y: enemy.y }, { x: enemy.x, y: enemy.y + dy });
    } else {
      tries.push({ x: enemy.x, y: enemy.y + dy }, { x: enemy.x + dx, y: enemy.y });
    }

    for (const t of tries) {
      if (
        isFloor(state, t.x, t.y) &&
        !enemyAt(state, t.x, t.y) &&
        !(t.x === state.player.x && t.y === state.player.y)
      ) {
        enemy.x = t.x;
        enemy.y = t.y;
        break;
      }
    }
  }

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.status = "dead";
    state.message = `You died on floor ${state.floor}. Final score: ${state.score}. Press R.`;
  }
}

/**
 * Attempt to move the player by (dx, dy). Handles attacking enemies, collecting
 * gems, descending stairs, and advancing the enemy turn. Returns the updated
 * state (mutated in place and returned for convenience).
 */
export function movePlayer(state: GameState, dx: number, dy: number): GameState {
  if (state.status !== "playing") return state;
  if ((dx === 0 && dy === 0) || (dx !== 0 && dy !== 0)) return state; // cardinal only

  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  const target = enemyAt(state, nx, ny);
  if (target) {
    // Bump attack.
    target.hp -= 1;
    if (target.hp <= 0) {
      state.enemies = state.enemies.filter((e) => e.id !== target.id);
      state.score += 5;
      state.message = "Enemy defeated! (+5)";
    } else {
      state.message = "You hit the enemy.";
    }
    moveEnemies(state);
    return state;
  }

  if (!isFloor(state, nx, ny)) {
    return state; // blocked by wall / edge
  }

  state.player.x = nx;
  state.player.y = ny;

  // Collect a gem if standing on one.
  const gemIndex = state.gems.findIndex((g) => g.x === nx && g.y === ny);
  if (gemIndex >= 0) {
    state.gems.splice(gemIndex, 1);
    state.score += 10;
    state.message = `Gem collected! (+10) ${state.gems.length} left.`;
  }

  const rng = makeRng(state.seed + state.floor * 1000 + state.score);
  maybeSpawnStairs(state, rng);

  // Descend when reaching the stairs.
  if (state.stairs && nx === state.stairs.x && ny === state.stairs.y) {
    return descend(state);
  }

  moveEnemies(state);
  return state;
}

/** Advance to the next floor, carrying score and hp; small hp bonus on descent. */
export function descend(state: GameState): GameState {
  const nextFloor = state.floor + 1;
  const rng = makeRng(state.seed + nextFloor * 7919);
  const healedHp = Math.min(state.player.maxHp, state.player.hp + 2);
  const next = buildFloor(nextFloor, rng, {
    score: state.score + 25,
    hp: healedHp,
    seed: state.seed,
  });
  next.message = `Descended to floor ${nextFloor}! (+25, +2 HP) Collect ${next.gems.length} gems.`;
  return next;
}
