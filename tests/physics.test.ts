import { describe, expect, it } from "vitest";
import { levelSolids } from "../src/game/level";
import { createLocomotion, surfaceBelow, tick, type TickInput } from "../src/game/physics";

const solids = levelSolids();

function run(
  loc: ReturnType<typeof createLocomotion>,
  seconds: number,
  input: Omit<TickInput, "dt" | "jumpPressed"> & { jumpAtX?: number },
): void {
  const dt = 1 / 60;
  let jumped = false;
  for (let t = 0; t < seconds; t += dt) {
    const jumpPressed = input.jumpAtX !== undefined && !jumped && loc.body.x >= input.jumpAtX;
    if (jumpPressed) jumped = true;
    tick(loc, solids, {
      wishX: input.wishX,
      wishZ: input.wishZ,
      jumpHeld: input.jumpHeld,
      jumpPressed,
      dt,
    });
  }
}

describe("platform movement", () => {
  it("stands on the hub", () => {
    const loc = createLocomotion(0, 0, 0);
    run(loc, 0.5, { wishX: 0, wishZ: 0, jumpHeld: false });
    expect(loc.body.y).toBe(0);
    expect(loc.body.grounded).toBe(true);
  });

  it("walks up the north steps", () => {
    const loc = createLocomotion(0, 0, -4);
    run(loc, 1.6, { wishX: 0, wishZ: -1, jumpHeld: false });
    expect(loc.body.z).toBeLessThan(-8);
    expect(loc.body.y).toBeGreaterThanOrEqual(0.35);
    expect(loc.body.grounded).toBe(true);
  });

  it("jumps and lands", () => {
    const loc = createLocomotion(0, 0, 0);
    tick(loc, solids, { wishX: 0, wishZ: 0, jumpPressed: true, jumpHeld: true, dt: 1 / 60 });
    expect(loc.body.vy).toBeGreaterThan(0);
    expect(loc.body.grounded).toBe(false);
    run(loc, 1.2, { wishX: 0, wishZ: 0, jumpHeld: false });
    expect(loc.body.grounded).toBe(true);
    expect(loc.body.y).toBe(0);
  });

  it("clears the east gap with a running jump", () => {
    const loc = createLocomotion(13, 0.4, 1);
    const dt = 1 / 60;
    let jumped = false;
    let landed: { x: number; y: number } | null = null;
    for (let t = 0; t < 2.4 && !landed; t += dt) {
      const jumpPressed = !jumped && loc.body.x >= 16.6;
      if (jumpPressed) jumped = true;
      tick(loc, solids, { wishX: 1, wishZ: 0, jumpHeld: true, jumpPressed, dt });
      if (jumped && loc.body.grounded && loc.body.x > 21) {
        landed = { x: loc.body.x, y: loc.body.y };
      }
    }
    expect(landed).not.toBeNull();
    expect(landed!.x).toBeGreaterThan(21);
    expect(landed!.x).toBeLessThan(28);
    expect(landed!.y).toBeCloseTo(0.6, 1);
  });

  it("cannot walk through the north pillar", () => {
    const loc = createLocomotion(3.2, 1.2, -20.4);
    run(loc, 1, { wishX: 0, wishZ: -1, jumpHeld: false });
    expect(loc.body.z).toBeGreaterThan(-21.4);
    expect(loc.body.y).toBe(1.2);
  });

  it("falls when there is no floor", () => {
    const loc = createLocomotion(40, 2, 40);
    run(loc, 0.6, { wishX: 0, wishZ: 0, jumpHeld: false });
    expect(loc.body.y).toBeLessThan(-2);
    expect(loc.body.grounded).toBe(false);
  });

  it("places the 3D shadow on the surface under the player", () => {
    expect(surfaceBelow(0, 0, 2, solids)).toBe(0);
    expect(surfaceBelow(24.5, 1, 3, solids)).toBe(0.6);
    expect(surfaceBelow(40, 40, 2, solids)).toBeNull();
  });
});
