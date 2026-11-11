import { Quaternion, Vector3 } from 'three';
import { baseOf, type DieKind, type Polyhedron } from './polyhedra';
import type { Quat } from '../physics/world';

const UP = new Vector3(0, 1, 0);

// Face normals (or d4 vertex directions) with the value each one shows.
const marks = (poly: Polyhedron) =>
  poly.shape === 'd4' ? poly.tops.map((t) => ({ v: t.dir, value: t.value })) : poly.faces.map((f) => ({ v: f.normal, value: f.value }));

// Up value and tilt (degrees) of a die. d4 reads the top vertex; others the top face.
export function readUp(poly: Polyhedron, q: Quat): { value: number; tilt: number } {
  const rot = new Quaternion(...q);
  let best = { value: 0, y: -Infinity };
  for (const c of marks(poly)) {
    const y = new Vector3(...c.v).applyQuaternion(rot).dot(UP);
    if (y > best.y) best = { value: c.value, y };
  }
  return { value: best.value, tilt: (Math.acos(Math.min(1, best.y)) * 180) / Math.PI };
}

// Raw face values per die → results (the 0 face of a d10, Vampire ones included, counts as 10; a coin is 1 heads, 2 tails).
export function toResults(dice: DieKind[], raw: number[]): number[] {
  return raw.map((v, i) => (baseOf(dice[i]) === 'd10' && v === 0 ? 10 : v));
}
