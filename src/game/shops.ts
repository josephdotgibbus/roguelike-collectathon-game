import catalog from "./catalog.json";

export type Difficulty = "casual" | "normal" | "extreme";

export type ShopKind = "enemy" | "curse" | "upgrade" | "greater";

export type Stub = {
  id: string;
  name: string;
  blurb: string;
  minLevel: number;
  maxStack?: number;
  prices?: { normal?: number; casual?: number; solo?: number; stacks?: number[] };
  hazard?: "tripmine" | "seamine" | null;
};

export type Offer = {
  id: string;
  name: string;
  blurb: string;
  price: number | null;
};

type Stacks = Record<string, number>;

const CASUAL_LATE: Record<string, number> = {
  NinjaBelt: 500,
  SharkTail: 800,
  SportShoes: 1000,
  GiftMagnet: 750,
  MatrixTetrahedron: 1500,
  MiniatureHourglass: 1500,
  PanicNecklace: 1500,
  GiftIdol: 3000,
  Shield: 2000,
  DrownedAegis: 4000,
};

export const UPGRADES = catalog.upgrades as Stub[];
export const CURSES = catalog.curses as Stub[];
export const GREATER_CURSES = catalog.greaterCurses as Stub[];
export const ENEMIES = catalog.enemies as Stub[];

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function greaterCurseLevel(level: number, difficulty: Difficulty): boolean {
  if (difficulty === "casual") return level === 15 || (level >= 25 && level % 5 === 0);
  if (difficulty === "extreme") return level >= 10 && level % 5 === 0;
  return level === 10 || level === 20 || (level >= 25 && level % 5 === 0);
}

export function curseShopLevel(level: number, difficulty: Difficulty): boolean {
  if (greaterCurseLevel(level, difficulty)) return false;
  if (difficulty === "casual") return level % 3 === 0;
  if (difficulty === "extreme") return level % 10 !== 0;
  if (level <= 25) return level % 2 === 0;
  return level % 10 !== 0;
}

/** Intermission order matches Nullscape: enemies, curses, upgrades, then greater curses. */
export function shopsForLevel(level: number, difficulty: Difficulty): ShopKind[] {
  const shops: ShopKind[] = [];
  if (level === 1 || level % 2 === 0) shops.push("enemy");
  if (curseShopLevel(level, difficulty)) shops.push("curse");
  if (level % 10 === 0 || [3, 5, 8].includes(level % 10)) shops.push("upgrade");
  if (greaterCurseLevel(level, difficulty)) shops.push("greater");
  return shops;
}

export function enemyRerollAllowance(level: number, difficulty: Difficulty): number {
  const base = difficulty === "extreme" ? 4 : 2;
  return base + Math.floor(level / 5);
}

export function curseRerollAllowance(level: number, difficulty: Difficulty): number {
  const base = difficulty === "extreme" ? 5 : 3;
  return base + Math.floor(level / 7);
}

export function upgradePrice(upgrade: Stub, stacks: number, difficulty: Difficulty): number {
  const listed = upgrade.prices ?? {};
  const ladder = listed.stacks;
  let base = ladder ? ladder[Math.min(stacks, ladder.length - 1)] : (listed.normal ?? 0);
  if (difficulty === "casual") base = listed.casual ?? CASUAL_LATE[upgrade.id] ?? base;
  else if (difficulty === "normal") base = listed.solo ?? base;
  else if (base >= 700) base = Math.round(base * 1.35);
  return Math.ceil(base);
}

function available(entries: Stub[], owned: Stacks, level: number, difficulty: Difficulty, ban: string[]): Stub[] {
  return entries.filter((entry) => {
    if (entry.minLevel > level) return false;
    if (ban.includes(entry.id)) return false;
    if (difficulty === "casual" && entry.hazard && entry.id !== "SubspacialBarrier") return false;
    const stacks = owned[entry.id] ?? 0;
    return stacks < (entry.maxStack ?? 1);
  });
}

function pick<T>(rng: () => number, pool: T[], count: number): T[] {
  const copy = [...pool];
  const chosen: T[] = [];
  while (chosen.length < count && copy.length > 0) {
    const index = Math.floor(rng() * copy.length);
    chosen.push(copy.splice(index, 1)[0]);
  }
  return chosen;
}

export function rollOffers(
  kind: ShopKind,
  level: number,
  difficulty: Difficulty,
  owned: Stacks,
  ban: string[],
  rng: () => number,
): Offer[] {
  const pool =
    kind === "enemy"
      ? available(ENEMIES, owned, level, difficulty, ban)
      : kind === "curse"
        ? available(CURSES, owned, level, difficulty, ban)
        : kind === "greater"
          ? GREATER_CURSES.filter((entry) => entry.minLevel <= level && !ban.includes(entry.id) && !owned[entry.id])
          : available(UPGRADES, owned, level, difficulty, ban);
  const count = kind === "upgrade" ? 2 : 3;
  return pick(rng, pool, count).map((entry) => ({
    id: entry.id,
    name: entry.name,
    blurb: entry.blurb || "Stub. No gameplay effect yet.",
    price: kind === "upgrade" ? upgradePrice(entry, owned[entry.id] ?? 0, difficulty) : null,
  }));
}

export function findStub(kind: ShopKind, id: string): Stub | undefined {
  const list = kind === "enemy" ? ENEMIES : kind === "curse" ? CURSES : kind === "greater" ? GREATER_CURSES : UPGRADES;
  return list.find((entry) => entry.id === id);
}
