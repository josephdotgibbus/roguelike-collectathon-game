/** Logical pixel rows. `.` is empty. Other characters are palette keys in spriteSheet.ts. */

export const FRAME_WIDTH = 16;

export type SpriteFrame = {
  name: "idle" | "blink" | "run" | "jump" | "fall";
  rows: string[];
  lift: number;
};

const BODY = [
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "....HHhhhhHH....",
  "...HHSSSSSSHH...",
  "...HHSWEEWSHH...",
  "...HHSSSSSSHH...",
  "....HSSCCSSH....",
  ".....HSSSSH.....",
  "......JJJJ......",
  ".....JJAAJJ.....",
  ".....JJAAGJ.....",
  ".....JJAAJJ.....",
  "......jjjj......",
];

const BLINK_BODY = BODY.map((row, index) => (index === 4 ? "...HHSSSSSSHH..." : row));

const JUMP_BODY = BODY.map((row, index) => {
  if (index === 6) return "..S.HSSCCSSH.S..";
  if (index === 7) return "..S..HSSSSH..S..";
  return row;
});

const LEGS_STAND = [
  "................",
  "......P..P......",
  "......P..P......",
  "......B..B......",
];

const LEGS_LEFT = [
  "......P.........",
  "......B..P......",
  ".........P......",
  ".........B......",
];

const LEGS_PASS = [
  "................",
  ".......PP.......",
  "......P..P......",
  "......B..B......",
];

const LEGS_RIGHT = [
  ".........P......",
  "......P..B......",
  "......P.........",
  "......B.........",
];

const LEGS_TUCK = [
  "......P..P......",
  ".....B....B.....",
  "................",
  "................",
];

const LEGS_FALL = [
  "................",
  "......P..P......",
  ".....B....B.....",
  "................",
];

function frame(name: SpriteFrame["name"], body: string[], legs: string[], lift = 0): SpriteFrame {
  return { name, rows: [...body, ...legs], lift };
}

export const SPRITE_FRAMES: SpriteFrame[] = [
  frame("idle", BODY, LEGS_STAND),
  frame("blink", BLINK_BODY, LEGS_STAND),
  frame("run", BODY, LEGS_LEFT, 0),
  frame("run", BODY, LEGS_PASS, 1),
  frame("run", BODY, LEGS_RIGHT, 0),
  frame("run", BODY, LEGS_PASS, 1),
  frame("jump", JUMP_BODY, LEGS_TUCK),
  frame("fall", BODY, LEGS_FALL),
];
