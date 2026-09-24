import type { Difficulty } from "./shops";
import type { Solid } from "./physics";

export type TileKind = "beacon" | "normal" | "ice" | "highrise";

export type Tile = {
  id: number;
  x: number;
  z: number;
  w: number;
  d: number;
  top: number;
  h: number;
  kind: TileKind;
  /** Higher falls sooner. The beacon never falls. */
  fallRank: number;
};

export type PickupKind = "gift" | "tripmine" | "seamine";

/** Radius of the exit ring in the middle of the beacon platform. */
export const BEACON_WIN_RADIUS = 1.15;

export function inBeaconRing(x: number, z: number, radius = BEACON_WIN_RADIUS): boolean {
  return x * x + z * z <= radius * radius;
}

export type Pickup = {
  id: number;
  tileId: number;
  x: number;
  y: number;
  z: number;
  kind: PickupKind;
};

export type GeneratedLevel = {
  level: number;
  tiles: Tile[];
  pickups: Pickup[];
  spawn: { x: number; y: number; z: number };
  giftCount: number;
};

const DIRS = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];

export function iceLevel(difficulty: Difficulty): number {
  return difficulty === "extreme" ? 5 : 8;
}

export function tripmineLevel(difficulty: Difficulty): number | null {
  if (difficulty === "casual") return null;
  return difficulty === "extreme" ? 3 : 5;
}

export function seamineLevel(difficulty: Difficulty): number {
  return difficulty === "casual" ? 15 : 10;
}

export function giftBudget(level: number): number {
  return Math.round(8 + level * 3.5);
}

function overlaps(a: Tile, x: number, z: number, w: number, d: number): boolean {
  return Math.abs(a.x - x) < (a.w + w) / 2 - 0.05 && Math.abs(a.z - z) < (a.d + d) / 2 - 0.05;
}

function giftSpots(tile: Tile, budget: number, rng: () => number): { x: number; z: number }[] {
  const spots: { x: number; z: number }[] = [];
  const step = 1.85;
  for (let z = -tile.d / 2 + 1.15; z <= tile.d / 2 - 1.05 && spots.length < budget; z += step) {
    for (let x = -tile.w / 2 + 1.15; x <= tile.w / 2 - 1.05 && spots.length < budget; x += step) {
      spots.push({
        x: tile.x + x + (rng() - 0.5) * 0.25,
        z: tile.z + z + (rng() - 0.5) * 0.25,
      });
    }
  }
  if (spots.length === 0 && budget > 0) spots.push({ x: tile.x, z: tile.z });
  return spots;
}

/** Branching platforms whose gift count, ice, towers, and mines follow the level. */
export function generateLevel(level: number, difficulty: Difficulty, rng: () => number): GeneratedLevel {
  const beacon: Tile = {
    id: 0,
    x: 0,
    z: 0,
    w: 11,
    d: 11,
    top: 0,
    h: 0.9,
    kind: "beacon",
    fallRank: 0,
  };
  const tiles: Tile[] = [beacon];
  const budget = giftBudget(level);
  const tileGoal = Math.min(36, 4 + level * 2);
  const minesAt = tripmineLevel(difficulty);
  const iceAt = iceLevel(difficulty);
  const seaAt = seamineLevel(difficulty);
  let guard = 0;

  while (tiles.length < tileGoal && guard < 500) {
    guard += 1;
    const parent = tiles[Math.floor(rng() * tiles.length)];
    if (parent.kind === "highrise") continue;
    const dir = DIRS[Math.floor(rng() * DIRS.length)];
    const highrise = level >= 18 && rng() < 0.16;
    const w = highrise ? 7 + rng() * 2 : 4.6 + rng() * 3.4;
    const d = highrise ? 7 + rng() * 2 : 4.6 + rng() * 3.4;
    const connected = level <= 2 || rng() < Math.max(0.22, 0.84 - level * 0.035);
    const gap = connected ? 0 : 1.35 + rng() * (0.8 + Math.min(level, 16) * 0.05);
    const x = parent.x + dir.x * ((parent.w + w) / 2 + gap);
    const z = parent.z + dir.z * ((parent.d + d) / 2 + gap);
    if (tiles.some((tile) => overlaps(tile, x, z, w, d))) continue;
    const riseCap = level <= 2 ? 0.4 : Math.min(0.35 + level * 0.06, 1.6);
    const rise = (rng() - 0.35) * riseCap;
    const top = Math.max(-1.2, parent.top + (highrise ? 1.25 + rng() * 0.45 : rise));
    const ice = !highrise && level >= iceAt && rng() < 0.28;
    const tile: Tile = {
      id: tiles.length,
      x,
      z,
      w,
      d,
      top,
      h: highrise ? top + 0.8 : 0.75,
      kind: highrise ? "highrise" : ice ? "ice" : "normal",
      fallRank: 0,
    };
    tiles.push(tile);
  }

  const ranked = tiles
    .filter((tile) => tile.kind !== "beacon")
    .sort((a, b) => Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z));
  ranked.forEach((tile, index) => {
    tile.fallRank = index + 1;
  });

  const pickups: Pickup[] = [];
  let giftCount = 0;
  const push = (tile: Tile, x: number, z: number, kind: PickupKind) => {
    pickups.push({ id: pickups.length, tileId: tile.id, x, y: tile.top, z, kind });
    if (kind === "gift") giftCount += 1;
  };

  for (const tile of tiles) {
    const cap = tile.kind === "beacon" ? Math.min(3, Math.max(1, Math.ceil(budget / 12))) : 6;
    const spots = giftSpots(tile, cap, rng).filter(
      (spot) => tile.kind !== "beacon" || !inBeaconRing(spot.x, spot.z, BEACON_WIN_RADIUS + 0.7),
    );
    for (const spot of spots) {
      if (giftCount >= budget) break;
      const mine = minesAt !== null && level >= minesAt && rng() < 0.14;
      push(tile, spot.x, spot.z, mine ? "tripmine" : "gift");
    }
    if (level >= seaAt && tile.kind !== "beacon" && rng() < 0.35) {
      const edge = DIRS[Math.floor(rng() * DIRS.length)];
      push(tile, tile.x + edge.x * (tile.w * 0.32), tile.z + edge.z * (tile.d * 0.32), "seamine");
    }
  }

  return { level, tiles, pickups, spawn: { x: 0, y: 0, z: 3.3 }, giftCount };
}

export function tileSolid(tile: Tile): Solid {
  return {
    minX: tile.x - tile.w / 2,
    maxX: tile.x + tile.w / 2,
    minZ: tile.z - tile.d / 2,
    maxZ: tile.z + tile.d / 2,
    top: tile.top,
    bottom: tile.top - tile.h,
    ice: tile.kind === "ice",
  };
}
