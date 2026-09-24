import * as THREE from "three";
import { Input } from "./input";
import { SPAWN } from "./level";
import { Player } from "./player";
import { World } from "./world";

const CAMERA_OFFSET = new THREE.Vector3(0, 18, 14);

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly input = new Input();
  private readonly world: World;
  private readonly player: Player;
  private readonly glow: THREE.PointLight;
  private readonly lookTarget = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private last = 0;
  private time = 0;
  private snapCamera = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color(0x100814);
    this.scene.fog = new THREE.FogExp2(0x100814, 0.016);

    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 220);
    this.scene.add(new THREE.HemisphereLight(0xc7b4ff, 0x1a1024, 0.7));
    const key = new THREE.DirectionalLight(0xfff1dd, 1.45);
    key.position.set(-14, 26, 12);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x7a5cff, 0.4);
    fill.position.set(12, 8, -14);
    this.scene.add(fill);
    this.glow = new THREE.PointLight(0xff8ad4, 3.2, 16, 2);
    this.scene.add(this.glow);

    this.world = new World(this.scene);
    this.player = new Player(this.scene, SPAWN);
    this.camera.position.set(SPAWN.x, SPAWN.y + CAMERA_OFFSET.y, SPAWN.z + CAMERA_OFFSET.z);
    this.camera.lookAt(SPAWN.x, SPAWN.y + 1.1, SPAWN.z);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  frame(now: number): void {
    if (this.last === 0) {
      this.last = now;
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.time += dt;

    const position = this.player.position;
    const desired = new THREE.Vector3(position.x, position.y, position.z).add(CAMERA_OFFSET);
    if (this.snapCamera) {
      this.camera.position.copy(desired);
      this.snapCamera = false;
    } else {
      this.camera.position.lerp(desired, 1 - Math.pow(0.0008, dt));
    }
    this.lookTarget.set(position.x, position.y + 1.1, position.z);
    this.camera.lookAt(this.lookTarget);

    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.camera.up).normalize();

    const axis = this.input.axis();
    this.wish.copy(this.right).multiplyScalar(axis.x).addScaledVector(this.forward, axis.y);

    this.player.update(
      dt,
      this.world.solids,
      this.camera,
      this.wish.x,
      this.wish.z,
      this.input.consumeJump(),
      this.input.jumpHeld,
      axis.x,
      SPAWN,
    );
    this.world.update(this.time);
    const feet = this.player.position;
    this.glow.position.set(feet.x, feet.y + 1.6, feet.z);

    this.renderer.render(this.scene, this.camera);
  }
}
