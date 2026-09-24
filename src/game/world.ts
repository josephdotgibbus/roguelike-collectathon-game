import * as THREE from "three";
import { BLOCKS, FLOWERS, blockSolid } from "./level";
import type { Solid } from "./physics";

const box = new THREE.BoxGeometry(1, 1, 1);

export class World {
  readonly solids: Solid[];
  private readonly flowers: THREE.Group[] = [];
  private readonly stars: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.solids = BLOCKS.map(blockSolid);
    const tileMap = makeTileTexture();
    const materials = new Map<number, THREE.Material[]>();

    for (const block of BLOCKS) {
      const mesh = new THREE.Mesh(box, materialsFor(block.color, tileMap, materials));
      mesh.scale.set(block.w, block.h, block.d);
      mesh.position.set(block.x, block.top - block.h / 2, block.z);
      scene.add(mesh);
    }

    for (const flower of FLOWERS) {
      const group = makeFlower(flower.color);
      group.position.set(flower.x, flower.y, flower.z);
      scene.add(group);
      this.flowers.push(group);
    }

    this.stars = makeStars();
    scene.add(this.stars);
    addDistantRubble(scene);
  }

  update(time: number): void {
    this.stars.rotation.y = time * 0.012;
    this.flowers.forEach((flower, index) => {
      flower.rotation.y = time * 0.4 + index;
      flower.rotation.z = Math.sin(time * 1.3 + index) * 0.06;
    });
  }
}

function materialsFor(
  color: number,
  tileMap: THREE.CanvasTexture,
  cache: Map<number, THREE.Material[]>,
): THREE.Material[] {
  const cached = cache.get(color);
  if (cached) return cached;
  const base = new THREE.Color(color);
  const top = base.clone().lerp(new THREE.Color("#ffffff"), 0.16);
  const side = base.clone().multiplyScalar(0.58);
  const bottom = base.clone().multiplyScalar(0.34);
  const topMat = new THREE.MeshStandardMaterial({
    color: top,
    map: tileMap,
    roughness: 0.88,
    metalness: 0.02,
  });
  const sideMat = new THREE.MeshStandardMaterial({ color: side, roughness: 0.94, metalness: 0 });
  const bottomMat = new THREE.MeshStandardMaterial({ color: bottom, roughness: 1, metalness: 0 });
  const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
  cache.set(color, materials);
  return materials;
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

function makeFlower(color: number): THREE.Group {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.34, 0.42, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.9, flatShading: true }),
  );
  pot.position.y = 0.21;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, 0.72, 5),
    new THREE.MeshStandardMaterial({ color: 0x1f8a4c, roughness: 0.8, flatShading: true }),
  );
  stem.position.y = 0.72;
  const bloom = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28, 0),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, flatShading: true }),
  );
  bloom.position.y = 1.16;
  group.add(pot, stem, bloom);
  return group;
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
  const material = new THREE.PointsMaterial({
    color: 0xffd6f6,
    size: 0.18,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    fog: false,
  });
  return new THREE.Points(geometry, material);
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
