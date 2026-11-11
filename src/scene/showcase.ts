import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Polyhedron } from '../dice/polyhedra';
import { MAX_RADIUS, type Quat, type Vec3 } from '../physics/world';

export type Pose = { p: Vec3; q: Quat };
export interface View { position: Vector3; quaternion: Quaternion; fov: number; aspect: number }

const SPACING = 2 * MAX_RADIUS + 0.2;
const MIN_DISTANCE = 6; // one die must not fill the screen
// A coin's Cara/Coroa sits under the coin (size relative to the floating number, gap under the rim); rows with
// coins move apart by `room` so the name clears the row below.
export const CAPTION = { scale: 0.8, gap: 0.38, room: 0.45 };

// Where each die rests in front of the camera after a roll: a row (wrapping into more rows), in result order,
// each turned so the face that came up looks straight at the camera (centred in its own silhouette) with its number upright.
// `raw` is each body's up value (d10 digit, d4 vertex value).
export function showcasePoses(polys: Polyhedron[], raw: number[], view: View): Pose[] {
  const n = polys.length;
  const cols = Math.min(n, view.aspect >= 1 ? 5 : 3);
  const rows = Math.ceil(n / cols);
  const rowSpacing = SPACING + (polys.some((p) => p.shape === 'coin') ? CAPTION.room : 0);
  const tan = Math.tan((view.fov * Math.PI) / 360);
  const x = (col: number) => col * SPACING;
  const width = x(cols - 1) + SPACING;
  const distance = Math.max(MIN_DISTANCE, 1.15 * Math.max(width / 2 / (tan * view.aspect), (rows * rowSpacing) / 2 / tan));
  const right = new Vector3(1, 0, 0).applyQuaternion(view.quaternion);
  const up = new Vector3(0, 1, 0).applyQuaternion(view.quaternion);
  const back = new Vector3(0, 0, 1).applyQuaternion(view.quaternion);
  const center = view.position.clone().addScaledVector(back, -distance);
  return polys.map((poly, i) => {
    const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i % cols;
    const p = center.clone()
      .addScaledVector(right, x(col) - x(inRow - 1) / 2)
      .addScaledVector(up, ((rows - 1) / 2 - row) * rowSpacing);
    const label = poly.labelList.find((l) => l.value === raw[i]);
    if (!label) throw new Error(`${poly.shape} has no number ${raw[i]}`);
    const ln = new Vector3(...label.normal), lu = new Vector3(...label.up);
    const local = new Matrix4().makeBasis(new Vector3().crossVectors(lu, ln), lu, ln);
    const toCam = view.position.clone().sub(p).normalize();
    const r = new Vector3().crossVectors(up, toCam).normalize();
    const world = new Matrix4().makeBasis(r, new Vector3().crossVectors(toCam, r), toCam);
    const q = new Quaternion().setFromRotationMatrix(world.multiply(local.transpose()));
    return { p: p.toArray() as Vec3, q: q.toArray() as Quat };
  });
}
