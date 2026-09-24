import * as THREE from "three";
import { SPRITE_FRAMES } from "./spriteFrames";
import { createSpriteTexture, FRAME_PIXEL_H, FRAME_PIXEL_W } from "./spriteSheet";
import { createLocomotion, surfaceBelow, tick, type Locomotion, type Solid } from "./physics";

const SPRITE_HEIGHT = 2.55;
const FRAME_COUNT = SPRITE_FRAMES.length;
const RUN_FRAMES = [2, 3, 4, 5];

export class Player {
  readonly locomotion: Locomotion;
  private readonly sprite: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly shadow: THREE.Mesh;
  private readonly shadowMaterial: THREE.MeshBasicMaterial;
  private facing = 1;
  private animTime = 0;
  private frame = 0;
  private squash = 1;
  private squashVel = 0;
  private respawnBlink = 0;

  constructor(scene: THREE.Scene, spawn: { x: number; y: number; z: number }) {
    this.locomotion = createLocomotion(spawn.x, spawn.y, spawn.z);
    const texture = createSpriteTexture();
    texture.repeat.set(1 / FRAME_COUNT, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.5,
      fog: false,
    });
    const geometry = new THREE.PlaneGeometry(SPRITE_HEIGHT * (FRAME_PIXEL_W / FRAME_PIXEL_H), SPRITE_HEIGHT);
    geometry.translate(0, 0.5, 0);
    this.sprite = new THREE.Mesh(geometry, this.material);
    this.sprite.position.set(spawn.x, spawn.y, spawn.z);
    scene.add(this.sprite);

    this.shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const shadowGeo = new THREE.PlaneGeometry(1.7, 1.7);
    shadowGeo.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(shadowGeo, this.shadowMaterial);
    this.shadow.renderOrder = 2;
    this.shadow.position.set(spawn.x, spawn.y + 0.04, spawn.z);
    scene.add(this.shadow);
  }

  get position(): { x: number; y: number; z: number } {
    return this.locomotion.body;
  }

  respawn(spawn: { x: number; y: number; z: number }): void {
    const body = this.locomotion.body;
    body.x = spawn.x;
    body.y = spawn.y;
    body.z = spawn.z;
    body.vx = 0;
    body.vy = 0;
    body.vz = 0;
    body.grounded = true;
    this.respawnBlink = 0.45;
  }

  update(
    dt: number,
    solids: Solid[],
    camera: THREE.Camera,
    wishX: number,
    wishZ: number,
    jumpPressed: boolean,
    jumpHeld: boolean,
    strafe: number,
    spawn: { x: number; y: number; z: number },
  ): void {
    const before = this.locomotion.body.grounded;
    tick(this.locomotion, solids, { wishX, wishZ, jumpPressed, jumpHeld, dt });
    const body = this.locomotion.body;

    if (body.y < -12) this.respawn(spawn);

    if (!before && body.grounded) {
      this.squash = 0.72;
      this.squashVel = 0;
    }

    const spring = (1 - this.squash) * 46;
    this.squashVel += spring * dt;
    this.squashVel *= Math.pow(0.0015, dt);
    this.squash += this.squashVel * dt;

    if (Math.abs(strafe) > 0.1) this.facing = strafe > 0 ? 1 : -1;
    this.frame = this.pickFrame(dt, Math.hypot(body.vx, body.vz));
    this.applyFrame();

    const dx = camera.position.x - body.x;
    const dz = camera.position.z - body.z;
    this.sprite.rotation.set(0, Math.atan2(dx, dz), 0);
    this.sprite.position.set(body.x, body.y, body.z);
    const width = SPRITE_HEIGHT * (FRAME_PIXEL_W / FRAME_PIXEL_H);
    this.sprite.scale.set(width > 0 ? 1 / Math.max(this.squash, 0.4) : 1, Math.max(this.squash, 0.4), 1);
    this.sprite.visible = this.respawnBlink <= 0 || Math.sin(this.respawnBlink * 46) > 0;
    if (this.respawnBlink > 0) this.respawnBlink -= dt;

    this.updateShadow(solids);
  }

  private pickFrame(dt: number, speed: number): number {
    const body = this.locomotion.body;
    this.animTime += dt;
    if (!body.grounded) return body.vy > 0.4 ? 6 : 7;
    if (speed > 0.6) {
      const index = Math.floor(this.animTime * (8 + speed)) % RUN_FRAMES.length;
      return RUN_FRAMES[index];
    }
    return Math.floor(this.animTime * 2.2) % 2 === 0 ? 0 : 1;
  }

  private applyFrame(): void {
    const map = this.material.map;
    if (!map) return;
    if (this.facing >= 0) {
      map.repeat.x = 1 / FRAME_COUNT;
      map.offset.x = this.frame / FRAME_COUNT;
    } else {
      map.repeat.x = -1 / FRAME_COUNT;
      map.offset.x = (this.frame + 1) / FRAME_COUNT;
    }
  }

  private updateShadow(solids: Solid[]): void {
    const body = this.locomotion.body;
    const surface = surfaceBelow(body.x, body.z, body.y, solids);
    if (surface === null || body.y - surface > 12) {
      this.shadow.visible = false;
      return;
    }
    const height = Math.max(0, body.y - surface);
    const t = Math.min(height / 5, 1);
    const scale = 1 - t * 0.55;
    this.shadow.visible = true;
    this.shadow.scale.set(scale, scale, scale);
    this.shadow.position.set(body.x, surface + 0.045, body.z);
    this.shadowMaterial.opacity = 0.55 * (1 - t * 0.82);
  }
}

function shadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the shadow canvas");
  const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  gradient.addColorStop(0, "rgba(10,6,18,0.95)");
  gradient.addColorStop(0.45, "rgba(10,6,18,0.5)");
  gradient.addColorStop(1, "rgba(10,6,18,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
