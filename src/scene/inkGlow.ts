import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Matrix3, Matrix4, Mesh, MeshBasicMaterial, Vector3, type Object3D } from 'three';
import type { Vec3 } from '../physics/world';

// Triangles of an engraved model that face up when the die rests on the face whose outward normal is `down`
// (die space): inked (mask = 1) and cut into a solid face that looks within ~60° of straight up. The face is the one
// the triangle sits closest below (as `dentTester` in importer.ts reads it), so a numeral lights whole or not at all,
// whatever the slope of its walls. `centers`: 3 numbers per triangle.
export const UP_INK = 0.5; // ponytail: fixed cone; tune if real models light too little or too much
export function upInk(centers: ArrayLike<number>, mask: Uint8Array, faces: { normal: Vec3; center: Vec3 }[], down: Vec3, min = UP_INK): number[] {
  const out: number[] = [];
  for (let t = 0; t < mask.length; t++) {
    if (mask[t] !== 1) continue;
    const x = centers[t * 3], y = centers[t * 3 + 1], z = centers[t * 3 + 2];
    let owner = faces[0], least = Infinity;
    for (const f of faces) {
      const slack = f.normal[0] * (f.center[0] - x) + f.normal[1] * (f.center[1] - y) + f.normal[2] * (f.center[2] - z);
      if (slack < least) { least = slack; owner = f; }
    }
    if (owner && -(owner.normal[0] * down[0] + owner.normal[1] * down[1] + owner.normal[2] * down[2]) > min) out.push(t);
  }
  return out;
}

const LIFT = 0.004; // keeps the glow off the ink in the depth buffer

// The geometry of a glow is kept per `key` (die kind and rolled face): building it walks every triangle of the model.
// It is shared, so a glow's owner disposes only the material.
const kept = new Map<string, BufferGeometry>();

// One mesh in the die group's space with the up-facing inked triangles of every mesh under `model`.
export function glowMesh(model: Object3D, group: Object3D, faces: { normal: Vec3; center: Vec3 }[], down: Vec3, color: string, key?: string): Mesh | null {
  const cached = key ? kept.get(key) : undefined;
  if (cached) return lit(cached, color);
  group.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(group.matrixWorld).invert();
  const out: number[] = [];
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3(), hint = new Vector3(), tmp = new Vector3();
  model.traverseVisible((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry as BufferGeometry, mask = g.userData.ink as Uint8Array | undefined;
    if (!mask) return;
    const pos = g.getAttribute('position'), normal = g.getAttribute('normal');
    const rel = new Matrix4().multiplyMatrices(inverse, o.matrixWorld), normalMatrix = new Matrix3().getNormalMatrix(rel);
    const tri: Vector3[][] = [], centers: number[] = [];
    for (let t = 0; t < mask.length; t++) {
      a.fromBufferAttribute(pos, t * 3).applyMatrix4(rel);
      b.fromBufferAttribute(pos, t * 3 + 1).applyMatrix4(rel);
      c.fromBufferAttribute(pos, t * 3 + 2).applyMatrix4(rel);
      n.subVectors(b, a).cross(tmp.subVectors(c, a)).normalize();
      if (normal) { // the winding of an STL is not guaranteed: the stored normals say which side is out
        hint.set(0, 0, 0);
        for (let k = 0; k < 3; k++) hint.add(tmp.fromBufferAttribute(normal, t * 3 + k));
        hint.applyMatrix3(normalMatrix);
        if (n.dot(hint) < 0) n.negate();
      }
      centers.push((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3);
      tri.push([a.clone(), b.clone(), c.clone(), n.clone()]);
    }
    for (const t of upInk(centers, mask, faces, down)) {
      const [p, q, r, m] = tri[t];
      for (const v of [p, q, r]) out.push(v.x + m.x * LIFT, v.y + m.y * LIFT, v.z + m.z * LIFT);
    }
  });
  if (!out.length) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(out, 3));
  if (key) kept.set(key, geometry);
  return lit(geometry, color);
}

function lit(geometry: BufferGeometry, color: string): Mesh {
  // Same programme parameters as the symbols' material in Hand.tsx, so the compiled shader is reused (blending is GL state, not shader). Additive: it adds light on top of the ink, so the engraving shines instead of turning paler.
  const material = new MeshBasicMaterial({ color, transparent: true, blending: AdditiveBlending, opacity: 0, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'ink-glow';
  mesh.renderOrder = 10;
  return mesh;
}
