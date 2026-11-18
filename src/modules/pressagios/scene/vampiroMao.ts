import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Group, Mesh, Vector3, type MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Vec3 } from '../../../shared/math.ts';

type Ring = [center: Vec3, width: number, depth: number];
const FRONT = new Vector3(0, 0, 1);

// One continuous surface per digit. The changes in radius form the joints and the last segment curls toward the palm.
function sculpt(rings: Ring[], steps = 22, sides = 12): BufferGeometry {
  const curve = new CatmullRomCurve3(rings.map(([p]) => new Vector3(...p)));
  const vertices: number[] = [], index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = t * (rings.length - 1);
    const k = Math.min(rings.length - 2, Math.floor(u));
    const [, w0, d0] = rings[k], [, w1, d1] = rings[k + 1];
    const w = w0 + (w1 - w0) * (u - k), d = d0 + (d1 - d0) * (u - k);
    const center = curve.getPoint(t), direction = curve.getTangent(t);
    const across = direction.clone().cross(FRONT).normalize(), normal = across.clone().cross(direction).normalize();
    for (let j = 0; j < sides; j++) {
      const a = 2 * Math.PI * j / sides;
      const p = center.clone().addScaledVector(across, w * Math.cos(a)).addScaledVector(normal, d * Math.sin(a));
      vertices.push(p.x, p.y, p.z);
      if (i === steps) continue;
      const x = i * sides + j, y = i * sides + (j + 1) % sides;
      index.push(x, x + sides, y, y, x + sides, y + sides);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const nailOf = (tip: Vec3, side: number, curve: number) => sculpt([
  [[tip[0], tip[1] - 0.061, tip[2] - 0.049], 0.008, 0.007],
  [[tip[0], tip[1] - 0.018, tip[2] - 0.044], 0.029, 0.014],
  [[tip[0], tip[1] + 0.033, tip[2] - 0.026], 0.039, 0.023],
  [[tip[0] - 0.016 * side, tip[1] + 0.106, tip[2] + curve * 0.40], 0.025, 0.017],
  [[tip[0] - 0.034 * side, tip[1] + 0.177, tip[2] + curve], 0.001, 0.001],
], 12, 10);

// In the figure the dice sit here, in front of the palm and under the arch of the fingers.
export const CENTRO_DA_PEGA: Vec3 = [0, 0.25, 0.16];

export function maoDoVampiro(side: number, skin: MeshStandardMaterial, nail: MeshStandardMaterial, camera = false): Group {
  const group = new Group();
  const flesh = [sculpt([
    [[0, -0.44, -0.04], 0.001, 0.001],
    [[0, -0.34, -0.034], 0.123, 0.081],
    [[0, -0.18, -0.02], 0.162, 0.103],
    [[0.014 * side, 0.01, 0], 0.237, 0.131],
    [[0.009 * side, 0.19, -0.025], 0.245, 0.112],
    [[0.009 * side, 0.31, -0.035], 0.203, 0.073],
    [[0, 0.35, -0.035], 0.003, 0.008],
  ])];
  const claws: BufferGeometry[] = [];
  const lengths = [0.49, 0.60, 0.55, 0.41];
  for (const [i, length] of lengths.entries()) {
    const x = (i - 1.5) * side;
    const startY = 0.25 - 0.018 * i;
    const curl = camera ? 0.035 + i * 0.014 : 0.226 - i * 0.025;
    const spread = camera ? 0.216 : 0.162;
    const tip: Vec3 = [x * spread, startY + length, curl];
    const taper = 1 - i * 0.05;
    flesh.push(sculpt([
      [[x * 0.113, startY - 0.07, -0.04], 0.079 * taper, 0.060 * taper],
      [[x * 0.132, startY + length * 0.16, -0.046], 0.068 * taper, 0.055 * taper],
      [[x * 0.153, startY + length * 0.47, -0.035], 0.058 * taper, 0.044 * taper],
      [[x * spread * 0.9, startY + length * 0.61, curl * 0.30], 0.061 * taper, 0.049 * taper],
      [[x * spread * 0.97, startY + length * 0.81, curl * 0.71], 0.048 * taper, 0.037 * taper],
      [tip, 0.033 * taper, 0.027 * taper],
      [[tip[0], tip[1] + 0.026, tip[2] + 0.019], 0.006, 0.006],
    ]));
    claws.push(nailOf(tip, x, camera ? 0.048 : 0.062));
  }
  const thumb: Vec3 = [-side * (camera ? 0.445 : 0.245), camera ? 0.295 : 0.355, camera ? 0.065 : 0.239];
  flesh.push(sculpt([
    [[-0.069 * side, -0.14, -0.024], 0.076, 0.074],
    [[-0.172 * side, -0.068, 0.031], 0.109, 0.083],
    [[-0.304 * side, 0.065, 0.080], 0.077, 0.069],
    [[-0.33 * side, 0.17, thumb[2] * 0.73], 0.066, 0.053],
    [thumb, 0.036, 0.029],
    [[thumb[0], thumb[1] + 0.025, thumb[2] + 0.014], 0.008, 0.008],
  ]));
  claws.push(nailOf(thumb, -side * 0.6, 0.055));

  for (const [pieces, material] of [[flesh, skin], [claws, nail]] as const) {
    const geometry = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    if (!geometry) throw new Error('Could not batch Vampire hand geometry');
    group.add(new Mesh(geometry, material));
  }
  return group;
}
