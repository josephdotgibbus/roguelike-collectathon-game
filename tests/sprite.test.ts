import { describe, expect, it } from "vitest";
import { FRAME_WIDTH, SPRITE_FRAMES } from "../src/game/spriteFrames";

describe("player sprite", () => {
  it("has idle, run, jump, and fall frames with equal rows", () => {
    expect(SPRITE_FRAMES.map((frame) => frame.name)).toEqual([
      "idle",
      "blink",
      "run",
      "run",
      "run",
      "run",
      "jump",
      "fall",
    ]);
    for (const frame of SPRITE_FRAMES) {
      expect(frame.rows.length).toBe(SPRITE_FRAMES[0].rows.length);
      for (const row of frame.rows) expect(row).toHaveLength(FRAME_WIDTH);
    }
  });
});
