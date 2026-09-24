export type Solid = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
  bottom: number;
  /** Ice tiles keep momentum and take longer to steer. */
  ice?: boolean;
};

export type Body = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
};

export const BODY = {
  radius: 0.42,
  height: 1.5,
  speed: 9,
  accel: 78,
  airAccel: 34,
  gravity: 28,
  jumpSpeed: 11,
  stepHeight: 0.5,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
};

export type Locomotion = {
  body: Body;
  coyote: number;
  buffer: number;
};

export function createLocomotion(x: number, y: number, z: number): Locomotion {
  return {
    body: { x, y, z, vx: 0, vy: 0, vz: 0, grounded: true },
    coyote: BODY.coyoteTime,
    buffer: 0,
  };
}

export type TickInput = {
  /** World-space wish direction. Length is ignored past 1. */
  wishX: number;
  wishZ: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dt: number;
};

function overlapsXZ(x: number, z: number, radius: number, solid: Solid): boolean {
  const cx = Math.min(Math.max(x, solid.minX), solid.maxX);
  const cz = Math.min(Math.max(z, solid.minZ), solid.maxZ);
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < radius * radius;
}

function pushOut(
  x: number,
  z: number,
  radius: number,
  solid: Solid,
): { x: number; z: number } | null {
  const cx = Math.min(Math.max(x, solid.minX), solid.maxX);
  const cz = Math.min(Math.max(z, solid.minZ), solid.maxZ);
  const dx = x - cx;
  const dz = z - cz;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) return null;
  if (distSq === 0) {
    const left = x - solid.minX;
    const right = solid.maxX - x;
    const north = z - solid.minZ;
    const south = solid.maxZ - z;
    const min = Math.min(left, right, north, south);
    if (min === left) return { x: solid.minX - radius, z };
    if (min === right) return { x: solid.maxX + radius, z };
    if (min === north) return { x, z: solid.minZ - radius };
    return { x, z: solid.maxZ + radius };
  }
  const dist = Math.sqrt(distSq);
  const push = radius - dist;
  return { x: x + (dx / dist) * push, z: z + (dz / dist) * push };
}

/** Highest walkable top at or below `y`, if the point lies inside a solid's footprint. */
export function surfaceBelow(x: number, z: number, y: number, solids: Solid[]): number | null {
  let best: number | null = null;
  for (const solid of solids) {
    if (x < solid.minX || x > solid.maxX || z < solid.minZ || z > solid.maxZ) continue;
    if (solid.top <= y + 0.2 && (best === null || solid.top > best)) best = solid.top;
  }
  return best;
}

function resolveHorizontal(body: Body, solids: Solid[]): void {
  const radius = BODY.radius;
  for (let pass = 0; pass < 2; pass++) {
    for (const solid of solids) {
      const feet = body.y;
      const head = body.y + BODY.height;
      if (head <= solid.bottom || feet >= solid.top - 0.001) continue;
      if (feet >= solid.top - BODY.stepHeight && body.vy <= 0) {
        if (overlapsXZ(body.x, body.z, radius, solid)) {
          body.y = solid.top;
          body.vy = 0;
        }
        continue;
      }
      if (feet + BODY.height * 0.45 < solid.bottom) continue;
      const pushed = pushOut(body.x, body.z, radius, solid);
      if (!pushed) continue;
      const ox = pushed.x - body.x;
      const oz = pushed.z - body.z;
      const olen = Math.hypot(ox, oz);
      body.x = pushed.x;
      body.z = pushed.z;
      if (olen === 0) continue;
      const nx = ox / olen;
      const nz = oz / olen;
      const vn = body.vx * nx + body.vz * nz;
      if (vn < 0) {
        body.vx -= vn * nx;
        body.vz -= vn * nz;
      }
    }
  }
}

function resolveVertical(body: Body, solids: Solid[], prevY: number): boolean {
  const radius = BODY.radius * 0.78;
  if (body.vy > 0) {
    const prevHead = prevY + BODY.height;
    const head = body.y + BODY.height;
    for (const solid of solids) {
      if (!overlapsXZ(body.x, body.z, radius, solid)) continue;
      if (prevHead <= solid.bottom + 0.02 && head > solid.bottom) {
        body.y = solid.bottom - BODY.height;
        body.vy = 0;
      }
    }
    return false;
  }

  let best: Solid | null = null;
  for (const solid of solids) {
    if (!overlapsXZ(body.x, body.z, radius, solid)) continue;
    const crossed = prevY >= solid.top - 0.08 && body.y <= solid.top && body.y >= solid.top - 1.25;
    const resting = Math.abs(body.y - solid.top) <= 0.08;
    if (crossed || resting) {
      if (!best || solid.top > best.top) best = solid;
    }
  }
  if (!best) return false;
  body.y = best.top;
  body.vy = 0;
  return true;
}

function iceUnder(body: Body, solids: Solid[]): boolean {
  for (const solid of solids) {
    if (!solid.ice) continue;
    if (body.x < solid.minX || body.x > solid.maxX || body.z < solid.minZ || body.z > solid.maxZ) continue;
    if (Math.abs(body.y - solid.top) < 0.2) return true;
  }
  return false;
}

export function tick(loc: Locomotion, solids: Solid[], input: TickInput): void {
  const { body } = loc;
  const dt = input.dt;
  const wishLen = Math.hypot(input.wishX, input.wishZ);
  const nx = wishLen > 0 ? input.wishX / wishLen : 0;
  const nz = wishLen > 0 ? input.wishZ / wishLen : 0;
  const targetX = nx * BODY.speed;
  const targetZ = nz * BODY.speed;

  const accel = (body.grounded ? BODY.accel : BODY.airAccel) * dt * (body.grounded && iceUnder(body, solids) ? 0.2 : 1);
  const dvx = targetX - body.vx;
  const dvz = targetZ - body.vz;
  const dl = Math.hypot(dvx, dvz);
  if (dl <= accel || dl === 0) {
    body.vx = targetX;
    body.vz = targetZ;
  } else {
    body.vx += (dvx / dl) * accel;
    body.vz += (dvz / dl) * accel;
  }

  loc.coyote = body.grounded ? BODY.coyoteTime : loc.coyote - dt;
  loc.buffer = input.jumpPressed ? BODY.jumpBuffer : loc.buffer - dt;
  if (loc.buffer > 0 && loc.coyote > 0) {
    body.vy = BODY.jumpSpeed;
    body.grounded = false;
    loc.coyote = 0;
    loc.buffer = 0;
  }

  body.vy -= BODY.gravity * dt;
  if (!input.jumpHeld && body.vy > 0) body.vy -= BODY.gravity * 1.5 * dt;

  body.x += body.vx * dt;
  body.z += body.vz * dt;
  resolveHorizontal(body, solids);

  const prevY = body.y;
  body.y += body.vy * dt;
  body.grounded = resolveVertical(body, solids, prevY);
  if (body.grounded) loc.coyote = BODY.coyoteTime;
}
