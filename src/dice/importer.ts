import { LoadingManager, Mesh, Vector3, type BufferGeometry, type Material, type Object3D, type Texture } from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Vec3 } from '../physics/world';
import { customKind, type CustomBase, type CustomDie, type StdBase } from './custom';
import { fromTriangles, OPPOSITE_SUM, RADIUS, type Numbering, type Polyhedron } from './polyhedra';

// Turns a die model (.stl / .glb) into a polyhedron the physics and the reader can use. Pure: tested in Node.
// The solid is rebuilt from the model's own face planes, so the collider matches the model, not a stock die.

export const LIMITS = { bytes: 10 * 1024 * 1024, triangles: 50_000, texture: 2048 };
// Tolerances (spec 6.1.5): hull triangles within GROUP of each other are one flat face; the N biggest faces must
// cover COVER of the hull, the next one must be under NEXT of the smallest of them, and the N must be alike
// within EVEN (a squashed box is no die). OPPOSITE: dot product that counts as "facing away".
const GROUP = Math.cos((3 * Math.PI) / 180), OPPOSITE = -0.995, COVER = 0.6, NEXT = 0.25, EVEN = 0.5;
const SIDES: StdBase[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const FACES: Record<StdBase, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };

// The message is shown to the player, in pt-BR. `code` lets the wizard offer another way in.
export class ImportError extends Error {
  code?: 'nao-padrao';
  constructor(message: string, code?: 'nao-padrao') { super(message); this.code = code; }
}
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

