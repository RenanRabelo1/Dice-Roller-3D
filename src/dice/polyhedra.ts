import {
  BoxGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import type { Vec3 } from '../physics/world';
import { customBase, customKind, customList, customOrder, customPoly, isCustom, type CustomKind } from './custom';

export type Shape = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100' | 'coin';
export type BuiltinKind = Shape | 'vtm' | 'hunger' | 'fire';
export type DieKind = BuiltinKind | CustomKind; // every kind is one physical die
export type SymbolName = 'ankh' | 'crit' | 'skull' | 'fangs' | 'heads' | 'crown';

export const KINDS: BuiltinKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'vtm', 'hunger', 'fire', 'coin'];
// The physical die behind each kind: geometry, collider, radius, numbering and reading.
// Custom dice (Vampire: The Masquerade d10s, Fireball d6) only change how that die looks.
export const BASE: Record<BuiltinKind, Shape> = {
  d4: 'd4', d6: 'd6', d8: 'd8', d10: 'd10', d12: 'd12', d20: 'd20', d100: 'd100', vtm: 'd10', hunger: 'd10', fire: 'd6', coin: 'coin',
};
// Vampire d10s show symbols instead of digits, by d10 digit (0 is the 10); the other faces are blank.
const SYMBOL: Partial<Record<BuiltinKind, (digit: number) => SymbolName | undefined>> = {
  vtm: (v) => (v === 0 ? 'crit' : v >= 6 ? 'ankh' : undefined),
  hunger: (v) => (v === 0 ? 'fangs' : v === 1 ? 'skull' : v >= 6 ? 'ankh' : undefined),
};
// Circumscribed radius of each shape.
export const RADIUS: Record<Shape, number> = { d4: 0.9, d6: 0.75, d8: 0.7, d10: 0.7, d12: 0.7, d20: 0.7, d100: 0.9, coin: 0.76 };

export interface Face { normal: Vec3; center: Vec3; value: number }
export interface Top { dir: Vec3; value: number }
export interface Label { text: string; value: number; position: Vec3; normal: Vec3; up: Vec3; symbol?: SymbolName }
export interface Polyhedron {
  shape: Shape;
  radius: number;
  points: Vec3[];
  triangles: number[];
  faces: Face[];
  tops: Top[];
  labelList: Label[];
}

export const OPPOSITE_SUM: Partial<Record<Shape, number>> = { d6: 7, d8: 9, d10: 9, d12: 13, d20: 21 };

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

// d100: 100 near-equal faces, each tangent to the sphere at one of 100 evenly spread (Fibonacci) points.
// Every corner is where three neighbouring tangent planes meet; each face is the polygon around its point.
function hundredTriangles(radius: number): Vec3[] {
  const N = 100, turn = Math.PI * (3 - Math.sqrt(5));
  const pts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y);
    return new Vector3(Math.cos(turn * i) * r, y, Math.sin(turn * i) * r);
  });
  const corners: Vector3[][] = pts.map(() => []);
  for (const face of new ConvexHull().setFromPoints(pts).faces) {
    const ring: Vector3[] = [];
    let e = face.edge;
    do { ring.push(e.head().point); e = e.next; } while (e !== face.edge);
    const [a, b, c] = ring; // planes a·x = b·x = c·x = 1 meet at (b×c + c×a + a×b) / a·(b×c)
    const x = new Vector3().crossVectors(b, c).add(new Vector3().crossVectors(c, a)).add(new Vector3().crossVectors(a, b));
    x.divideScalar(a.dot(new Vector3().crossVectors(b, c)));
    for (const p of ring) corners[pts.indexOf(p)].push(x);
  }
  const far = Math.max(...corners.flat().map((c) => c.length()));
  const tris: Vec3[] = [];
  pts.forEach((p, i) => {
    const u = new Vector3(0, 1, 0).cross(p); if (u.lengthSq() < 1e-9) u.set(1, 0, 0); u.normalize();
    const v = new Vector3().crossVectors(p, u);
    const ring = corners[i].sort((m, n) => Math.atan2(m.dot(v), m.dot(u)) - Math.atan2(n.dot(v), n.dot(u)));
    for (let k = 1; k < ring.length - 1; k++) for (const c of [ring[0], ring[k], ring[k + 1]]) tris.push(c.clone().multiplyScalar(radius / far).toArray() as Vec3);
  });
  return tris;
}

