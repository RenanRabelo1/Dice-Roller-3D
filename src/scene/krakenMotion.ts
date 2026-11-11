import { MathUtils, Quaternion, Vector3 } from 'three';
import type { Omen } from '../dice/omen';
import type { DieKind } from '../dice/polyhedra';
import { TRAY, type Quat, type Vec3 } from '../physics/world';
import { easeOut } from './highlight';
import type { Pose } from './showcase';

export const span = (t: number, a: number, b: number) => MathUtils.clamp((t - a) / (b - a), 0, 1);
const smooth = (t: number, a: number, b: number) => MathUtils.smootherstep(t, a, b);
const UP = new Vector3(0, 1, 0);

// d100 = 1 (Call of Cthulhu's critical). One clock drives it all: the felt cracks and bursts, a tentacle coils
// round the die, lifts and shakes it, and flings it far out of sight; it reaches after it, catches it and
// brings it to the screen with the 1 toward you, lets go and sinks while the tray mends.
export const KRAKEN = { rupture: 450, grab: 1150, lift: 1750, fling: 2050, away: 2650, catch: 3350, shown: 4350, release: 5300, restored: 6300, duration: 6500 };
// Where the die is flung: high and far behind the tray, out of the camera's sight.
export const FAR: Vec3 = [0, 14, -19];

export const krakenIndices = (omen: Omen | null, dice: DieKind[]) =>
  omen && !omen.fumbles.length ? omen.crits.filter((i) => dice[i] === 'd100') : [];

export function krakenAt(t: number) {
  return {
    broken: t >= KRAKEN.rupture && t < KRAKEN.restored,
    spread: easeOut(span(t, KRAKEN.rupture, 1100)) * (1 - smooth(t, KRAKEN.release, KRAKEN.restored)),
    arms: easeOut(span(t, 300, 1400)) * (1 - smooth(t, KRAKEN.release, 6000)),
    // How tightly the grabbing tentacle coils round the die: holding it, letting go to throw, catching it again.
    grip: Math.max(span(t, 700, KRAKEN.grab) * (1 - span(t, KRAKEN.fling, KRAKEN.fling + 150)),
      span(t, KRAKEN.catch - 150, KRAKEN.catch) * (1 - span(t, KRAKEN.release, KRAKEN.release + 350))),
    // The rolled number lights up on the die as it is brought to you, and stays.
    reveal: smooth(t, KRAKEN.catch + 500, KRAKEN.shown),
  };
}

const turn = (axis: Vec3, angle: number) => new Quaternion().setFromAxisAngle(new Vector3(...axis).normalize(), angle);
const bezier = (a: Vector3, c: Vector3, b: Vector3, u: number) =>
  a.clone().multiplyScalar((1 - u) ** 2).addScaledVector(c, 2 * u * (1 - u)).addScaledVector(b, u * u);

// Where the grabbed die is `ms` into the omen: on the felt, lifted and shaken, wound back, flung, away,
// carried back to `final` (the ordinary result pose) and held there.
export function krakenDieAt(ms: number, from: Pose, final: Pose): Pose {
  if (ms < KRAKEN.grab) return from;
  if (ms >= KRAKEN.shown) return final;
  const start = new Vector3(...from.p), q0 = new Quaternion(...from.q);
  // Lifted and shaken in the tentacle's grip, then wound back toward you before the throw.
  const held = (t: number) => {
    const a = easeOut(span(t, KRAKEN.grab, KRAKEN.lift));
    const p = start.clone().addScaledVector(UP, 2.6 * a).add(new Vector3(0, 0, 1.4 * a)) // up and toward you, in view
      .add(new Vector3(Math.sin(t / 35) * 0.18 * a, 0, Math.cos(t / 41) * 0.18 * a))
      .add(new Vector3(0, -0.6, 1.0).multiplyScalar(easeOut(span(t, KRAKEN.lift, KRAKEN.fling))));
    return { p, q: q0.clone().multiply(turn([1, 0, 0.3], 0.5 * Math.sin(t / 90) * a)) };
  };
  if (ms < KRAKEN.fling) { const { p, q } = held(ms); return { p: p.toArray() as Vec3, q: q.toArray() as Quat }; }
  const wound = held(KRAKEN.fling), far = new Vector3(FAR[0] + from.p[0] * 0.4, FAR[1], FAR[2]);
  const spinning = (u: number) => wound.q.clone().multiply(turn([0.3, 1, 0.5], 7 * Math.PI * u));
  if (ms < KRAKEN.catch) { // flung in a high arc, then out of sight
    const u = span(ms, KRAKEN.fling, KRAKEN.away);
    const top = wound.p.clone().lerp(far, 0.5).addScaledVector(UP, 5);
    return { p: bezier(wound.p, top, far, 1 - (1 - u) ** 2).toArray() as Vec3, q: spinning(u).toArray() as Quat };
  }
  // Carried back on the tentacle, swinging down to the screen, still turning until it shows its face.
  const u = smooth(ms, KRAKEN.catch, KRAKEN.shown), end = new Vector3(...final.p);
  const swing = far.clone().lerp(end, 0.5).addScaledVector(UP, 3.5);
  const q = spinning(1).slerp(new Quaternion(...final.q), easeOut(u)).multiply(turn([0.2, 1, 0.1], 2 * Math.PI * (1 - u) ** 2));
  return { p: bezier(far, swing, end, u).toArray() as Vec3, q: q.normalize().toArray() as Quat };
}