// `textureMax` lets another caller (the table importer) allow a bigger texture on some meshes.
export async function parseGlb(bytes: ArrayBuffer, textureMax: (mesh: Mesh) => number = () => LIMITS.texture): Promise<Object3D> {
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
        if (img && Math.max(img.width ?? 0, img.height ?? 0) > textureMax(o)) throw new ImportError(`Textura maior que ${textureMax(o)} px no modelo.`);
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

export function detectPlanes(positions: Float32Array): { base: StdBase; planes: Plane[] } {
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
  throw new ImportError('Não reconheci um d4–d20 nesse modelo. Ele precisa ser um sólido com 4, 6, 8, 10, 12 ou 20 faces planas.', 'nao-padrao');
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

// The corners of one plane, in counter-clockwise order seen from outside (so a fan of them is outward-wound).
function facePolygon({ n, d }: Plane, pts: Vec3[]): Vec3[] {
  const eps = Math.max(Math.abs(d), 1) * 1e-5;
  const on = pts.filter((p) => Math.abs(dot3(n, p) - d) < eps);
  if (on.length < 3) return on;
  const mid = [0, 1, 2].map((k) => on.reduce((s, p) => s + p[k], 0) / on.length) as Vec3;
  const u = new Vector3(...n).cross(Math.abs(n[1]) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize();
  const w = new Vector3(...n).cross(u);
  const angle = (p: Vec3) => { const r = new Vector3(...sub3(p, mid)); return Math.atan2(w.dot(r), u.dot(r)); };
  return on.sort((p, q) => angle(p) - angle(q));
}
const fan = (ring: Vec3[]): Vec3[] => ring.slice(2).flatMap((_, k) => [ring[0], ring[k + 1], ring[k + 2]]);
const polygonArea = (ring: Vec3[]) => ring.slice(2).reduce((s, _, k) => s + Math.hypot(...cross3(sub3(ring[k + 1], ring[0]), sub3(ring[k + 2], ring[0]))) / 2, 0);

// Centre of mass of a closed solid given as outward triangles (3 points each): tetrahedra from an inner point.
function volumeCentroid(tris: Vec3[]): Vec3 {
  const o = [0, 1, 2].map((k) => tris.reduce((s, p) => s + p[k], 0) / tris.length) as Vec3;
  let vol = 0;
  const sum: Vec3 = [0, 0, 0];
  for (let i = 0; i < tris.length; i += 3) {
    const [a, b, c] = [tris[i], tris[i + 1], tris[i + 2]];
    const v = dot3(sub3(a, o), cross3(sub3(b, o), sub3(c, o))) / 6;
    vol += v;
    for (let k = 0; k < 3; k++) sum[k] += (v * (o[k] + a[k] + b[k] + c[k])) / 4;
  }
  return [0, 1, 2].map((k) => sum[k] / vol) as Vec3;
}

// Is `p`, dropped onto the plane of a convex ring (outward normal n), inside the ring?
function insideConvex(p: Vec3, ring: Vec3[], n: Vec3): boolean {
  return ring.every((r, i) => dot3(n, cross3(sub3(ring[(i + 1) % ring.length], r), sub3(p, r))) >= -1e-9);
}

const FREE = { minArea: 0.1, minFaces: 3, maxFaces: 60, passes: 3 };
const noFlat = () => new ImportError('Esse modelo não tem faces planas para o dado parar.');

// Free-form dice: the faces a die can rest on. Small facets (under 10% of the biggest face) and faces that
// tip the die over (its centre of mass drops outside them) are left out, and the solid is rebuilt without them.
// Do the supporting faces come in sizes? With the areas biggest first, the first k (k >= 3) are alike (within 1.3x), the next
// is under TIER_DROP x the k-th, and at least k more faces follow (shard tips come in layers of k; a prism's two caps
// are only 2): a long shard die with facets on its tips. Returns k, or null.
// (0.70, not 0.65: the real D7 shard measures 0.657 between its long faces and its tips.)
const TIER_DROP = 0.7;
export function tierOf(areas: number[]): number | null {
  const a = [...areas].sort((x, y) => y - x);
  for (let k = 3; a.length - k >= k; k++) if (a[k] < TIER_DROP * a[k - 1] && a[0] <= 1.3 * a[k - 1]) return k;
  return null;
}
export const unevenOf = (areas: number[]) => Math.max(...areas) > 2 * Math.min(...areas);

export function detectFree(positions: Float32Array): { planes: Plane[]; dropped: number; uneven: boolean; tier: number | null; areas: number[] } {
  const all = flatFaces(positions);
  let keep: Plane[] = all.filter((f) => f.area >= FREE.minArea * all[0].area).map((f) => ({ n: f.n.toArray() as Vec3, d: f.d }));
  let dropped = all.length - keep.length;
  for (let pass = 0; pass < FREE.passes; pass++) {
    const pts = corners(keep);
    if (pts.length < 4) throw noFlat();
    const rings = keep.map((pl) => facePolygon(pl, pts));
    const c = volumeCentroid(rings.flatMap((r) => (r.length < 3 ? [] : fan(r))));
    const stable = keep.filter((pl, i) => rings[i].length >= 3 && insideConvex(c, rings[i], pl.n));
    if (stable.length === keep.length) break;
    dropped += keep.length - stable.length;
    keep = stable;
  }
  const pts = corners(keep);
  const all3 = pts.length < 4 ? [] : keep.map((pl) => ({ pl, ring: facePolygon(pl, pts) })).filter((x) => x.ring.length >= 3);
  keep = all3.map((x) => x.pl);
  const rings = all3.map((x) => x.ring);
  if (rings.length < FREE.minFaces || rings.length > FREE.maxFaces) {
    if (!rings.length) throw noFlat();
    throw new ImportError(`Encontrei ${rings.length} faces de apoio; um dado de forma livre precisa de ${FREE.minFaces} a ${FREE.maxFaces}.`);
  }
  const areas = rings.map(polygonArea);
  return { planes: keep, dropped, uneven: unevenOf(areas), tier: tierOf(areas), areas };
}

export interface Solid { poly: Polyhedron; fit: { center: Vec3; scale: number } }

// The polyhedron of a model's face planes, sized like the stock die of its base, plus the transform that puts
// the model's own mesh in the same place: a model point p sits at (p - center) * scale.
export function idealSolid(base: CustomBase, found: Plane[]): Solid {
  if (base === 'livre') return freeSolid(found);
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
    tris.push(...fan(facePolygon({ n, d }, on)));
  }
  if (faces !== FACES[base]) throw refuse('tem faces que não fecham um sólido');
  const scale = RADIUS[base] / Math.max(...pts.map((p) => Math.hypot(...p)));
  const poly = fromTriangles(base, tris.map((p) => [p[0] * scale, p[1] * scale, p[2] * scale]));
  if (poly.faces.length !== FACES[base]) throw refuse('tem faces que não fecham um sólido');
  return { poly, fit: { center, scale } };
}

// The solid of a free-form die: centred on its centre of mass, circumradius RADIUS.livre, read from the face it rests on.
function freeSolid(found: Plane[]): Solid {
  const first = corners(found);
  if (first.length < 4) throw noFlat();
  const rings0 = found.map((pl) => facePolygon(pl, first)).filter((r) => r.length >= 3);
  const center = volumeCentroid(rings0.flatMap(fan));
  const planes = found.map((pl) => ({ n: pl.n, d: pl.d - dot3(pl.n, center) }));
  const pts = corners(planes);
  const scale = RADIUS.livre / Math.max(...pts.map((p) => Math.hypot(...p)));
  const rings = planes.map((pl) => facePolygon(pl, pts).map((p): Vec3 => [p[0] * scale, p[1] * scale, p[2] * scale]));
  if (rings.some((r) => r.length < 3)) throw refuse('tem faces que não fecham um sólido');
  const poly = fromTriangles('livre', rings.flatMap(fan));
  if (poly.faces.length !== found.length) throw refuse('tem faces que não fecham um sólido');
  poly.readsDown = true;
  poly.font = 0.45 * Math.min(...rings.map(inradius));
  return { poly, fit: { center, scale } };
}

// Distance from the middle of a face (its ring of corners) to its nearest edge: the numeral must fit inside it.
function inradius(r: Vec3[]): number {
  const c = [0, 1, 2].map((k) => r.reduce((s, p) => s + p[k], 0) / r.length) as Vec3;
  return Math.min(...r.map((a, i) => { const e = sub3(r[(i + 1) % r.length], a); return Math.hypot(...cross3(e, sub3(c, a))) / Math.hypot(...e); }));
}
const ringOf = (poly: Polyhedron, f: Polyhedron['faces'][number]) => facePolygon({ n: f.normal, d: dot3(f.normal, f.center) }, poly.points);

// A free-form die read only from some of its faces (the `readable` normals; null = all). The solid and the collider stay
// whole: the other faces are tips it can rest on, but they are not a result, have no numeral and do not size it.
export function withReadable(poly: Polyhedron, readable: Vec3[] | null): Polyhedron {
  if (!readable) return poly;
  const reads = (n: Vec3) => readable.some((r) => dot3(r, n) > 0.9999);
  const faces = poly.faces.map((f) => (reads(f.normal) ? { ...f, readable: undefined } : { ...f, readable: false, value: 0 }));
  const keep = faces.filter((f) => f.readable !== false);
  if (keep.length === faces.length) return { ...poly, faces: poly.faces.map((f) => ({ ...f, readable: undefined })) };
  const labelList = poly.labelList.filter((l) => reads(l.normal));
  return { ...poly, faces, labelList, font: 0.45 * Math.min(...keep.map((f) => inradius(ringOf(poly, f)))) };
}

// Does the model have numerals cut into (or raised from) its faces? A numeral leaves vertices well below the plane
// of a face, in the middle of it. An edge chamfer also sits below the planes, but near an edge, so it does not count.
const DENT = 0.01, INTERIOR = 0.08, MIN_DENTS = 8;
// Is this model point sunk into the middle of a face (a numeral), by the rule above? `at(k)` is its coordinate k.
function dentTester({ poly, fit }: Solid): (at: (k: number) => number) => boolean {
  const R = RADIUS[poly.shape];
  const planes = poly.faces.map((f) => ({ n: f.normal, d: dot3(f.normal, f.center) }));
  return (at) => {
    const p: Vec3 = [0, 1, 2].map((k) => (at(k) - fit.center[k]) * fit.scale) as Vec3;
    const slack = planes.map((pl) => pl.d - dot3(pl.n, p)).sort((a, b) => a - b);
    return slack[0] > DENT * R && slack[1] > INTERIOR * R;
  };
}

// Ink mask per triangle (9 numbers each in `positions`): 1 when the middle of the triangle is cut into a face
// (a numeral), 0 elsewhere. Per triangle, not per vertex, so the edge of a numeral stays sharp once painted.
export function inkTriangles(positions: ArrayLike<number>, solid: Solid): Uint8Array {
  const dent = dentTester(solid), out = new Uint8Array(Math.floor(positions.length / 9));
  for (let t = 0; t < out.length; t++) {
    const i = t * 9;
    out[t] = dent((k) => (positions[i + k] + positions[i + 3 + k] + positions[i + 6 + k]) / 3) ? 1 : 0;
  }
  return out;
}

// The same mask spread over the vertices of each triangle, for the preview: 3 floats (grey) per vertex.
export function inkOf(positions: ArrayLike<number>, solid: Solid): Float32Array {
  const mask = inkTriangles(positions, solid), out = new Float32Array(positions.length);
  mask.forEach((m, t) => { if (m) out.fill(1, t * 9, t * 9 + 9); });
  return out;
}

export function looksNumbered(positions: Float32Array, solid: Solid): boolean {
  const dent = dentTester(solid);
  let lo = Infinity, hi = -Infinity;
  for (const x of positions) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const q = Math.max(hi - lo, 1e-9) * 1e-5, seen = new Set<string>();
  let total = 0, dents = 0;
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const key = `${Math.round(positions[i] / q)},${Math.round(positions[i + 1] / q)},${Math.round(positions[i + 2] / q)}`;
    if (seen.has(key)) continue;
    seen.add(key); total++;
    if (dent((k) => positions[i + k])) dents++;
  }
  return dents >= Math.max(MIN_DENTS, total * 0.01);
}

// --- numbering --------------------------------------------------------------------------------------------------

// The numbers allowed are 1..N (d10: 0..9, where "10" reads as 0); a d4 numbers its corners 1..4.
export const normaliseValues = (base: StdBase, values: number[]): number[] => values.map((v) => (base === 'd10' && v === 10 ? 0 : v));
// One value on its own: is it a number this die can show?
export function checkValue(base: StdBase, value: number): string | null {
  const n = FACES[base], first = base === 'd10' ? 0 : 1, v = normaliseValues(base, [value])[0];
  return Number.isInteger(v) && v >= first && v < first + n ? null : `Os números vão de ${first} a ${first + n - 1}${base === 'd10' ? ' (ou 10 no lugar do 0)' : ''}.`;
}
export function checkValues(base: StdBase, values: number[]): string | null {
  const n = FACES[base], got = normaliseValues(base, values);
  const range = values.map((v) => checkValue(base, v)).find(Boolean);
  if (range) return range;
  const seen = new Set<number>();
  for (const v of got) { if (seen.has(v)) return `O número ${v} apareceu mais de uma vez.`; seen.add(v); }
  return got.length === n ? null : 'Faltam números.';
}
// Free-form dice: any whole number from -99 to 999, repeats allowed (an average die has two 3s).
export const checkFreeValue = (v: number): string | null => (Number.isInteger(v) && v >= -99 && v <= 999 ? null : 'Use um número inteiro de -99 a 999.');
export function checkFreeValues(values: number[], count: number): string | null {
  if (values.length < count || values.some((v) => v === undefined || Number.isNaN(v))) return 'Faltam números.';
  return values.map(checkFreeValue).find(Boolean) ?? null;
}
// The opposite face's value on a standard layout: only a suggestion (balanced and spindown dice differ).
export const suggestOpposite = (base: StdBase, value: number): number | null => {
  const sum = OPPOSITE_SUM[base];
  return sum === undefined ? null : sum - value;
};
// Opposite faces side by side, so the answer for one suggests the next.
export function askOrder(poly: Polyhedron): number[] {
  if (poly.shape === 'd4') return poly.tops.map((_, i) => i);
  if (poly.readsDown) { // no opposite pairs: the biggest readable faces first
    const area = (i: number) => {
      const f = poly.faces[i], on = poly.points.filter((p) => Math.abs(dot3(f.normal, p) - dot3(f.normal, f.center)) < 1e-4);
      return polygonArea(facePolygon({ n: f.normal, d: dot3(f.normal, f.center) }, on));
    };
    return poly.faces.map((_, i) => i).filter((i) => poly.faces[i].readable !== false).sort((a, b) => area(b) - area(a));
  }
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
  const out = fromTriangles(poly.shape, tris, numbering);
  if (poly.readsDown) { out.readsDown = true; out.font = poly.font; } // free-form: keep how it is read and drawn
  const reads = poly.faces.filter((f) => f.readable !== false);
  return reads.length < poly.faces.length ? { ...withReadable(out, reads.map((f) => f.normal)), readsDown: true } : out;
}

// --- the whole import -------------------------------------------------------------------------------------------

export interface Imported<B extends CustomBase = StdBase> extends Solid {
  base: B; triangles: number; object: Object3D; hasNumbers: boolean;
  dropped?: number; uneven?: boolean; // free-form only: faces left out, and whether the faces are very unequal
  tier?: number | null; areas?: number[]; // free-form only: how many big faces when they come in sizes; the area of each face
}
// 'padrao' recognises a d4–d20; 'livre' takes any convex solid with 3 to 60 faces it can rest on.
export async function importModel(bytes: ArrayBuffer, format: ModelFormat): Promise<Imported>;
export async function importModel(bytes: ArrayBuffer, format: ModelFormat, mode: 'livre'): Promise<Imported<'livre'>>;
export async function importModel(bytes: ArrayBuffer, format: ModelFormat, mode: 'padrao' | 'livre' = 'padrao'): Promise<Imported<CustomBase>> {
  const model = await readModel(bytes, format);
  if (mode === 'livre') {
    const { planes, dropped, uneven, tier, areas } = detectFree(model.positions);
    const solid = idealSolid('livre', planes);
    return { base: 'livre', ...solid, triangles: model.triangles, object: model.object, hasNumbers: looksNumbered(model.positions, solid), dropped, uneven, tier, areas };
  }
  const { base, planes } = detectPlanes(model.positions);
  const solid = idealSolid(base, planes);
  return { base, ...solid, triangles: model.triangles, object: model.object, hasNumbers: looksNumbered(model.positions, solid) };
}

// --- showing the model in the scene -----------------------------------------------------------------------------

const loaded = new Map<string, Promise<Object3D>>();
// The model's own meshes, parsed once per die; callers clone it.
export function modelObject(die: CustomDie): Promise<Object3D> {
  const key = customKind(die.id);
  let p = loaded.get(key);
  if (!p) { p = readModel(die.file.bytes, die.file.format).then((m) => (die.printed ? withInkMask(m.object, die) : m.object)); loaded.set(key, p); }
  return p;
}

// Marks which triangles of each mesh are engraved numerals (`geometry.userData.ink`, 1 per triangle), once per die.
// It lives on the geometry, which a cloned mesh shares; Object3D.clone would copy a typed array in userData as JSON.
// The meshes are made non-indexed first, so triangle t owns vertices 3t..3t+2 and a colour attribute can follow it.
function withInkMask(root: Object3D, die: CustomDie): Object3D {
  root.updateWorldMatrix(true, true);
  const solid = { poly: die.poly, fit: die.fit }, v = new Vector3();
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    if (o.geometry.index) o.geometry = (o.geometry as BufferGeometry).toNonIndexed();
    const pos = (o.geometry as BufferGeometry).getAttribute('position'), flat = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).toArray(flat, i * 3);
    o.geometry.userData.ink = inkTriangles(flat, solid);
  });
  return root;
}
// Does any material of the model carry a texture of its own? (Then only dark ink or none suits it.)
export const hasTexture = (root: Object3D): boolean => {
  let found = false;
  root.traverse((o) => {
    if (o instanceof Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if ((m as Material & { map?: Texture | null }).map) found = true;
  });
  return found;
};
export const forgetModel = (kind: string) => { loaded.delete(kind); };