// Coin: a thin 48-sided prism (round to the eye; the flats read as a milled rim). Only the two caps are faces,
// so it always reads heads or tails, even leaning on its rim: 1 = CARA (up), 2 = COROA (down).
function coin(): Polyhedron {
  const sides = 48, h = 0.08, R = RADIUS.coin, r = Math.sqrt(R * R - h * h);
  const at = (k: number, radius: number, y: number): Vec3 => [radius * Math.cos((2 * Math.PI * k) / sides), y, radius * Math.sin((2 * Math.PI * k) / sides)];
  const ring = (y: number) => Array.from({ length: sides }, (_, k) => at(k, r, y));
  const top = ring(h), bottom = ring(-h), up: Vec3 = [0, h, 0], down: Vec3 = [0, -h, 0];
  const triangles: number[] = [];
  for (let k = 0; k < sides; k++) {
    const n = (k + 1) % sides; // outward winding: both caps, then the rim quad
    triangles.push(...[up, top[n], top[k], down, bottom[k], bottom[n], top[k], top[n], bottom[n], top[k], bottom[n], bottom[k]].flat());
    // A raised ring near the edge of each cap (drawn only: the collider is the plain disc), so the light picks out a coin.
    for (const s of [1, -1]) for (const [r1, y1, r2, y2] of [[0.8, 0, 0.86, 0.025], [0.86, 0.025, 0.92, 0]]) {
      const [a, b, c, d] = [at(k, r1 * r, s * (h + y1)), at(k + 1, r1 * r, s * (h + y1)), at(k + 1, r2 * r, s * (h + y2)), at(k, r2 * r, s * (h + y2))];
      triangles.push(...(s > 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c]).flat());
    }
  }
  const faces: Face[] = [{ normal: [0, 1, 0], center: up, value: 1 }, { normal: [0, -1, 0], center: down, value: 2 }];
  const labelList: Label[] = faces.map((f) => ({ text: f.value === 1 ? 'Cara' : 'Coroa', symbol: f.value === 1 ? 'heads' : 'crown', value: f.value, position: f.center, normal: f.normal, up: [0, 0, -1] }));
  return { shape: 'coin', radius: R, points: [...top, ...bottom], triangles, faces, tops: [], labelList };
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
    case 'd100': return hundredTriangles(r);
    case 'coin': throw new Error('the coin is built by coin()');
  }
}

function build(shape: Shape): Polyhedron {
  return shape === 'coin' ? coin() : fromTriangles(shape, rawTriangles(shape));
}

