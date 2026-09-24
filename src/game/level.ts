import type { Solid } from "./physics";

export type Block = {
  x: number;
  z: number;
  w: number;
  d: number;
  /** World Y of the top face. */
  top: number;
  /** Vertical thickness. */
  h: number;
  color: number;
};

export type Flower = {
  x: number;
  z: number;
  y: number;
  color: number;
};

const VIOLET = 0x7c5cff;
const MAGENTA = 0xff4d8d;
const TEAL = 0x2ec9c0;
const GOLD = 0xf0c14a;
const CORAL = 0xff7a59;
const BLUE = 0x6aa6ff;
const LIME = 0x8ed36a;
const STONE = 0x3c3558;
const WOOD = 0xc9843a;

function slab(
  x: number,
  z: number,
  w: number,
  d: number,
  top: number,
  color: number,
  h = 0.8,
): Block {
  return { x, z, w, d, top, h, color };
}

/** Connected walkways, a few jumps, and two solid props. */
export const BLOCKS: Block[] = [
  slab(0, 0, 12, 12, 0, VIOLET),
  slab(0, -9, 6, 6, 0.35, MAGENTA),
  slab(0, -15, 6, 6, 0.75, CORAL),
  slab(1, -21.5, 8, 7, 1.2, GOLD),
  slab(9, 0, 6, 6, 0.2, TEAL),
  slab(15, 1, 6, 6, 0.4, BLUE),
  slab(24.5, 1, 7, 7, 0.6, MAGENTA),
  slab(19.6, -1.7, 2.6, 2.6, -1, LIME, 0.5),
  slab(-9, 1, 6, 6, -0.1, LIME),
  slab(-15.5, -1, 7, 7, -0.1, TEAL),
  slab(-15.5, -7.5, 6, 6.2, 1.05, GOLD),
  slab(0, 9, 6, 6, 0.15, CORAL),
  slab(-5, 15, 6, 6, 0.55, BLUE),
  slab(5, 15, 6, 6, 0.55, BLUE),
  slab(0, 21.2, 8, 7, 1.4, VIOLET),
  slab(9, -8.2, 6, 6, 1.1, GOLD),
  // Pillar standing on the north overlook.
  slab(3.2, -22.2, 1.2, 1.2, 3.2, STONE, 2),
  // Crate on the west garden.
  slab(-17.6, 0.6, 1.15, 1.15, 1.05, WOOD, 1.15),
];

export const FLOWERS: Flower[] = [
  { x: 3.8, z: 3.8, y: 0, color: 0xff4d8d },
  { x: -3.7, z: -3.5, y: 0, color: 0xffd36a },
  { x: -0.6, z: -23.6, y: 1.2, color: 0xfff4fb },
  { x: -13.2, z: -2.5, y: -0.1, color: 0x7af0ff },
  { x: 0.2, z: 23.5, y: 1.4, color: 0xff7ad1 },
  { x: 26.4, z: 2.8, y: 0.6, color: 0xc6f57a },
];

export const SPAWN = { x: 0, y: 0, z: 0 };

export function blockSolid(block: Block): Solid {
  return {
    minX: block.x - block.w / 2,
    maxX: block.x + block.w / 2,
    minZ: block.z - block.d / 2,
    maxZ: block.z + block.d / 2,
    top: block.top,
    bottom: block.top - block.h,
  };
}

export function levelSolids(): Solid[] {
  return BLOCKS.map(blockSolid);
}
