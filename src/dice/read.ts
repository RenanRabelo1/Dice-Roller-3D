import { Quaternion, Vector3 } from 'three';
import type { DieKind, Polyhedron } from './polyhedra';
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

export const combineD100 = (tens: number, units: number): number => (tens === 0 && units === 0 ? 100 : tens * 10 + units);

// Raw face values per body → results per die (d10: 0 is 10; d100: tens body then units body).
export function toResults(kind: DieKind, raw: number[]): number[] {
  if (kind === 'd10') return raw.map((n) => (n === 0 ? 10 : n));
  if (kind === 'd100') return Array.from({ length: raw.length >> 1 }, (_, i) => combineD100(raw[2 * i], raw[2 * i + 1]));
  return raw;
}
