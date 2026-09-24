export type Tile = 0 | 1; // 0 = wall, 1 = floor

export const WALL: Tile = 0;
export const FLOOR: Tile = 1;

export interface Vec {
  x: number;
  y: number;
}

export interface Enemy extends Vec {
  id: number;
  hp: number;
}

export type GameStatus = "playing" | "won" | "dead";

export interface GameState {
  width: number;
  height: number;
  grid: Tile[][];
  player: Vec & { hp: number; maxHp: number };
  gems: Vec[];
  enemies: Enemy[];
  stairs: Vec | null; // appears once all gems on the floor are collected
  floor: number;
  score: number;
  status: GameStatus;
  message: string;
  seed: number;
}
