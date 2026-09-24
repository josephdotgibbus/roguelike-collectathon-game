import { Game } from "./game/game";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Missing #game canvas");

const game = new Game(canvas);
function frame(now: number): void {
  game.frame(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
