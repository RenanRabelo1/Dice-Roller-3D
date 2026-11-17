import { Mesh, Vector3, type BufferGeometry, type Material, type Object3D, type Texture } from 'three';
import { dot, type Vec3 } from '../../../shared/math.ts';
import type { CustomDie } from '../contracts.ts';
import { RADIUS } from './solidos.ts';

// The engraving of an imported die: which points and triangles of its model are numerals cut into the faces. Pure
// (no file reading, so no GLB/STL loaders): meus-dados, the preview and domain/modelo.ts use it.

type Solid = Pick<CustomDie, 'poly' | 'fit'>;

// Does the model have numerals cut into (or raised from) its faces? A numeral leaves vertices well below the plane
// of a face, in the middle of it. An edge chamfer also sits below the planes, but near an edge, so it does not count.
const DENT = 0.01, INTERIOR = 0.08;
// A free-form die's numerals often sit on narrow faces, close to an edge. Measured on a real D5 shard: edge chamfers stay
// within 0.021 R of the second face, numerals start at 0.046 R. (d4–d20 keep INTERIOR.)
const INTERIOR_FREE = 0.03;
// Is this model point sunk into the middle of a face (a numeral), by the rule above? `at(k)` is its coordinate k.
export function dentTester({ poly, fit }: Solid): (at: (k: number) => number) => boolean {
  const R = RADIUS[poly.shape], interior = poly.shape === 'livre' ? INTERIOR_FREE : INTERIOR;
  const planes = poly.faces.map((f) => ({ n: f.normal, d: dot(f.normal, f.center) }));
  return (at) => {
    const p: Vec3 = [0, 1, 2].map((k) => (at(k) - fit.center[k]) * fit.scale) as Vec3;
    const slack = planes.map((pl) => pl.d - dot(pl.n, p)).sort((a, b) => a - b);
    return slack[0] > DENT * R && slack[1] > interior * R;
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

// Marks which triangles of each mesh are engraved numerals (`geometry.userData.ink`, 1 per triangle), once per die.
// It lives on the geometry, which a cloned mesh shares; Object3D.clone would copy a typed array in userData as JSON.
// The meshes are made non-indexed first, so triangle t owns vertices 3t..3t+2 and a colour attribute can follow it.
export function markInk(root: Object3D, solid: Solid): Object3D {
  root.updateWorldMatrix(true, true);
  const v = new Vector3();
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
