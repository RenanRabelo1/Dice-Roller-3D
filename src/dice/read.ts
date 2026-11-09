import { Matrix4, Quaternion, Vector3 } from 'three';
import type { DieKind, Polyhedron } from './polyhedra';
import type { Quat, Vec3 } from '../physics/world';

const UP = new Vector3(0, 1, 0);
const EPS = 1e-4;

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

// The throw's results, decided before the dice land. Modulo bias is < 3e-8 for 100 sides.
export function rollResults(kind: DieKind, count: number): number[] {
  const sides = Number(kind.slice(1));
  return Array.from(crypto.getRandomValues(new Uint32Array(count)), (u) => 1 + (u % sides));
}

// The value each body must show: d10 digit (10 → 0); d100 tens digit then units digit (100 → 0, 0).
export function bodyValues(kind: DieKind, results: number[]): number[] {
  if (kind === 'd10') return results.map((v) => v % 10);
  if (kind === 'd100') return results.flatMap((v) => [Math.floor((v % 100) / 10), v % 10]);
  return results;
}

const frame = (a: Vector3, p: Vector3) => {
  const e2 = p.clone().addScaledVector(a, -p.dot(a)).normalize();
  return new Matrix4().makeBasis(a, e2, new Vector3().crossVectors(a, e2));
};

// Local symmetry rotation S of the die so that, posed at q, the mark showing `wanted` is the one on top.
// S maps the solid onto itself, so applying it to the visible die (not the body) changes only the numbers.
export function revealRotation(poly: Polyhedron, q: Quat, wanted: number): Quat {
  const up = UP.clone().applyQuaternion(new Quaternion(...q).invert());
  const all = marks(poly);
  const top = all.reduce((a, b) => (new Vector3(...b.v).dot(up) > new Vector3(...a.v).dot(up) ? b : a));
  const target = all.find((m) => m.value === wanted);
  if (!target) throw new Error(`${poly.shape} has no face ${wanted}`);
  const a = new Vector3(...target.v), b = new Vector3(...top.v);
  const pts = poly.points.map((p) => new Vector3(...p));
  const ref = pts.find((p) => Math.abs(p.clone().normalize().dot(a)) < 1 - EPS)!;
  const from = frame(a, ref).transpose();
  for (const cand of pts) {
    if (Math.abs(cand.dot(b) - ref.dot(a)) > EPS || Math.abs(cand.length() - ref.length()) > EPS) continue;
    const r = frame(b, cand).multiply(from);
    if (pts.every((p) => pts.some((o) => p.clone().applyMatrix4(r).distanceTo(o) < EPS))) {
      return new Quaternion().setFromRotationMatrix(r).toArray() as Quat;
    }
  }
  throw new Error(`no symmetry maps ${wanted} to the top of ${poly.shape}`);
}

export type { Vec3 };
