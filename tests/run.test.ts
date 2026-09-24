import { describe, expect, it } from "vitest";
import { generateLevel, giftBudget, iceLevel, tripmineLevel } from "../src/game/generate";
import {
  curseShopLevel,
  greaterCurseLevel,
  mulberry32,
  rollOffers,
  shopsForLevel,
  upgradePrice,
  UPGRADES,
} from "../src/game/shops";

describe("nullscape intermissions", () => {
  it("opens level 1 with an adversary choice and no shop on level 2 casual curses yet", () => {
    expect(shopsForLevel(1, "normal")).toEqual(["enemy"]);
    expect(shopsForLevel(2, "normal")).toEqual(["enemy", "curse"]);
    expect(shopsForLevel(3, "normal")).toEqual(["upgrade"]);
    expect(shopsForLevel(3, "casual")).toEqual(["curse", "upgrade"]);
    expect(shopsForLevel(10, "normal")).toEqual(["enemy", "upgrade", "greater"]);
    expect(curseShopLevel(10, "extreme")).toBe(false);
    expect(greaterCurseLevel(10, "extreme")).toBe(true);
    expect(greaterCurseLevel(15, "casual")).toBe(true);
    expect(shopsForLevel(4, "extreme")).toEqual(["enemy", "curse"]);
  });

  it("sells stubs with casual discounts and extreme late prices", () => {
    const belt = UPGRADES.find((entry) => entry.id === "NinjaBelt");
    expect(belt).toBeTruthy();
    if (!belt) return;
    expect(upgradePrice(belt, 0, "casual")).toBe(500);
    expect(upgradePrice(belt, 0, "normal")).toBe(500);
    expect(upgradePrice(belt, 0, "extreme")).toBe(945);
    const offers = rollOffers("upgrade", 5, "normal", {}, [], mulberry32(2));
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((offer) => offer.price !== null)).toBe(true);
  });
});

describe("level generation", () => {
  it("grows the gift hunt and withholds mines and ice until their levels", () => {
    const early = generateLevel(1, "normal", mulberry32(4));
    const later = generateLevel(12, "normal", mulberry32(4));
    expect(early.giftCount).toBeGreaterThan(0);
    expect(early.giftCount).toBeLessThanOrEqual(giftBudget(1));
    expect(later.tiles.length).toBeGreaterThan(early.tiles.length);
    expect(later.giftCount).toBeGreaterThan(early.giftCount);
    expect(early.tiles.some((tile) => tile.kind === "ice")).toBe(false);
    expect(early.pickups.some((pickup) => pickup.kind !== "gift")).toBe(false);

    const casual = generateLevel(20, "casual", mulberry32(9));
    expect(casual.pickups.some((pickup) => pickup.kind === "tripmine")).toBe(false);
    expect(casual.tiles.some((tile) => tile.kind === "highrise")).toBe(true);

    let sawIce = false;
    let sawMine = false;
    for (let seed = 1; seed <= 12; seed += 1) {
      const extreme = generateLevel(iceLevel("extreme"), "extreme", mulberry32(seed));
      if (extreme.tiles.some((tile) => tile.kind === "ice")) sawIce = true;
      if (extreme.pickups.some((pickup) => pickup.kind === "tripmine")) sawMine = true;
    }
    expect(tripmineLevel("casual")).toBeNull();
    expect(sawIce).toBe(true);
    expect(sawMine).toBe(true);
  });
});
