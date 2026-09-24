import { Game } from "./game/game";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const overlay = document.querySelector<HTMLElement>("#overlay");
const hud = document.querySelector<HTMLElement>("#hud");
if (!canvas || !overlay || !hud) throw new Error("Missing game UI");

const game = new Game(canvas, overlay, hud);
function frame(now: number): void {
  game.frame(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
