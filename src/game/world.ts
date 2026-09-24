import * as THREE from "three";
import { generateLevel, tileSolid, type GeneratedLevel, type Pickup, type Tile } from "./generate";
import type { Solid } from "./physics";

const box = new THREE.BoxGeometry(1, 1, 1);

type LiveTile = {
  tile: Tile;
  mesh: THREE.Mesh;
  alive: boolean;
};

type LivePickup = {
  pickup: Pickup;
  mesh: THREE.Object3D;
  baseY: number;
};

export class World {
  solids: Solid[] = [];
  level: GeneratedLevel | null = null;
  private readonly scene: THREE.Scene;
  private readonly tiles: LiveTile[] = [];
  private readonly pickups: LivePickup[] = [];
  private readonly gold: { mesh: THREE.Object3D; x: number; y: number; z: number; taken: boolean }[] = [];
  private readonly adversaries: THREE.Object3D[] = [];
  private readonly stars: THREE.Points;
  private readonly tileMap: THREE.CanvasTexture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tileMap = makeTileTexture();
    this.stars = makeStars();
    scene.add(this.stars);
    addDistantRubble(scene);
  }

  load(level: GeneratedLevel): void {
    this.clearLevel();
    this.level = level;
    for (const tile of level.tiles) {
      const mesh = new THREE.Mesh(box, materialsFor(colorFor(tile.kind), this.tileMap));
      mesh.scale.set(tile.w, tile.h, tile.d);
      mesh.position.set(tile.x, tile.top - tile.h / 2, tile.z);
      this.scene.add(mesh);
      this.tiles.push({ tile, mesh, alive: true });
    }
    for (const pickup of level.pickups) {
      const mesh = makePickup(pickup.kind);
      mesh.position.set(pickup.x, pickup.y, pickup.z);
      this.scene.add(mesh);
      this.pickups.push({ pickup, mesh, baseY: pickup.y });
    }
    this.rebuildSolids();
  }

  /** Preview generator used by the boot path before a run starts. */
  loadPreview(seed = 1): void {
    this.load(generateLevel(1, "normal", mulberry(seed)));
  }

  setAdversaries(names: string[]): void {
    for (const marker of this.adversaries) this.scene.remove(marker);
    this.adversaries.length = 0;
    names.forEach((name, index) => {
      const marker = makeAdversary(name);
      const angle = (index / Math.max(names.length, 1)) * Math.PI * 2;
      marker.position.set(Math.cos(angle) * 3.2, 1.4, Math.sin(angle) * 3.2);
      this.scene.add(marker);
      this.adversaries.push(marker);
    });
  }

  pickupAt(x: number, z: number, radius: number): Pickup | null {
    for (const live of this.pickups) {
      if (!live.mesh.visible) continue;
      const dx = live.pickup.x - x;
      const dz = live.pickup.z - z;
      if (dx * dx + dz * dz <= radius * radius) return live.pickup;
    }
    return null;
  }

  takePickup(id: number): void {
    const live = this.pickups.find((entry) => entry.pickup.id === id);
    if (live) live.mesh.visible = false;
  }

  spawnGold(spots: { x: number; y: number; z: number }[], valueEach: number): void {
    for (const spot of spots) {
      const mesh = makePickup("gold");
      mesh.position.set(spot.x, spot.y, spot.z);
      mesh.userData.value = valueEach;
      this.scene.add(mesh);
      this.gold.push({ mesh, x: spot.x, y: spot.y, z: spot.z, taken: false });
    }
  }

  takeGold(x: number, z: number, radius: number): number {
    let gained = 0;
    for (const gift of this.gold) {
      if (gift.taken) continue;
      const dx = gift.x - x;
      const dz = gift.z - z;
      if (dx * dx + dz * dz > radius * radius) continue;
      gift.taken = true;
      gift.mesh.visible = false;
      gained += Number(gift.mesh.userData.value ?? 1);
    }
    return gained;
  }

  fallTiles(throughRank: number): void {
    let changed = false;
    for (const live of this.tiles) {
      if (!live.alive || live.tile.fallRank === 0 || live.tile.fallRank > throughRank) continue;
      live.alive = false;
      live.mesh.visible = false;
      for (const pickup of this.pickups) {
        if (pickup.pickup.tileId === live.tile.id) pickup.mesh.visible = false;
      }
      for (const gift of this.gold) {
        if (Math.hypot(gift.x - live.tile.x, gift.z - live.tile.z) < Math.max(live.tile.w, live.tile.d)) {
          gift.taken = true;
          gift.mesh.visible = false;
        }
      }
      changed = true;
    }
    if (changed) this.rebuildSolids();
  }

  onBeacon(x: number, z: number): boolean {
    const beacon = this.tiles.find((live) => live.tile.kind === "beacon");
    if (!beacon) return false;
    const tile = beacon.tile;
    return Math.abs(x - tile.x) <= tile.w / 2 - 0.3 && Math.abs(z - tile.z) <= tile.d / 2 - 0.3;
  }

  update(time: number, camera?: THREE.Camera): void {
    this.stars.rotation.y = time * 0.012;
    for (const live of this.pickups) {
      if (!live.mesh.visible) continue;
      live.mesh.position.y = live.baseY + 0.85 + Math.sin(time * 2.2 + live.pickup.id) * 0.12;
      live.mesh.rotation.y = time * 0.8;
    }
    for (const gift of this.gold) {
      if (gift.taken) continue;
      gift.mesh.position.y = gift.y + 0.85 + Math.sin(time * 3 + gift.x) * 0.1;
      gift.mesh.rotation.y = time;
    }
    for (const marker of this.adversaries) {
      const y = 1.4 + Math.sin(time * 1.5 + marker.position.x) * 0.08;
      marker.position.y = y;
      if (camera) marker.lookAt(camera.position.x, y, camera.position.z);
    }
  }

  private rebuildSolids(): void {
    this.solids = this.tiles.filter((live) => live.alive).map((live) => tileSolid(live.tile));
  }

  private clearLevel(): void {
    for (const live of this.tiles) this.scene.remove(live.mesh);
    for (const live of this.pickups) this.scene.remove(live.mesh);
    for (const gift of this.gold) this.scene.remove(gift.mesh);
    for (const marker of this.adversaries) this.scene.remove(marker);
    this.tiles.length = 0;
    this.pickups.length = 0;
    this.gold.length = 0;
    this.adversaries.length = 0;
    this.solids = [];
  }
}

