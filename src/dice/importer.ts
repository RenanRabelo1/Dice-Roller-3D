import { LoadingManager, Mesh, Vector3, type BufferGeometry, type Material, type Object3D, type Texture } from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Vec3 } from '../physics/world';
import { customKind, type CustomBase, type CustomDie } from './custom';
import { fromTriangles, OPPOSITE_SUM, RADIUS, type Numbering, type Polyhedron } from './polyhedra';

// Turns a die model (.stl / .glb) into a polyhedron the physics and the reader can use. Pure: tested in Node.
// The solid is rebuilt from the model's own face planes, so the collider matches the model, not a stock die.

export const LIMITS = { bytes: 10 * 1024 * 1024, triangles: 50_000, texture: 2048 };
// Tolerances (spec 6.1.5): hull triangles within GROUP of each other are one flat face; the N biggest faces must
// cover COVER of the hull, the next one must be under NEXT of the smallest of them, and the N must be alike
// within EVEN (a squashed box is no die). OPPOSITE: dot product that counts as "facing away".
const GROUP = Math.cos((3 * Math.PI) / 180), OPPOSITE = -0.995, COVER = 0.6, NEXT = 0.25, EVEN = 0.5;
const SIDES: CustomBase[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const FACES: Record<CustomBase, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };

export class ImportError extends Error {} // the message is shown to the player, in pt-BR
export type ModelFormat = 'stl' | 'glb';

export const formatOf = (name: string): ModelFormat | null => {
  const ext = name.toLowerCase().split('.').pop();
  return ext === 'stl' || ext === 'glb' ? ext : null;
};

// --- reading the file -------------------------------------------------------------------------------------------

export interface Model { positions: Float32Array; triangles: number; object: Object3D } // positions: 9 floats per triangle

function collect(root: Object3D): { positions: Float32Array; triangles: number } {
  root.updateWorldMatrix(true, true);
  const out: number[] = [];
  const v = new Vector3();
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry as BufferGeometry, pos = g.getAttribute('position');
    const at = (i: number) => { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); out.push(v.x, v.y, v.z); };
    if (g.index) for (let i = 0; i + 2 < g.index.count; i += 3) for (let k = 0; k < 3; k++) at(g.index.getX(i + k));
    else for (let i = 0; i + 2 < pos.count; i += 3) for (let k = 0; k < 3; k++) at(i + k);
  });
  return { positions: Float32Array.from(out), triangles: out.length / 9 };
}

const refuse = (what: string) => new ImportError(`O arquivo ${what}.`);

async function parseGlb(bytes: ArrayBuffer): Promise<Object3D> {
  // Nothing may come from the network: only data:/blob: URLs load, anything else fails the parse.
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (/^(data|blob):/i.test(url)) return url;
    throw new ImportError('O GLB precisa ser autocontido (sem arquivos externos).');
  });
  const gltf = await new GLTFLoader(manager).parseAsync(bytes, '');
  gltf.scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const t of Object.values(m as Material & Record<string, unknown>)) {
        const img = t && (t as Texture).isTexture ? ((t as Texture).image as { width?: number; height?: number } | null) : null;
        if (img && Math.max(img.width ?? 0, img.height ?? 0) > LIMITS.texture) throw new ImportError(`Textura maior que ${LIMITS.texture} px no modelo.`);
      }
    }
  });
  return gltf.scene;
}

export async function readModel(bytes: ArrayBuffer, format: ModelFormat): Promise<Model> {
  if (bytes.byteLength > LIMITS.bytes) throw refuse(`passa de ${LIMITS.bytes / 1024 / 1024} MB`);
  if (!bytes.byteLength) throw refuse('está vazio');
  let object: Object3D;
  try {
    if (format === 'stl') {
      const geometry = new STLLoader().parse(bytes);
      geometry.computeVertexNormals(); // many exporters leave the normals zero
      object = new Mesh(geometry);
    } else object = await parseGlb(bytes);
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw refuse(`não parece um ${format.toUpperCase()} válido`);
  }
  const { positions, triangles } = collect(object);
  if (!triangles) throw refuse('não tem nenhum triângulo');
  if (triangles > LIMITS.triangles) throw refuse(`tem ${triangles} triângulos; o máximo é ${LIMITS.triangles}`);
  return { positions, triangles, object };
}

