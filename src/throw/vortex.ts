import { MAX_DICE } from '../dice/polyhedra';
import { HAND, TRAY, type Vec3 } from '../physics/world';

// The hand as a whirlwind. One die waits alone, spinning. More dice gather into an atom-like whirl:
// each on its own tilted orbit (half of them going the other way round) and spinning about its own axis.
// Charging the throw speeds everything up; as the charge eases off, it slows down again.
export const VORTEX = {
  orbit: 1.5, // rad/s around the orbit, before the charge
  spin: 2.4, // rad/s about the die's own axis, before the charge
  boost: 3.5, // a full charge turns everything 1 + boost times faster
  squash: [1, 0.7, 0.8] as Vec3, // a flattened sphere: low enough for the camera, clear of the front wall
  follow: 9, // 1/s: how fast a die catches up with its place (new dice fly out of the middle)
  grow: 6, // 1/s: how fast the whirl widens or narrows as dice join or leave
  bob: 0.08, // a lone die's float
};
const REACH = 0.9; // the largest die's radius (MAX_RADIUS), kept clear of the walls and the felt
const MARGIN = 0.1;

export const vortexRadius = (n: number) => (n < 2 ? 0 : 0.75 + 0.13 * n);

const reach = (n: number, axis: number) => vortexRadius(n) * VORTEX.squash[axis] + REACH;

// The whirl's middle: the hand's place, inside the side walls and back from the front one.
export function vortexCenter(n: number, x: number, pull = 0): Vec3 {
  const limit = TRAY.halfWidth - reach(n, 0) - MARGIN;
  return [Math.max(-limit, Math.min(limit, x)), HAND.y, Math.min(HAND.z + pull, TRAY.halfDepth - MARGIN - reach(n, 2))];
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// Evenly spread directions (Fibonacci): over a half sphere for orbit planes (a and −a are the same plane).
const spread = (i: number, n: number, half: boolean): Vec3 => {
  const y = half ? 1 - (i + 0.5) / n : 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y);
  return [Math.cos(GOLDEN * i) * r, y, Math.sin(GOLDEN * i) * r];
};

export interface Orbit { normal: Vec3; u: Vec3; v: Vec3; rate: number; start: number; axis: Vec3; spin: number }
// One per hand slot: its orbit plane (normal, with u and v across it), signed angular rate and starting angle,
// and the die's own spin axis and signed spin rate.
export const ORBITS: Orbit[] = Array.from({ length: MAX_DICE }, (_, i) => {
  const normal = spread(i, MAX_DICE, true);
  const u = unit(cross(Math.abs(normal[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], normal));
  return {
    normal, u, v: cross(normal, u),
    rate: (i % 2 ? -1 : 1) * (0.8 + 0.4 * ((i * 0.618034) % 1)),
    start: i * GOLDEN,
    axis: spread((i * 7) % MAX_DICE, MAX_DICE, false),
    spin: (i % 3 ? 1 : -1) * (0.75 + 0.5 * ((i * 0.414214) % 1)),
  };
});

export interface Whirl { pos: Vec3[]; phase: number[]; radius: number }
export const newWhirl = (center: Vec3): Whirl => ({ pos: ORBITS.map(() => [...center]), phase: ORBITS.map((o) => o.start), radius: 0 });

const pace = (force: number, still: boolean) => (still ? 0 : 1 + VORTEX.boost * force);
// How far die `i` turns about its own axis this frame.
export const spinAngle = (i: number, force: number, dt: number, still = false) => (still ? 0 : ORBITS[i].spin * VORTEX.spin * pace(force, still) * dt);

// One frame of the whirl for `radii.length` dice: orbits advance with the charge, each die eases toward its
// place, then overlapping dice are pushed apart and kept inside the tray. O(n²) with n ≤ 10. Mutates `w`.
export function stepWhirl(w: Whirl, o: { x: number; force: number; dt: number; radii: number[]; still: boolean }): Vec3[] {
  const n = o.radii.length, speed = pace(o.force, o.still);
  const center = vortexCenter(n, o.x, HAND.pull * o.force);
  const ease = (rate: number) => (o.still ? 1 : 1 - Math.exp(-rate * o.dt));
  w.radius += (vortexRadius(n) - w.radius) * ease(VORTEX.grow);
  const follow = ease(VORTEX.follow);
  for (let i = 0; i < n; i++) {
    const orbit = ORBITS[i];
    w.phase[i] += orbit.rate * VORTEX.orbit * speed * o.dt;
    const c = Math.cos(w.phase[i]), s = Math.sin(w.phase[i]);
    const target = center.map((m, k) => m + w.radius * VORTEX.squash[k] * (orbit.u[k] * c + orbit.v[k] * s)) as Vec3;
    if (n === 1 && !o.still) target[1] += VORTEX.bob * Math.sin(2.6 * w.phase[0]);
    for (let k = 0; k < 3; k++) w.pos[i][k] += (target[k] - w.pos[i][k]) * follow;
  }
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = w.pos[i], b = w.pos[j], gap = o.radii[i] + o.radii[j];
      let d: Vec3 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = Math.hypot(...d);
      if (len >= gap) continue;
      if (len < 1e-6) { d = ORBITS[i].u.map((v, k) => v - ORBITS[j].u[k]) as Vec3; len = Math.hypot(...d); } // same spot: split along their orbits
      const push = (gap - len) / 2 / len;
      for (let k = 0; k < 3; k++) { a[k] += d[k] * push; b[k] -= d[k] * push; }
    }
    for (let i = 0; i < n; i++) { // inside the walls and above the felt
      const p = w.pos[i], r = o.radii[i] + MARGIN / 2, wx = TRAY.halfWidth - r, wz = TRAY.halfDepth - r;
      p[0] = Math.max(-wx, Math.min(wx, p[0])); p[2] = Math.max(-wz, Math.min(wz, p[2])); p[1] = Math.max(r, p[1]);
    }
  }
  return w.pos.slice(0, n);
}

// Where the dice go back to when picked up: their current places in the whirl (around the aimed x), without
// advancing it. Pure: `w` is left as it is.
export function restingPlaces(w: Whirl, x: number, radii: number[]): Vec3[] {
  const copy: Whirl = { pos: w.pos.map((p) => [...p] as Vec3), phase: [...w.phase], radius: w.radius };
  return stepWhirl(copy, { x, force: 0, dt: 0, radii, still: true });
}