// d100 = 100. The storm: tentacles rise from the sea all round the tray and sway in the rain while the die
// drifts toward you, rocking as on waves, and ends at the result pose; then they sink.
export const STORM = { rise: 1200, approach: 600, arrive: 3500, sink: 3700, duration: 4600 };

export const stormIndices = (omen: Omen | null, dice: DieKind[]) =>
  omen && !omen.crits.length ? omen.fumbles.filter((i) => dice[i] === 'd100') : [];

export const stormAt = (t: number) => ({
  arms: easeOut(span(t, 0, STORM.rise)) * (1 - smooth(t, STORM.sink, STORM.duration - 100)),
  reveal: smooth(t, STORM.arrive - 1000, STORM.arrive),
});

export function stormDieAt(ms: number, from: Pose, final: Pose): Pose {
  if (ms < STORM.approach) return from;
  if (ms >= STORM.arrive) return final;
  const u = smooth(ms, STORM.approach, STORM.arrive);
  const p = new Vector3(...from.p).lerp(new Vector3(...final.p), u);
  const rock = (1 - u) * Math.sin(Math.PI * u); // fades out as it arrives
  const q = new Quaternion(...from.q).slerp(new Quaternion(...final.q), easeOut(u)).multiply(turn([0, 0, 1], 0.35 * rock * Math.sin(ms / 260)));
  return { p: p.toArray() as Vec3, q: q.normalize().toArray() as Quat };
}

// Radial subdivision, O(n log n); corner rays ensure that repairing the shards fills the entire rectangle.
export function fractureCells(x: number, z: number): [number, number][][] {
  const angles = Array.from({ length: 16 }, (_, i) => i * Math.PI / 8);
  const X = TRAY.halfWidth + TRAY.wallThickness, Z = TRAY.halfDepth + TRAY.wallThickness; // the tray mesh's outline
  for (const px of [-X, X]) for (const pz of [-Z, Z]) angles.push((Math.atan2(pz - z, px - x) + 2 * Math.PI) % (2 * Math.PI));
  angles.sort((a, b) => a - b);
  const rim = angles.map((a): [number, number] => {
    const dx = Math.cos(a), dz = Math.sin(a);
    const distance = Math.min(Math.abs(dx) < 1e-8 ? Infinity : (dx > 0 ? X - x : -X - x) / dx,
      Math.abs(dz) < 1e-8 ? Infinity : (dz > 0 ? Z - z : -Z - z) / dz);
    return [x + dx * distance, z + dz * distance];
  });
  return rim.flatMap((a, i) => {
    const b = rim[(i + 1) % rim.length];
    const inner = (p: [number, number]): [number, number] => [x + (p[0] - x) * 0.43, z + (p[1] - z) * 0.43];
    return [[[x, z], inner(a), inner(b)], [inner(a), a, b, inner(b)]] as [number, number][][];
  });
}
