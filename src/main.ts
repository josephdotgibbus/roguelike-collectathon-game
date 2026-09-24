import "./style.css";
import { createGame, movePlayer } from "./game/game";
import { render } from "./game/render";
import { GameState } from "./game/types";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Canvas 2D context is not available");
}

const statFloor = document.getElementById("stat-floor")!;
const statHp = document.getElementById("stat-hp")!;
const statGems = document.getElementById("stat-gems")!;
const statScore = document.getElementById("stat-score")!;
const statusLine = document.getElementById("status-line")!;
const restartBtn = document.getElementById("restart")!;

let state: GameState = createGame();
let totalGemsThisFloor = state.gems.length;

function syncHud(): void {
  statFloor.textContent = `Floor: ${state.floor}`;
  statHp.textContent = `HP: ${state.player.hp} / ${state.player.maxHp}`;
  const collected = totalGemsThisFloor - state.gems.length;
  statGems.textContent = `Gems: ${collected} / ${totalGemsThisFloor}`;
  statScore.textContent = `Score: ${state.score}`;
  statusLine.textContent = state.message;
}

function draw(): void {
  render(ctx!, state);
  syncHud();
}

function newGame(): void {
  state = createGame();
  totalGemsThisFloor = state.gems.length;
  draw();
}

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  W: [0, -1],
  S: [0, 1],
  A: [-1, 0],
  D: [1, 0],
};

window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    newGame();
    e.preventDefault();
    return;
  }

  const move = MOVES[e.key];
  if (!move) return;
  e.preventDefault();

  const floorBefore = state.floor;
  state = movePlayer(state, move[0], move[1]);
  if (state.floor !== floorBefore) {
    totalGemsThisFloor = state.gems.length;
  }
  draw();
});

restartBtn.addEventListener("click", newGame);

draw();

// Expose state for automated/manual testing hooks.
(window as unknown as { __GAME__: () => GameState }).__GAME__ = () => state;
