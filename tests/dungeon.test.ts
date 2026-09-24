import { describe, expect, it } from "vitest";
import { floorTiles, generateDungeon } from "../src/game/dungeon";
import { makeRng } from "../src/game/rng";
import { FLOOR, Tile, Vec } from "../src/game/types";

function neighbors(v: Vec): Vec[] {
  return [
    { x: v.x + 1, y: v.y },
    { x: v.x - 1, y: v.y },
    { x: v.x, y: v.y + 1 },
    { x: v.x, y: v.y - 1 },
  ];
}

/** Flood fill from the first floor tile; returns how many floor tiles are reachable. */
function reachableCount(grid: Tile[][]): { total: number; reachable: number } {
  const all = floorTiles(grid);
  if (all.length === 0) return { total: 0, reachable: 0 };
  const seen = new Set<string>();
  const start = all[0];
  const stack = [start];
  seen.add(`${start.x},${start.y}`);
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of neighbors(cur)) {
      const key = `${n.x},${n.y}`;
      if (
        n.y >= 0 &&
        n.y < grid.length &&
        n.x >= 0 &&
        n.x < grid[0].length &&
        grid[n.y][n.x] === FLOOR &&
        !seen.has(key)
      ) {
        seen.add(key);
        stack.push(n);
      }
    }
  }
  return { total: all.length, reachable: seen.size };
}

describe("dungeon generation", () => {
  it("produces a grid of the requested size", () => {
    const rng = makeRng(1);
    const { grid } = generateDungeon(22, 22, rng);
    expect(grid.length).toBe(22);
    expect(grid.every((row) => row.length === 22)).toBe(true);
  });

  it("carves at least one room with floor tiles", () => {
    const rng = makeRng(2);
    const { grid, rooms } = generateDungeon(22, 22, rng);
    expect(rooms.length).toBeGreaterThan(0);
    expect(floorTiles(grid).length).toBeGreaterThan(0);
  });

  it("keeps a wall border around the map", () => {
    const rng = makeRng(3);
    const { grid } = generateDungeon(22, 22, rng);
    const h = grid.length;
    const w = grid[0].length;
    for (let x = 0; x < w; x++) {
      expect(grid[0][x]).not.toBe(FLOOR);
      expect(grid[h - 1][x]).not.toBe(FLOOR);
    }
    for (let y = 0; y < h; y++) {
      expect(grid[y][0]).not.toBe(FLOOR);
      expect(grid[y][w - 1]).not.toBe(FLOOR);
    }
  });

  it("is fully connected (every floor tile reachable) across many seeds", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = makeRng(seed);
      const { grid } = generateDungeon(22, 22, rng);
      const { total, reachable } = reachableCount(grid);
      expect(reachable).toBe(total);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const g1 = generateDungeon(22, 22, makeRng(777)).grid;
    const g2 = generateDungeon(22, 22, makeRng(777)).grid;
    expect(g1).toEqual(g2);
  });
});
