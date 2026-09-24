import * as THREE from "three";
import { FRAME_WIDTH, SPRITE_FRAMES } from "./spriteFrames";

const PALETTE: Record<string, string> = {
  H: "#5b3484",
  h: "#8d62c4",
  S: "#ffd0b0",
  J: "#ff3d6e",
  j: "#d42558",
  A: "#3ee0c3",
  G: "#ffd56a",
  P: "#2c3158",
  B: "#16131c",
  E: "#1a1224",
  W: "#fff8f2",
  C: "#ff9bb0",
};

const OUTLINE = [20, 12, 24, 255];
export const FRAME_PIXEL_W = 24;
export const FRAME_PIXEL_H = 36;

export function createSpriteTexture(): THREE.CanvasTexture {
  const frames = SPRITE_FRAMES.length;
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_PIXEL_W * frames;
  canvas.height = FRAME_PIXEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the sprite canvas");

  SPRITE_FRAMES.forEach((frame, index) => {
    const image = ctx.createImageData(FRAME_PIXEL_W, FRAME_PIXEL_H);
    const pixels = image.data;
    const startX = Math.floor((FRAME_PIXEL_W - FRAME_WIDTH) / 2);
    const startY = FRAME_PIXEL_H - 2 - frame.rows.length - frame.lift;
    frame.rows.forEach((row, rowIndex) => {
      for (let col = 0; col < row.length; col++) {
        const color = PALETTE[row[col]];
        if (!color) continue;
        const x = startX + col;
        const y = startY + rowIndex;
        if (x < 0 || y < 0 || x >= FRAME_PIXEL_W || y >= FRAME_PIXEL_H) continue;
        const i = (y * FRAME_PIXEL_W + x) * 4;
        const rgb = hex(color);
        pixels[i] = rgb[0];
        pixels[i + 1] = rgb[1];
        pixels[i + 2] = rgb[2];
        pixels[i + 3] = 255;
      }
    });
    outline(pixels, FRAME_PIXEL_W, FRAME_PIXEL_H);
    ctx.putImageData(image, index * FRAME_PIXEL_W, 0);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function hex(color: string): [number, number, number] {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

function outline(pixels: Uint8ClampedArray, width: number, height: number): void {
  const source = new Uint8ClampedArray(pixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (source[i + 3] > 0) continue;
      let touch = false;
      for (let oy = -1; oy <= 1 && !touch; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (source[(ny * width + nx) * 4 + 3] > 0) {
            touch = true;
            break;
          }
        }
      }
      if (!touch) continue;
      pixels[i] = OUTLINE[0];
      pixels[i + 1] = OUTLINE[1];
      pixels[i + 2] = OUTLINE[2];
      pixels[i + 3] = OUTLINE[3];
    }
  }
}