// --- recognising the shape --------------------------------------------------------------------------------------

export interface Plane { n: Vec3; d: number } // n · x = d, n outward

// Flat faces of the model's convex hull: hull triangles grouped by normal, biggest first.
function flatFaces(positions: Float32Array): { n: Vector3; d: number; area: number }[] {
  let lo = Infinity, hi = -Infinity;
  for (const x of positions) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const q = Math.max(hi - lo, 1e-9) * 1e-5, seen = new Set<string>(), pts: Vector3[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const key = `${Math.round(positions[i] / q)},${Math.round(positions[i + 1] / q)},${Math.round(positions[i + 2] / q)}`;
    if (!seen.has(key)) { seen.add(key); pts.push(new Vector3(positions[i], positions[i + 1], positions[i + 2])); }
  }
  if (pts.length < 4) throw refuse('não tem volume');
  let hull: ConvexHull;
  try { hull = new ConvexHull().setFromPoints(pts); } catch { throw refuse('não tem volume'); }
  const tris: { n: Vector3; c: Vector3; area: number }[] = [];
  for (const f of hull.faces) {
    const ring: Vector3[] = [];
    let e = f.edge;
    do { ring.push(e.head().point); e = e.next; } while (e !== f.edge);
    for (let k = 1; k < ring.length - 1; k++) {
      const area = new Vector3().crossVectors(ring[k].clone().sub(ring[0]), ring[k + 1].clone().sub(ring[0])).length() / 2;
      if (area > 0) tris.push({ n: f.normal.clone(), c: ring[0].clone().add(ring[k]).add(ring[k + 1]).divideScalar(3), area });
    }
  }
  tris.sort((a, b) => b.area - a.area);
  const groups: { seed: Vector3; sum: Vector3; area: number; members: typeof tris }[] = [];
  for (const t of tris) {
    const g = groups.find((x) => x.seed.dot(t.n) > GROUP);
    if (g) { g.sum.addScaledVector(t.n, t.area); g.area += t.area; g.members.push(t); }
    else groups.push({ seed: t.n, sum: t.n.clone().multiplyScalar(t.area), area: t.area, members: [t] });
  }
  return groups.sort((a, b) => b.area - a.area).map((g) => {
    const n = g.sum.clone().normalize();
    return { n, area: g.area, d: g.members.reduce((s, t) => s + t.area * n.dot(t.c), 0) / g.area };
  });
}

export function detectPlanes(positions: Float32Array): { base: CustomBase; planes: Plane[] } {
  const faces = flatFaces(positions), total = faces.reduce((s, f) => s + f.area, 0);
  for (const base of SIDES) {
    const N = FACES[base];
    if (faces.length < N) continue;
    const top = faces.slice(0, N), smallest = top[N - 1].area;
    if (top.reduce((s, f) => s + f.area, 0) < COVER * total) continue;
    if (faces.length > N && faces[N].area >= NEXT * smallest) continue;
    if (smallest < EVEN * top[0].area) continue;
    if (base !== 'd4' && !top.every((f) => top.some((g) => g !== f && g.n.dot(f.n) < OPPOSITE))) continue;
    return { base, planes: top.map((f) => ({ n: f.n.toArray() as Vec3, d: f.d })) };
  }
  throw new ImportError('Não reconheci um d4–d20 nesse modelo. Ele precisa ser um sólido com 4, 6, 8, 10, 12 ou 20 faces planas.');
}

// --- the ideal solid --------------------------------------------------------------------------------------------

const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const det3 = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

