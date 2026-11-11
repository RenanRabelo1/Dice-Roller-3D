import { MathUtils, Quaternion, Vector3 } from 'three';
import type { Omen } from '../dice/omen';
import type { DieKind, Polyhedron } from '../dice/polyhedra';
import { easeOut } from './highlight';
import { showcasePoses, type Pose, type View } from './showcase';

// One clock drives the rupture, die, heavenly reveal and repair; interruptions restore the intact tray.
export const KRAKEN = { rupture: 450, launch: 1450, reveal: 2600, repair: 4200, restored: 5400, duration: 5600 };
export const span = (t: number, a: number, b: number) => MathUtils.clamp((t - a) / (b - a), 0, 1);

export const krakenIndices = (omen: Omen | null, dice: DieKind[]) =>
  omen && !omen.fumbles.length ? omen.crits.filter((i) => dice[i] === 'd100') : [];

export function krakenAt(t: number) {
  return {
    broken: t >= KRAKEN.rupture && t < KRAKEN.restored,
    spread: easeOut(span(t, KRAKEN.rupture, 1100)) * (1 - MathUtils.smootherstep(t, KRAKEN.repair, KRAKEN.restored)),
    arms: easeOut(span(t, 300, 1400)) * (1 - MathUtils.smootherstep(t, KRAKEN.repair, 5100)),
    halo: easeOut(span(t, 2100, KRAKEN.reveal + 250)) * (1 - MathUtils.smootherstep(t, KRAKEN.repair, 5200)),
    hero: MathUtils.smootherstep(t, KRAKEN.launch, KRAKEN.reveal) * (1 - MathUtils.smootherstep(t, KRAKEN.repair, KRAKEN.restored)),
  };
}

export function krakenFlightAt(ms: number, from: Pose, hero: Pose, final: Pose): Pose {
  if (ms <= KRAKEN.launch) return from;
  if (ms >= KRAKEN.restored) return final;
  if (ms >= KRAKEN.reveal && ms <= KRAKEN.repair) return hero;
  const arriving = ms < KRAKEN.reveal;
  const t = arriving ? span(ms, KRAKEN.launch, KRAKEN.reveal) : span(ms, KRAKEN.repair, KRAKEN.restored);
  const e = arriving ? easeOut(t) : MathUtils.smootherstep(t, 0, 1);
  const a = arriving ? from : hero, b = arriving ? hero : final;
  const p = new Vector3(...a.p).lerp(new Vector3(...b.p), e);
  const q = new Quaternion(...a.q).slerp(new Quaternion(...b.q), e);
  if (arriving) {
    p.y += 2.4 * Math.sin(Math.PI * t) * (1 - t);
    q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0.4, 1, 0.2).normalize(), 4 * Math.PI * (1 - t) ** 2));
  }
  return { p: p.toArray(), q: q.toArray() };
}

export function krakenHeroPoses(polys: Polyhedron[], raw: number[], view: View): Pose[] {
  const poses = showcasePoses(polys, raw, view), tan = Math.tan(view.fov * Math.PI / 360);
  const right = new Vector3(1, 0, 0).applyQuaternion(view.quaternion);
  const up = new Vector3(0, 1, 0).applyQuaternion(view.quaternion);
  const forward = new Vector3(0, 0, -1).applyQuaternion(view.quaternion);
  let scale = 1;
  for (const pose of poses) {
    const offset = new Vector3(...pose.p).sub(view.position), depth = offset.dot(forward);
    scale = Math.max(scale, 3.6 / (depth * tan * view.aspect - Math.abs(offset.dot(right))),
      3.0 / (depth * tan - Math.abs(offset.dot(up))));
  }
  return poses.map(({ p, q }) => ({ p: new Vector3(...p).sub(view.position).multiplyScalar(scale).add(view.position).toArray(), q }));
}

// Radial subdivision, O(n log n); corner rays ensure that repairing the shards fills the entire rectangle.
export function fractureCells(x: number, z: number): [number, number][][] {
  const angles = Array.from({ length: 16 }, (_, i) => i * Math.PI / 8);
  for (const px of [-7.5, 7.5]) for (const pz of [-5, 5]) angles.push((Math.atan2(pz - z, px - x) + 2 * Math.PI) % (2 * Math.PI));
  angles.sort((a, b) => a - b);
  const rim = angles.map((a): [number, number] => {
    const dx = Math.cos(a), dz = Math.sin(a);
    const distance = Math.min(Math.abs(dx) < 1e-8 ? Infinity : (dx > 0 ? 7.5 - x : -7.5 - x) / dx,
      Math.abs(dz) < 1e-8 ? Infinity : (dz > 0 ? 5 - z : -5 - z) / dz);
    return [x + dx * distance, z + dz * distance];
  });
  return rim.flatMap((a, i) => {
    const b = rim[(i + 1) % rim.length];
    const inner = (p: [number, number]): [number, number] => [x + (p[0] - x) * 0.43, z + (p[1] - z) * 0.43];
    return [[[x, z], inner(a), inner(b)], [inner(a), a, b, inner(b)]] as [number, number][][];
  });
}
