export class Input {
  private readonly keys = new Set<string>();
  private jumpQueued = false;

  constructor() {
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space" || event.code.startsWith("Arrow")) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === "Space") this.jumpQueued = true;
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener("blur", () => {
      this.keys.clear();
    });
  }

  consumeJump(): boolean {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  get jumpHeld(): boolean {
    return this.keys.has("Space");
  }

  /** x is strafe (right positive), y is forward (away from the camera positive). */
  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y -= 1;
    return { x, y };
  }
}