// Pairs opposite planes and makes each pair exactly opposite and equally far from the origin. Returns the centre
// the pairs were measured around (least squares) in the model's own frame, so the solid ends up centred on 0.
function symmetrise(planes: Plane[]): { planes: Plane[]; center: Vec3 } {
  const left = planes.map((_, i) => i), out: Plane[] = [], rows: { n: Vec3; b: number }[] = [];
  while (left.length) {
    const i = left.shift()!;
    let best = 0;
    left.forEach((j, k) => { if (dot3(planes[j].n, planes[i].n) < dot3(planes[left[best]].n, planes[i].n)) best = k; });
    const [a, b] = [planes[i], planes[left.splice(best, 1)[0]]];
    const n = new Vector3(...a.n).sub(new Vector3(...b.n)).normalize().toArray() as Vec3, h = (a.d + b.d) / 2;
    rows.push({ n, b: (a.d - b.d) / 2 });
    out.push({ n, d: h }, { n: [-n[0], -n[1], -n[2]], d: h });
  }
  // (Σ n nᵀ) c = Σ n b by Cramer's rule.
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r: Vec3 = [0, 0, 0];
  for (const { n, b } of rows) for (let x = 0; x < 3; x++) { r[x] += n[x] * b; for (let y = 0; y < 3; y++) M[x][y] += n[x] * n[y]; }
  const D = det3(M);
  if (!Number.isFinite(D) || Math.abs(D) < 1e-9) throw refuse('não tem faces suficientes para formar um dado');
  const center = [0, 1, 2].map((c) => det3(M.map((row, x) => row.map((v, y) => (y === c ? r[x] : v)))) / D) as Vec3;
  return { planes: out, center };
}

// Corners where three planes meet and every plane still holds.
function corners(planes: Plane[]): Vec3[] {
  const eps = Math.max(...planes.map((p) => Math.abs(p.d))) * 1e-6, pts: Vec3[] = [];
  for (let i = 0; i < planes.length; i++) for (let j = i + 1; j < planes.length; j++) for (let k = j + 1; k < planes.length; k++) {
    const [a, b, c] = [planes[i], planes[j], planes[k]], det = dot3(a.n, cross3(b.n, c.n));
    if (Math.abs(det) < 1e-6) continue;
    const bc = cross3(b.n, c.n), ca = cross3(c.n, a.n), ab = cross3(a.n, b.n);
    const x = [0, 1, 2].map((m) => (a.d * bc[m] + b.d * ca[m] + c.d * ab[m]) / det) as Vec3;
    if (planes.some((p) => dot3(p.n, x) > p.d + eps)) continue;
    if (!pts.some((p) => Math.hypot(...sub3(p, x)) < eps * 10)) pts.push(x);
  }
  return pts;
}

export interface Solid { poly: Polyhedron; fit: { center: Vec3; scale: number } }

