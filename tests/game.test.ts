import { describe, expect, it } from "vitest";
import { buildFloor, createGame, descend, movePlayer } from "../src/game/game";
import { makeRng } from "../src/game/rng";
import { FLOOR, GameState } from "../src/game/types";

function fresh(seed = 123): GameState {
  return createGame(seed);
}

describe("game setup", () => {
  it("creates a floor-1 game with player, gems and enemies", () => {
    const g = fresh();
    expect(g.floor).toBe(1);
    expect(g.status).toBe("playing");
    expect(g.gems.length).toBeGreaterThan(0);
    expect(g.enemies.length).toBeGreaterThan(0);
    expect(g.grid[g.player.y][g.player.x]).toBe(FLOOR);
    expect(g.player.hp).toBe(g.player.maxHp);
  });

  it("does not spawn the player on a gem or enemy", () => {
    const g = fresh(555);
    const onGem = g.gems.some((gm) => gm.x === g.player.x && gm.y === g.player.y);
    const onEnemy = g.enemies.some((e) => e.x === g.player.x && e.y === g.player.y);
    expect(onGem).toBe(false);
    expect(onEnemy).toBe(false);
  });

  it("is reproducible for a fixed seed", () => {
    const a = fresh(2024);
    const b = fresh(2024);
    expect(a.player).toEqual(b.player);
    expect(a.gems).toEqual(b.gems);
    expect(a.enemies.map((e) => ({ x: e.x, y: e.y }))).toEqual(
      b.enemies.map((e) => ({ x: e.x, y: e.y })),
    );
  });
});

describe("movement and collisions", () => {
  it("does not walk through walls", () => {
    const g = fresh();
    // Force player into a corner surrounded by walls conceptually: try all 4 dirs
    // and assert the player never lands on a wall tile.
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const before = { x: g.player.x, y: g.player.y };
      movePlayer(g, dx, dy);
      expect(g.grid[g.player.y][g.player.x]).toBe(FLOOR);
      // Either moved to a floor tile or stayed put.
      const moved = g.player.x !== before.x || g.player.y !== before.y;
      if (moved) {
        expect(Math.abs(g.player.x - before.x) + Math.abs(g.player.y - before.y)).toBe(1);
      }
    }
  });

  it("ignores diagonal and zero moves", () => {
    const g = fresh();
    const before = { ...g.player };
    movePlayer(g, 1, 1);
    movePlayer(g, 0, 0);
    expect(g.player.x).toBe(before.x);
    expect(g.player.y).toBe(before.y);
  });

  it("collects a gem when moving onto it", () => {
    const g = fresh();
    // Place a gem directly to a known reachable floor tile next to the player.
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const;
    const dir = dirs.find(([dx, dy]) =>
      g.grid[g.player.y + dy]?.[g.player.x + dx] === FLOOR &&
      !g.enemies.some((e) => e.x === g.player.x + dx && e.y === g.player.y + dy),
    )!;
    const target = { x: g.player.x + dir[0], y: g.player.y + dir[1] };
    g.gems = [{ ...target }];
    const scoreBefore = g.score;
    movePlayer(g, dir[0], dir[1]);
    expect(g.gems.length).toBe(0);
    expect(g.score).toBe(scoreBefore + 10);
  });

  it("attacks an adjacent enemy instead of moving into it", () => {
    const g = fresh();
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const;
    const dir = dirs.find(([dx, dy]) =>
      g.grid[g.player.y + dy]?.[g.player.x + dx] === FLOOR,
    )!;
    const target = { x: g.player.x + dir[0], y: g.player.y + dir[1] };
    g.enemies = [{ id: 999, x: target.x, y: target.y, hp: 2 }];
    const px = g.player.x;
    const py = g.player.y;
    movePlayer(g, dir[0], dir[1]);
    // Player stays put (bumped the enemy), enemy loses 1 hp.
    expect(g.player.x).toBe(px);
    expect(g.player.y).toBe(py);
    expect(g.enemies[0].hp).toBe(1);
  });

  it("defeats an enemy and awards points after two hits", () => {
    const g = fresh();
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const;
    const dir = dirs.find(([dx, dy]) =>
      g.grid[g.player.y + dy]?.[g.player.x + dx] === FLOOR,
    )!;
    const target = { x: g.player.x + dir[0], y: g.player.y + dir[1] };
    g.enemies = [{ id: 42, x: target.x, y: target.y, hp: 2 }];
    const scoreBefore = g.score;
    movePlayer(g, dir[0], dir[1]);
    movePlayer(g, dir[0], dir[1]);
    expect(g.enemies.length).toBe(0);
    expect(g.score).toBe(scoreBefore + 5);
  });
});

describe("floor progression", () => {
  it("spawns stairs only after all gems are collected", () => {
    const g = fresh();
    expect(g.stairs).toBeNull();
    g.gems = [];
    // A no-op wall bump still triggers the stairs check.
    movePlayer(g, 1, 0);
    movePlayer(g, -1, 0);
    movePlayer(g, 0, 1);
    movePlayer(g, 0, -1);
    expect(g.stairs).not.toBeNull();
  });

  it("descend advances the floor and carries score with a bonus", () => {
    const g = fresh();
    g.score = 100;
    const next = descend(g);
    expect(next.floor).toBe(g.floor + 1);
    expect(next.score).toBe(125);
    expect(next.status).toBe("playing");
    expect(next.gems.length).toBeGreaterThan(0);
  });

  it("scales gem count with depth", () => {
    const rng = makeRng(3030);
    const f1 = buildFloor(1, rng, { score: 0, hp: 10, seed: 3030 });
    const f5 = buildFloor(5, makeRng(4040), { score: 0, hp: 10, seed: 4040 });
    expect(f5.gems.length).toBeGreaterThanOrEqual(f1.gems.length);
  });
});

describe("death", () => {
  it("ends the game when hp reaches zero", () => {
    const g = fresh();
    // Surround player context: put an adjacent enemy and drop hp to 1 so its
    // counterattack kills the player.
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const;
    const dir = dirs.find(([dx, dy]) =>
      g.grid[g.player.y + dy]?.[g.player.x + dx] === FLOOR,
    )!;
    g.enemies = [
      { id: 1, x: g.player.x + dir[0], y: g.player.y + dir[1], hp: 5 },
    ];
    g.player.hp = 1;
    // Bump the enemy; it survives and counterattacks on the enemy turn.
    movePlayer(g, dir[0], dir[1]);
    expect(g.player.hp).toBe(0);
    expect(g.status).toBe("dead");
  });

  it("does not allow moves after death", () => {
    const g = fresh();
    g.status = "dead";
    const before = { ...g.player };
    movePlayer(g, 1, 0);
    expect(g.player).toEqual(before);
  });
});
