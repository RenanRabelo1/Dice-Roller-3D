import { Euler, Quaternion, Vector3 } from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import { registerCustom, type StdBase, type CustomDie } from '../../src/dice/custom';
import { detectPlanes, idealSolid } from '../../src/dice/importer';
import { polyhedron, type Polyhedron } from '../../src/dice/polyhedra';

// Die models made from the app's own solids, standing in for files a player would import.

// The solid as loose triangles, optionally chamfered (every corner of every face pulled in by `bevel`),
// then turned, scaled (a mm-sized model) and moved off the origin, like a model from a slicer.
export function modelTriangles(poly: Polyhedron, { bevel = 0, scale = 25, engrave = 0 } = {}): Float32Array {
  const pts: Vector3[] = [];
  const t = poly.triangles;
  for (let i = 0; i < t.length; i += 9) {
    const tri = [0, 3, 6].map((k) => new Vector3(t[i + k], t[i + k + 1], t[i + k + 2]));
    const n = new Vector3().crossVectors(tri[1].clone().sub(tri[0]), tri[2].clone().sub(tri[0])).normalize();
    const f = poly.faces.find((g) => new Vector3(...g.normal).distanceTo(n) < 1e-4)!;
    for (const v of tri) pts.push(v.lerp(new Vector3(...f.center), bevel));
  }
  const q = new Quaternion().setFromEuler(new Euler(0.7, 1.1, -0.4));
  const moved = (v: Vector3) => v.clone().applyQuaternion(q).multiplyScalar(scale).add(new Vector3(30, -12, 7));
  const hull = new ConvexHull().setFromPoints(pts.map(moved));
  const out: number[] = [];
  // Engraving: a hexagonal pit in the middle of every face, `engrave` deep (as a share of the radius).
  if (engrave) for (const f of poly.faces) {
    const n = new Vector3(...f.normal), c = new Vector3(...f.center);
    const u = new Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize(), w = new Vector3().crossVectors(n, u);
    const rim = Array.from({ length: 6 }, (_, k) => c.clone().addScaledVector(u, 0.12 * Math.cos((k * Math.PI) / 3) * poly.radius).addScaledVector(w, 0.12 * Math.sin((k * Math.PI) / 3) * poly.radius));
    const floor = rim.map((r) => r.clone().addScaledVector(n, -engrave * poly.radius));
    for (let k = 0; k < 6; k++) for (const p of [rim[k], floor[k], floor[(k + 1) % 6], rim[k], floor[(k + 1) % 6], rim[(k + 1) % 6]]) { const m = moved(p); out.push(m.x, m.y, m.z); }
  }
  for (const f of hull.faces) {
    const ring: Vector3[] = [];
    let e = f.edge;
    do { ring.push(e.head().point); e = e.next; } while (e !== f.edge);
    for (let k = 1; k < ring.length - 1; k++) for (const p of [ring[0], ring[k], ring[k + 1]]) out.push(p.x, p.y, p.z);
  }
  return Float32Array.from(out);
}

export const stockPoly = (base: StdBase) => polyhedron(base);

// Binary STL for a triangle soup.
export function stl(positions: Float32Array): ArrayBuffer {
  const n = positions.length / 9, buf = new ArrayBuffer(84 + 50 * n), view = new DataView(buf);
  view.setUint32(80, n, true);
  for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) view.setFloat32(84 + 50 * t + 12 + k * 4, positions[t * 9 + k], true); // normal left zero
  return buf;
}

// A self-contained GLB (or one pointing at an outside file) for a triangle soup.
export function glb(positions: Float32Array, uri?: string): ArrayBuffer {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) { lo[i % 3] = Math.min(lo[i % 3], positions[i]); hi[i % 3] = Math.max(hi[i % 3], positions[i]); }
  const json = JSON.stringify({
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: lo, max: hi }],
    bufferViews: [{ buffer: 0, byteLength: positions.byteLength }],
    buffers: [uri ? { uri, byteLength: positions.byteLength } : { byteLength: positions.byteLength }],
  });
  const pad = (n: number) => (4 - (n % 4)) % 4;
  const jsonBytes = new TextEncoder().encode(json + ' '.repeat(pad(json.length)));
  const binLen = positions.byteLength + pad(positions.byteLength);
  const total = 12 + 8 + jsonBytes.length + 8 + binLen;
  const out = new ArrayBuffer(total), view = new DataView(out);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length, true); view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out, 20, jsonBytes.length).set(jsonBytes);
  const at = 20 + jsonBytes.length;
  view.setUint32(at, binLen, true); view.setUint32(at + 4, 0x004e4942, true);
  new Uint8Array(out, at + 8, positions.byteLength).set(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength));
  return out;
}

// A registered imported die built from the app's own solid (chamfered, off-centre, in mm), as the importer would.
export function customDieOf(base: StdBase, name: string, slug: string, { omens = true, bevel = 0.08 } = {}): CustomDie {
  const positions = modelTriangles(polyhedron(base), { bevel });
  const { planes } = detectPlanes(positions), { poly, fit } = idealSolid(base, planes);
  const die: CustomDie = {
    version: 1, id: `test-${slug}`, createdAt: Date.now(), name, slug, base, omens,
    file: { format: 'stl', name: `${slug}.stl`, bytes: stl(positions) }, fit, poly, printed: false, color: null,
  };
  registerCustom(die);
  return die;
}

// Every triangle cut into n² coplanar ones: the same die, but heavy (a printed die's engraving, in effect).
export function subdivided(positions: Float32Array, n: number): Float32Array {
  const out: number[] = [];
  for (let t = 0; t < positions.length; t += 9) {
    const [a, b, c] = [0, 3, 6].map((k) => new Vector3(positions[t + k], positions[t + k + 1], positions[t + k + 2]));
    const at = (i: number, j: number) => a.clone().addScaledVector(b.clone().sub(a), i / n).addScaledVector(c.clone().sub(a), j / n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
      for (const p of [at(i, j), at(i + 1, j), at(i, j + 1)]) out.push(p.x, p.y, p.z);
      if (i + j < n - 1) for (const p of [at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]) out.push(p.x, p.y, p.z);
    }
  }
  return Float32Array.from(out);
}
