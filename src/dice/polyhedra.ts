import {
  BoxGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  type BufferGeometry,
} from 'three';
import type { Vec3 } from '../physics/world';

export type Shape = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
export type DieKind = Shape | 'd100';
export type LabelSet = 'plain' | 'tens';

export const KINDS: DieKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
// Circumscribed radius of each shape.
export const RADIUS: Record<Shape, number> = { d4: 0.9, d6: 0.75, d8: 0.7, d10: 0.7, d12: 0.7, d20: 0.7 };

export interface Face { normal: Vec3; center: Vec3; value: number }
export interface Top { dir: Vec3; value: number }
export interface Label { text: string; value: number; position: Vec3; normal: Vec3; up: Vec3 }
export interface Polyhedron {
  shape: Shape;
  labels: LabelSet;
  radius: number;
  points: Vec3[];
  triangles: number[];
  faces: Face[];
  tops: Top[];
  labelList: Label[];
}

const OPPOSITE_SUM: Partial<Record<Shape, number>> = { d6: 7, d8: 9, d10: 9, d12: 13, d20: 21 };

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const round6 = (v: number) => Math.round(v * 1e6) / 1e6 + 0; // + 0 turns -0 into 0

// Hand-built pentagonal trapezohedron, scaled so its circumradius is `radius`.
function trapezohedronTriangles(radius: number): Vec3[] {
  const h = 1.1;
  const c36 = Math.cos(Math.PI / 5);
  const y1 = (h * (1 - c36)) / (1 + c36);
  const s = radius / h;
  const ring = (deg: number, y: number): Vec3 => [Math.cos((deg * Math.PI) / 180) * s, y * s, Math.sin((deg * Math.PI) / 180) * s];
  const T: Vec3 = [0, h * s, 0];
  const B: Vec3 = [0, -h * s, 0];
  const U = (k: number) => ring(72 * (k % 5), y1);
  const L = (k: number) => ring(72 * (k % 5) + 36, -y1);
  const tris: Vec3[] = [];
  for (let k = 0; k < 5; k++) {
    tris.push(T, U(k), L(k), T, L(k), U(k + 1));
    tris.push(B, L(k), U(k + 1), B, U(k + 1), L(k + 1));
  }
  return tris;
}

function geometryTriangles(g: BufferGeometry): Vec3[] {
  const pos = (g.index ? g.toNonIndexed() : g).getAttribute('position');
  return Array.from({ length: pos.count }, (_, i) => [pos.getX(i), pos.getY(i), pos.getZ(i)] as Vec3);
}

function rawTriangles(shape: Shape): Vec3[] {
  const r = RADIUS[shape];
  switch (shape) {
    case 'd4': return geometryTriangles(new TetrahedronGeometry(r));
    case 'd6': { const e = (2 * r) / Math.sqrt(3); return geometryTriangles(new BoxGeometry(e, e, e)); }
    case 'd8': return geometryTriangles(new OctahedronGeometry(r));
    case 'd10': return trapezohedronTriangles(r);
    case 'd12': return geometryTriangles(new DodecahedronGeometry(r));
    case 'd20': return geometryTriangles(new IcosahedronGeometry(r));
  }
}

function build(shape: Shape, labels: LabelSet): Polyhedron {
  const verts = rawTriangles(shape);
  const points: Vec3[] = [];
  const indexOf = (v: Vec3) => {
    let i = points.findIndex((p) => Math.hypot(p[0] - v[0], p[1] - v[1], p[2] - v[2]) < 1e-6);
    if (i < 0) { points.push(v); i = points.length - 1; }
    return i;
  };

  // Triangles with outward winding, grouped by equal normal into logical faces.
  const triangles: number[] = [];
  const groups: { normal: Vec3; ids: Set<number> }[] = [];
  for (let t = 0; t < verts.length; t += 3) {
    let [a, b, c] = [verts[t], verts[t + 1], verts[t + 2]];
    let n = unit(cross(sub(b, a), sub(c, a)));
    if (dot(n, a) < 0) { [b, c] = [c, b]; n = [-n[0], -n[1], -n[2]]; }
    const ids = [a, b, c].map(indexOf);
    triangles.push(...[a, b, c].flat());
    const g = groups.find((x) => dot(x.normal, n) > 0.9999);
    if (g) ids.forEach((i) => g.ids.add(i)); else groups.push({ normal: n, ids: new Set(ids) });
  }

  const faceVerts = groups.map((g) => [...g.ids]);
  const faces: Face[] = groups.map((g, i) => {
    const vs = faceVerts[i].map((j) => points[j]);
    const center = [0, 1, 2].map((k) => vs.reduce((s, v) => s + v[k], 0) / vs.length) as Vec3;
    return { normal: g.normal, center, value: 0 };
  });

  if (shape !== 'd4') {
    const sum = OPPOSITE_SUM[shape]!;
    const key = (f: Face) => [-round6(f.normal[1]), Math.atan2(round6(f.normal[2]), round6(f.normal[0]))];
    const order = faces.map((_, i) => i).sort((i, j) => {
      const [a, b] = [key(faces[i]), key(faces[j])];
      return a[0] - b[0] || a[1] - b[1];
    });
    let next = shape === 'd10' ? 0 : 1;
    const done = new Set<number>();
    for (const i of order) {
      if (done.has(i)) continue;
      const o = faces.findIndex((g) => dot(g.normal, faces[i].normal) < -0.9999);
      faces[i].value = next;
      faces[o].value = sum - next;
      done.add(i).add(o);
      next++;
    }
  }

  const tops: Top[] = shape === 'd4' ? points.map((p, i) => ({ dir: unit(p), value: i + 1 })) : [];

  const marked = shape === 'd12' || shape === 'd20' || (shape === 'd10' && labels === 'plain');
  const text = (v: number) => (labels === 'tens' ? (v === 0 ? '00' : `${v}0`) : marked && (v === 6 || v === 9) ? `${v}.` : String(v));
  const labelList: Label[] = [];
  faces.forEach((f, i) => {
    if (shape === 'd4') {
      for (const j of faceVerts[i]) {
        const d = sub(points[j], f.center);
        labelList.push({
          text: String(j + 1), value: j + 1, normal: f.normal, up: unit(d),
          position: [f.center[0] + 0.55 * d[0], f.center[1] + 0.55 * d[1], f.center[2] + 0.55 * d[2]],
        });
      }
      return;
    }
    const project = (v: Vec3): Vec3 => { const k = dot(v, f.normal); return [v[0] - k * f.normal[0], v[1] - k * f.normal[1], v[2] - k * f.normal[2]]; };
    let up = project([0, 1, 0]);
    if (Math.hypot(...up) < 1e-6) up = project([0, 0, 1]);
    labelList.push({ text: text(f.value), value: f.value, position: f.center, normal: f.normal, up: unit(up) });
  });

  return { shape, labels, radius: RADIUS[shape], points, triangles, faces, tops, labelList };
}

const cache = new Map<string, Polyhedron>();
export function polyhedron(shape: Shape, labels: LabelSet = 'plain'): Polyhedron {
  const key = `${shape}:${labels}`;
  let p = cache.get(key);
  if (!p) { p = build(shape, labels); cache.set(key, p); }
  return p;
}

export function bodiesFor(kind: DieKind, count: number): { shape: Shape; labels: LabelSet }[] {
  if (kind !== 'd100') return Array.from({ length: count }, () => ({ shape: kind, labels: 'plain' as const }));
  return Array.from({ length: count }, () => [
    { shape: 'd10' as const, labels: 'tens' as const },
    { shape: 'd10' as const, labels: 'plain' as const },
  ]).flat();
}
