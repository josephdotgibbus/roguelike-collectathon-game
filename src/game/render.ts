import { FLOOR, GameState } from "./types";

const COLORS = {
  wall: "#161a33",
  wallEdge: "#20264a",
  floor: "#0b0d1c",
  floorGrid: "#12152b",
  player: "#4dd2ff",
  enemy: "#ff5d73",
  gem: "#7cff9b",
  stairs: "#c58bff",
};

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const cell = Math.floor(Math.min(cw / state.width, ch / state.height));

  ctx.clearRect(0, 0, cw, ch);

  // Tiles.
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const px = x * cell;
      const py = y * cell;
      if (state.grid[y][x] === FLOOR) {
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(px, py, cell, cell);
        ctx.strokeStyle = COLORS.floorGrid;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
      } else {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, cell, cell);
        ctx.strokeStyle = COLORS.wallEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
      }
    }
  }

  // Stairs.
  if (state.stairs) {
    drawGlyph(ctx, state.stairs.x, state.stairs.y, cell, COLORS.stairs, ">");
  }

  // Gems.
  ctx.fillStyle = COLORS.gem;
  for (const gem of state.gems) {
    drawDiamond(ctx, gem.x, gem.y, cell, COLORS.gem);
  }

  // Enemies.
  for (const enemy of state.enemies) {
    drawCircle(ctx, enemy.x, enemy.y, cell, COLORS.enemy);
  }

  // Player.
  drawCircle(ctx, state.player.x, state.player.y, cell, COLORS.player);
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cell: number,
  color: string,
): void {
  const cx = gx * cell + cell / 2;
  const cy = gy * cell + cell / 2;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cell: number,
  color: string,
): void {
  const cx = gx * cell + cell / 2;
  const cy = gy * cell + cell / 2;
  const r = cell * 0.3;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cell: number,
  color: string,
  glyph: string,
): void {
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(cell * 0.8)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, gx * cell + cell / 2, gy * cell + cell / 2 + 1);
}