// Faces, values and labels for a convex solid given as loose triangles (3 points each), centred on the origin.
// `numbering` overrides the default values (per face; d4: per vertex) and turns each numeral in steps of 360°/sides.
export interface Numbering { values?: number[]; turns?: number[] }
export function fromTriangles(shape: Shape, verts: Vec3[], numbering?: Numbering): Polyhedron {
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
    const sum = OPPOSITE_SUM[shape] ?? 0;
    const key = (f: Face) => [-round6(f.normal[1]), Math.atan2(round6(f.normal[2]), round6(f.normal[0]))];
    const order = faces.map((_, i) => i).sort((i, j) => {
      const [a, b] = [key(faces[i]), key(faces[j])];
      return a[0] - b[0] || a[1] - b[1];
    });
    // d100 has no exactly opposite faces: spread 1-100 over the sphere (37 is coprime with 100, so it's a permutation).
    if (shape === 'd100') order.forEach((f, rank) => { faces[f].value = ((rank * 37) % 100) + 1; });
    let next = shape === 'd10' ? 0 : 1;
    const done = new Set<number>();
    for (const i of shape === 'd100' ? [] : order) {
      if (done.has(i)) continue;
      let o = -1; // the most opposite face (exact on a regular die, the nearest on a modelled one)
      faces.forEach((g, j) => { if (o < 0 || dot(g.normal, faces[i].normal) < dot(faces[o].normal, faces[i].normal)) o = j; });
      faces[i].value = next;
      faces[o].value = sum - next;
      done.add(i).add(o);
      next++;
    }
  }

  const tops: Top[] = shape === 'd4' ? points.map((p, i) => ({ dir: unit(p), value: numbering?.values?.[i] ?? i + 1 })) : [];
  if (numbering?.values && shape !== 'd4') faces.forEach((f, i) => { f.value = numbering.values![i]; });

  const marked = shape === 'd10' || shape === 'd12' || shape === 'd20' || shape === 'd100';
  const text = (v: number) => (marked && (v === 6 || v === 9) ? `${v}.` : String(v));
  const labelList: Label[] = [];
  faces.forEach((f, i) => {
    if (shape === 'd4') {
      for (const j of faceVerts[i]) {
        const d = sub(points[j], f.center);
        labelList.push({
          text: String(tops[j].value), value: tops[j].value, normal: f.normal, up: unit(d),
          position: [f.center[0] + 0.55 * d[0], f.center[1] + 0.55 * d[1], f.center[2] + 0.55 * d[2]],
        });
      }
      return;
    }
    const project = (v: Vec3): Vec3 => { const k = dot(v, f.normal); return [v[0] - k * f.normal[0], v[1] - k * f.normal[1], v[2] - k * f.normal[2]]; };
    let up = project([0, 1, 0]);
    if (Math.hypot(...up) < 1e-6) up = project([0, 0, 1]);
    const turn = ((numbering?.turns?.[i] ?? 0) * 2 * Math.PI) / faceVerts[i].length;
    const upDir = turn ? new Vector3(...unit(up)).applyAxisAngle(new Vector3(...f.normal), turn).toArray() as Vec3 : unit(up);
    labelList.push({ text: text(f.value), value: f.value, position: f.center, normal: f.normal, up: upDir });
  });

  return { shape, radius: RADIUS[shape], points, triangles, faces, tops, labelList };
}

const cache = new Map<DieKind, Polyhedron>();
export function polyhedron(kind: DieKind): Polyhedron {
  let p = cache.get(kind);
  if (!p) {
    if (isCustom(kind)) {
      p = customPoly(kind);
      if (!p) throw new Error(`unknown imported die ${kind}`);
      return p; // the registry owns it
    }
    const base = BASE[kind], symbol = SYMBOL[kind];
    p = base === kind ? build(base) : polyhedron(base);
    // One label per face even when blank, so the showcase still finds the rolled face by value.
    if (symbol) p = { ...p, labelList: p.labelList.map((l) => ({ ...l, text: '', symbol: symbol(l.value) })) };
    cache.set(kind, p);
  }
  return p;
}

// A mixed selection, one entry per die, kept in KINDS order (e.g. ['d10', 'd12', 'd12']).
// Imported dice come after the built-in ones, in the order they were created.
const rank = (k: DieKind) => (isCustom(k) ? KINDS.length + customOrder(k) : KINDS.indexOf(k));
export const sortDice = (dice: DieKind[]): DieKind[] => [...dice].sort((a, b) => rank(a) - rank(b));
// Every kind that can be in a selection, in display order.
export const allKinds = (): DieKind[] => [...KINDS, ...customList().map((d) => customKind(d.id))];
// The physical shape behind a kind (imported dice report the base they were recognised as).
export const baseOf = (kind: DieKind): Shape => (isCustom(kind) ? customBase(kind) ?? 'd20' : BASE[kind]);
export const MAX_DICE = 10;