// The polyhedron of a model's face planes, sized like the stock die of its base, plus the transform that puts
// the model's own mesh in the same place: a model point p sits at (p - center) * scale.
export function idealSolid(base: CustomBase, found: Plane[]): Solid {
  let planes = found, center: Vec3;
  if (base === 'd4') {
    const v = corners(found);
    center = [0, 1, 2].map((k) => v.reduce((s, p) => s + p[k], 0) / v.length) as Vec3;
    planes = found.map((p) => ({ n: p.n, d: p.d - dot3(p.n, center) })); // same solid, centred
  } else ({ planes, center } = symmetrise(found));
  const pts = corners(planes), eps = Math.max(...planes.map((p) => Math.abs(p.d))) * 1e-5;
  const tris: Vec3[] = [];
  let faces = 0;
  for (const { n, d } of planes) {
    const on = pts.filter((p) => Math.abs(dot3(n, p) - d) < eps);
    if (on.length < 3) continue;
    faces++;
    const mid = [0, 1, 2].map((k) => on.reduce((s, p) => s + p[k], 0) / on.length) as Vec3;
    const u = new Vector3(...n).cross(Math.abs(n[1]) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize();
    const w = new Vector3(...n).cross(u);
    const angle = (p: Vec3) => { const r = new Vector3(...sub3(p, mid)); return Math.atan2(w.dot(r), u.dot(r)); };
    const ring = on.sort((p, q) => angle(p) - angle(q));
    for (let k = 1; k < ring.length - 1; k++) tris.push(ring[0], ring[k], ring[k + 1]);
  }
  if (faces !== FACES[base]) throw refuse('tem faces que não fecham um sólido');
  const scale = RADIUS[base] / Math.max(...pts.map((p) => Math.hypot(...p)));
  const poly = fromTriangles(base, tris.map((p) => [p[0] * scale, p[1] * scale, p[2] * scale]));
  if (poly.faces.length !== FACES[base]) throw refuse('tem faces que não fecham um sólido');
  return { poly, fit: { center, scale } };
}

// --- numbering --------------------------------------------------------------------------------------------------

// The numbers allowed are 1..N (d10: 0..9, where "10" reads as 0); a d4 numbers its corners 1..4.
export const normaliseValues = (base: CustomBase, values: number[]): number[] => values.map((v) => (base === 'd10' && v === 10 ? 0 : v));
// One value on its own: is it a number this die can show?
export function checkValue(base: CustomBase, value: number): string | null {
  const n = FACES[base], first = base === 'd10' ? 0 : 1, v = normaliseValues(base, [value])[0];
  return Number.isInteger(v) && v >= first && v < first + n ? null : `Os números vão de ${first} a ${first + n - 1}${base === 'd10' ? ' (ou 10 no lugar do 0)' : ''}.`;
}
export function checkValues(base: CustomBase, values: number[]): string | null {
  const n = FACES[base], got = normaliseValues(base, values);
  const range = values.map((v) => checkValue(base, v)).find(Boolean);
  if (range) return range;
  const seen = new Set<number>();
  for (const v of got) { if (seen.has(v)) return `O número ${v} apareceu mais de uma vez.`; seen.add(v); }
  return got.length === n ? null : 'Faltam números.';
}
// The opposite face's value on a standard layout: only a suggestion (balanced and spindown dice differ).
export const suggestOpposite = (base: CustomBase, value: number): number | null => {
  const sum = OPPOSITE_SUM[base];
  return sum === undefined ? null : sum - value;
};
// Opposite faces side by side, so the answer for one suggests the next.
export function askOrder(poly: Polyhedron): number[] {
  if (poly.shape === 'd4') return poly.tops.map((_, i) => i);
  const order: number[] = [], done = new Set<number>();
  poly.faces.forEach((f, i) => {
    if (done.has(i)) return;
    let o = -1;
    poly.faces.forEach((g, j) => { if (j !== i && !done.has(j) && (o < 0 || dot3(g.normal, f.normal) < dot3(poly.faces[o].normal, f.normal))) o = j; });
    order.push(i, o); done.add(i).add(o);
  });
  return order;
}
// Same solid, new values (per face; d4: per corner) and numeral turns.
export function renumbered(poly: Polyhedron, numbering: Numbering): Polyhedron {
  const tris: Vec3[] = [];
  for (let i = 0; i < poly.triangles.length; i += 3) tris.push([poly.triangles[i], poly.triangles[i + 1], poly.triangles[i + 2]]);
  return fromTriangles(poly.shape, tris, numbering);
}

// --- the whole import -------------------------------------------------------------------------------------------

export interface Imported extends Solid { base: CustomBase; triangles: number; object: Object3D }
export async function importModel(bytes: ArrayBuffer, format: ModelFormat): Promise<Imported> {
  const model = await readModel(bytes, format);
  const { base, planes } = detectPlanes(model.positions);
  return { base, ...idealSolid(base, planes), triangles: model.triangles, object: model.object };
}

// --- showing the model in the scene -----------------------------------------------------------------------------

const loaded = new Map<string, Promise<Object3D>>();
// The model's own meshes, parsed once per die; callers clone it.
export function modelObject(die: CustomDie): Promise<Object3D> {
  const key = customKind(die.id);
  let p = loaded.get(key);
  if (!p) { p = readModel(die.file.bytes, die.file.format).then((m) => m.object); loaded.set(key, p); }
  return p;
}
export const forgetModel = (kind: string) => { loaded.delete(kind); };
