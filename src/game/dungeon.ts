import { FLOOR, Tile, Vec, WALL } from "./types";
import { Rng, randInt } from "./rng";

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dungeon {
  grid: Tile[][];
  rooms: Room[];
}

function center(room: Room): Vec {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function roomsOverlap(a: Room, b: Room): boolean {
  // Treat rooms as overlapping if they touch (1-tile gap enforced) so walls remain between them.
  return (
    a.x - 1 <= b.x + b.w &&
    a.x + a.w + 1 >= b.x &&
    a.y - 1 <= b.y + b.h &&
    a.y + a.h + 1 >= b.y
  );
}

function carveRoom(grid: Tile[][], room: Room): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      grid[y][x] = FLOOR;
    }
  }
}

function carveHCorridor(grid: Tile[][], x1: number, x2: number, y: number): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    grid[y][x] = FLOOR;
  }
}

function carveVCorridor(grid: Tile[][], y1: number, y2: number, x: number): void {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
    grid[y][x] = FLOOR;
  }
}

/**
 * Generate a connected dungeon of non-overlapping rooms joined by L-shaped
 * corridors. Guaranteed connectivity because every new room is linked to the
 * previously placed one.
 */
export function generateDungeon(
  width: number,
  height: number,
  rng: Rng,
  maxRooms = 10,
): Dungeon {
  const grid: Tile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => WALL),
  );

  const rooms: Room[] = [];

  for (let i = 0; i < maxRooms * 3 && rooms.length < maxRooms; i++) {
    const w = randInt(rng, 3, 6);
    const h = randInt(rng, 3, 6);
    const x = randInt(rng, 1, width - w - 2);
    const y = randInt(rng, 1, height - h - 2);
    const candidate: Room = { x, y, w, h };

    if (rooms.some((r) => roomsOverlap(candidate, r))) {
      continue;
    }

    carveRoom(grid, candidate);

    if (rooms.length > 0) {
      const prev = center(rooms[rooms.length - 1]);
      const cur = center(candidate);
      if (rng() < 0.5) {
        carveHCorridor(grid, prev.x, cur.x, prev.y);
        carveVCorridor(grid, prev.y, cur.y, cur.x);
      } else {
        carveVCorridor(grid, prev.y, cur.y, prev.x);
        carveHCorridor(grid, prev.x, cur.x, cur.y);
      }
    }

    rooms.push(candidate);
  }

  return { grid, rooms };
}

/** Collect every floor tile as a coordinate list. */
export function floorTiles(grid: Tile[][]): Vec[] {
  const tiles: Vec[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === FLOOR) tiles.push({ x, y });
    }
  }
  return tiles;
}
