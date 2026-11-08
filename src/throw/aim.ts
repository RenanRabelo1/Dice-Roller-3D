import { LAUNCH, MAX_RADIUS, SPIN, TRAY, type Vec3 } from '../physics/world';

const CHARGE_HALF_CYCLE_MS = 700;

/** Keeps the aim target on the tray floor, a die radius away from the walls. */
export function clampTarget([x, , z]: Vec3): Vec3 {
  const mx = TRAY.halfWidth - MAX_RADIUS;
  const mz = TRAY.halfDepth - MAX_RADIUS;
  return [Math.min(mx, Math.max(-mx, x)), 0, Math.min(mz, Math.max(-mz, z))];
}

/** Triangle wave 0 → 1 → 0 with a 1400 ms cycle. */
export function charge(ms: number): number {
  return 1 - Math.abs(((ms / CHARGE_HALF_CYCLE_MS) % 2) - 1);
}

export function launchVelocity(from: Vec3, target: Vec3, force: number): Vec3 {
  const s = LAUNCH.minSpeed + force * (LAUNCH.maxSpeed - LAUNCH.minSpeed);
  const dx = target[0] - from[0];
  const dz = target[2] - from[2];
  const d = Math.hypot(dx, dz);
  const [ux, uz] = d === 0 ? [0, -1] : [dx / d, dz / d];
  return [ux * s, LAUNCH.lift * s, uz * s];
}

/** mulberry32: seeded PRNG with values in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded angular velocity for die `index`: random axis, magnitude in [SPIN.min, SPIN.max]. */
export function spin(seed: number, index: number): Vec3 {
  const r = rng(seed ^ Math.imul(index + 1, 0x9e3779b1));
  const y = 2 * r() - 1; // uniform on the sphere, never a zero vector
  const phi = 2 * Math.PI * r();
  const ring = Math.sqrt(1 - y * y);
  const m = SPIN.min + r() * (SPIN.max - SPIN.min);
  return [ring * Math.cos(phi) * m, y * m, ring * Math.sin(phi) * m];
}
