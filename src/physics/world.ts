export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w

export const STEP = 1 / 60;
export const GRAVITY: Vec3 = [0, -40, 0];

// Interior x in [-halfWidth, halfWidth], z in [-halfDepth, halfDepth]; floor at y = 0; +z is the player's edge.
export const TRAY = { halfWidth: 7, halfDepth: 4.5, wallHeight: 1.5, wallThickness: 0.5, lidY: 7 };

export const MATERIAL = {
  die: { friction: 0.5, restitution: 0.3, density: 1.2 },
  velvet: { friction: 0.8, restitution: 0.15 },
  wall: { friction: 0.3, restitution: 0.45 },
};

export const LAUNCH = { minSpeed: 6, maxSpeed: 22, lift: 0.35 };
export const SPIN = { min: 10, max: 25 };
// Stopped = every body under `speed` (units/s) and `spin` (rad/s) for `calmSteps` steps; hard cap at `timeoutSteps`.
export const SETTLE = { timeoutSteps: 240, calmSteps: 12, speed: 0.08, spin: 0.15 };
export const HAND = { y: 3, z: 3, spacing: 1.9, cols: 5, pull: 0.6 };
export const MAX_RADIUS = 0.9;

export interface Box {
  kind: 'floor' | 'wall' | 'lid';
  center: Vec3;
  half: Vec3;
}

export function trayColliders(): Box[] {
  const { halfWidth: w, halfDepth: d, wallThickness: t, lidY } = TRAY;
  const slab = t / 2;
  const wallHalfY = lidY / 2;
  return [
    { kind: 'floor', center: [0, -slab, 0], half: [w + t, slab, d + t] },
    { kind: 'wall', center: [w + slab, wallHalfY, 0], half: [slab, wallHalfY, d + t] },
    { kind: 'wall', center: [-w - slab, wallHalfY, 0], half: [slab, wallHalfY, d + t] },
    { kind: 'wall', center: [0, wallHalfY, d + slab], half: [w, wallHalfY, slab] },
    { kind: 'wall', center: [0, wallHalfY, -d - slab], half: [w, wallHalfY, slab] },
    { kind: 'lid', center: [0, lidY + slab, 0], half: [w + t, slab, d + t] },
  ];
}

const span = (bodies: number) => (Math.min(bodies, HAND.cols) - 1) / 2;

export function clampHandX(x: number, bodies: number): number {
  const limit = TRAY.halfWidth - MAX_RADIUS - span(bodies) * HAND.spacing;
  return Math.max(-limit, Math.min(limit, x));
}

export function handPositions(bodies: number, handX: number): Vec3[] {
  return Array.from({ length: bodies }, (_, i) => {
    const col = i % HAND.cols;
    const row = Math.floor(i / HAND.cols) % 2;
    const layer = Math.floor(i / (HAND.cols * 2));
    return [
      handX + (col - span(bodies)) * HAND.spacing,
      HAND.y + layer * HAND.spacing,
      HAND.z - row * HAND.spacing,
    ];
  });
}

export function recoveryPoint(index: number, bodies: number): Vec3 {
  const cols = Math.min(bodies, HAND.cols);
  const rows = Math.ceil(bodies / HAND.cols);
  const col = index % HAND.cols;
  const row = Math.floor(index / HAND.cols);
  return [(col - (cols - 1) / 2) * HAND.spacing, 1.2, (row - (rows - 1) / 2) * HAND.spacing];
}

export function isOutside(p: Vec3, radius: number): boolean {
  return Math.abs(p[0]) > TRAY.halfWidth + radius || Math.abs(p[2]) > TRAY.halfDepth + radius || p[1] < -radius;
}