function mulberry(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    return (state >>> 8) / 16777216;
  };
}

function colorFor(kind: Tile["kind"]): number {
  if (kind === "beacon") return 0xf0c14a;
  if (kind === "ice") return 0x9fd7ff;
  if (kind === "highrise") return 0xc9843a;
  return 0x7c5cff;
}

function materialsFor(color: number, tileMap: THREE.CanvasTexture): THREE.Material[] {
  const base = new THREE.Color(color);
  const top = base.clone().lerp(new THREE.Color("#ffffff"), 0.16);
  const side = base.clone().multiplyScalar(0.58);
  const bottom = base.clone().multiplyScalar(0.34);
  return [
    new THREE.MeshStandardMaterial({ color: side, roughness: 0.94 }),
    new THREE.MeshStandardMaterial({ color: side, roughness: 0.94 }),
    new THREE.MeshStandardMaterial({ color: top, map: tileMap, roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: bottom, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: side, roughness: 0.94 }),
    new THREE.MeshStandardMaterial({ color: side, roughness: 0.94 }),
  ];
}

function makePickup(kind: "gift" | "gold" | "tripmine" | "seamine"): THREE.Group {
  const group = new THREE.Group();
  if (kind === "seamine") {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2438, roughness: 0.45, metalness: 0.4 }),
    );
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.06, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xff3355, emissive: 0xff3355, emissiveIntensity: 0.6 }),
    );
    band.rotation.x = Math.PI / 2;
    group.add(ball, band);
    return group;
  }
  const present = kind === "gift" ? 0x16141c : kind === "gold" ? 0xf0c14a : 0xff3355;
  const ribbon = kind === "gift" ? 0xb44dff : kind === "gold" ? 0xfff1c2 : 0xffd0d6;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.62, 0.62),
    new THREE.MeshStandardMaterial({
      color: present,
      roughness: 0.4,
      metalness: kind === "gold" ? 0.35 : 0.05,
      emissive: kind === "gift" ? 0x6a2ca8 : kind === "gold" ? 0x8a6410 : 0x8a1020,
      emissiveIntensity: 0.55,
    }),
  );
  const wrap = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: ribbon, emissive: ribbon, emissiveIntensity: 0.35 }),
  );
  const bow = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.28, 0.66),
    new THREE.MeshStandardMaterial({ color: ribbon, emissive: ribbon, emissiveIntensity: 0.35 }),
  );
  group.add(body, wrap, bow);
  if (kind === "gift" || kind === "gold") {
    const light = new THREE.PointLight(kind === "gift" ? 0xb44dff : 0xf0c14a, 1.4, 4.5, 2);
    light.position.y = 0.4;
    group.add(light);
  }
  return group;
}

function makeAdversary(name: string): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({
      color: 0xae1313,
      emissive: 0xae1313,
      emissiveIntensity: 0.45,
      roughness: 0.4,
    }),
  );
  group.add(body);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#2a0a10";
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = "#ae1313";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 58);
    ctx.fillStyle = "#ffe8ea";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name.slice(0, 16), 128, 42);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.52),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false }),
  );
  label.position.y = 0.85;
  group.add(label);
  group.userData.label = label;
  return group;
}

function makeTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the tile canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(0,0,0,0.38)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 58, 58);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, 46, 46);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function makeStars(): THREE.Points {
  const count = 280;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const radius = 36 + Math.random() * 48;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.random() * 28 + 2;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffd6f6,
      size: 0.18,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      fog: false,
    }),
  );
}

function addDistantRubble(scene: THREE.Scene): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x2a2140, roughness: 1, flatShading: true });
  for (let i = 0; i < 10; i++) {
    const mesh = new THREE.Mesh(box, material);
    const theta = (i / 10) * Math.PI * 2 + 0.4;
    const radius = 34 + (i % 3) * 4;
    mesh.scale.set(1.2 + (i % 3), 0.6 + (i % 2) * 0.4, 1.4);
    mesh.position.set(Math.cos(theta) * radius, -2 - (i % 4), Math.sin(theta) * radius);
    mesh.rotation.y = theta;
    scene.add(mesh);
  }
}
