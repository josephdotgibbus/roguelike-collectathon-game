import { describe, expect, it } from "vitest";
import { makeRng, pick, randInt } from "../src/game/rng";

describe("rng", () => {
  it("is deterministic for a fixed seed", () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different streams for different seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(a()).not.toEqual(b());
  });

  it("returns values in [0, 1)", () => {
    const rng = makeRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randInt stays within inclusive bounds", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = randInt(rng, 3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("pick returns an element from the array", () => {
    const rng = makeRng(42);
    const items = ["a", "b", "c"];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(pick(rng, items));
    }
  });
});
