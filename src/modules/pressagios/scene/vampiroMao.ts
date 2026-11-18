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
    const across = direction.clone().cross(FRONT);
    if (across.lengthSq() < 1e-6) across.set(0, 1, 0).cross(direction);
    across.normalize();
    const normal = across.clone().cross(direction).normalize();
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

function finish(pieces: BufferGeometry[]) {
  const geometry = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  if (!geometry) throw new Error('Could not batch Vampire hand geometry');
  return geometry;
}

function palmOf(side: number) {
  return sculpt([
    [[0, -0.44, -0.04], 0.001, 0.001],
    [[0, -0.34, -0.034], 0.123, 0.081],
    [[0, -0.18, -0.02], 0.162, 0.103],
    [[0.014 * side, 0.01, 0], 0.237, 0.131],
    [[0.009 * side, 0.19, -0.025], 0.245, 0.112],
    [[0.009 * side, 0.31, -0.035], 0.203, 0.073],
    [[0, 0.35, -0.035], 0.003, 0.008],
  ]);
}

function gripNail(tip: Vec3, x: number, thumb = false) {
  const dx = thumb ? Math.sign(x) * -0.10 : -x * 0.014;
  const dy = thumb ? 0.035 : -0.11;
  return sculpt([
    [[tip[0] - dx * 0.28, tip[1] - dy * 0.38, tip[2] - 0.028], 0.008, 0.007],
    [[tip[0], tip[1], tip[2] - 0.028], 0.029, 0.014],
    [[tip[0] + dx * 0.30, tip[1] + dy * 0.34, tip[2] + 0.017], 0.036, 0.020],
    [[tip[0] + dx * 0.68, tip[1] + dy * 0.72, tip[2] + 0.034], 0.022, 0.012],
    [[tip[0] + dx, tip[1] + dy, tip[2] + 0.029], 0.001, 0.001],
  ], 12, 10);
}

function bodyHand(side: number, closed: boolean): [BufferGeometry, BufferGeometry] {
  const flesh = [palmOf(side)];
  const claws: BufferGeometry[] = [];
  const lengths = [0.49, 0.60, 0.55, 0.41];
  for (const [i, length] of lengths.entries()) {
    const x = (i - 1.5) * side;
    const startY = 0.25 - 0.018 * i;
    const curl = 0.226 - i * 0.025;
    const spread = 0.162;
    const tip: Vec3 = [x * spread, startY + length, curl];
    const taper = 1 - i * 0.05;
    const grip: Vec3 = [x * 0.135, startY + length * 0.23, 0.31 - 0.023 * i];
    flesh.push(sculpt(closed ? [
      [[x * 0.113, startY - 0.07, -0.04], 0.079 * taper, 0.060 * taper],
      [[x * 0.139, startY + length * 0.18, -0.047], 0.068 * taper, 0.055 * taper],
      [[x * 0.156, startY + length * 0.44, -0.020], 0.058 * taper, 0.044 * taper],
      [[x * 0.162, startY + length * 0.53, 0.077], 0.063 * taper, 0.049 * taper],
      [[x * 0.154, startY + length * 0.44, 0.204], 0.048 * taper, 0.037 * taper],
      [grip, 0.033 * taper, 0.027 * taper],
      [[grip[0], grip[1] - 0.018, grip[2] + 0.012], 0.006, 0.006],
    ] : [
      [[x * 0.113, startY - 0.07, -0.04], 0.079 * taper, 0.060 * taper],
      [[x * 0.132, startY + length * 0.16, -0.046], 0.068 * taper, 0.055 * taper],
      [[x * 0.153, startY + length * 0.47, -0.035], 0.058 * taper, 0.044 * taper],
      [[x * spread * 0.9, startY + length * 0.61, curl * 0.30], 0.061 * taper, 0.049 * taper],
      [[x * spread * 0.97, startY + length * 0.81, curl * 0.71], 0.048 * taper, 0.037 * taper],
      [tip, 0.033 * taper, 0.027 * taper],
      [[tip[0], tip[1] + 0.026, tip[2] + 0.019], 0.006, 0.006],
    ]));
    claws.push(closed ? gripNail(grip, x) : nailOf(tip, x, 0.062));
  }
  const thumb: Vec3 = closed ? [-side * 0.186, 0.225, 0.318] : [-side * 0.245, 0.355, 0.239];
  flesh.push(sculpt(closed ? [
    [[-0.069 * side, -0.14, -0.024], 0.076, 0.074],
    [[-0.172 * side, -0.068, 0.031], 0.109, 0.083],
    [[-0.274 * side, 0.045, 0.109], 0.077, 0.069],
    [[-0.258 * side, 0.163, 0.217], 0.066, 0.053],
    [thumb, 0.036, 0.029],
    [[thumb[0] + side * 0.018, thumb[1], thumb[2] + 0.012], 0.008, 0.008],
  ] : [
    [[-0.069 * side, -0.14, -0.024], 0.076, 0.074],
    [[-0.172 * side, -0.068, 0.031], 0.109, 0.083],
    [[-0.304 * side, 0.065, 0.080], 0.077, 0.069],
    [[-0.33 * side, 0.17, thumb[2] * 0.73], 0.066, 0.053],
    [thumb, 0.036, 0.029],
    [[thumb[0], thumb[1] + 0.025, thumb[2] + 0.014], 0.008, 0.008],
  ]));
  claws.push(closed ? gripNail(thumb, -side, true) : nailOf(thumb, -side * 0.6, 0.055));
  return [finish(flesh), finish(claws)];
}

function flatNail(x: number, y: number) {
  return sculpt([
    [[x, y - 0.055, -0.050], 0.006, 0.006],
    [[x, y - 0.012, -0.054], 0.020, 0.009],
    [[x, y + 0.052, -0.051], 0.021, 0.012],
    [[x, y + 0.136, -0.049], 0.014, 0.008],
    [[x, y + 0.233, -0.049], 0.001, 0.001],
  ], 12, 10);
}

function cameraHand(side: number): [BufferGeometry, BufferGeometry] {
  const flesh = [sculpt([
    [[-0.26 * side, -0.21, -0.026], 0.076, 0.068],
    [[-0.19 * side, -0.14, -0.017], 0.107, 0.076],
    [[-0.093 * side, -0.080, -0.009], 0.155, 0.102],
    [[-0.021 * side, 0.05, -0.012], 0.199, 0.115],
    [[0.009 * side, 0.185, -0.028], 0.212, 0.092],
    [[0.009 * side, 0.285, -0.038], 0.178, 0.064],
    [[0, 0.332, -0.035], 0.003, 0.008],
  ])];
  const claws: BufferGeometry[] = [];
  for (const [i, length] of [0.77, 0.86, 0.81, 0.69].entries()) {
    const x = (i - 1.5) * side, y = 0.235 - 0.018 * i;
    const a = y + length;
    flesh.push(sculpt([
      [[x * 0.105, y - 0.076, -0.044], 0.039, 0.035],
      [[x * 0.112, y + 0.025, -0.043], 0.042, 0.037],
      [[x * 0.117, y + length * 0.28, -0.032], 0.028, 0.026],
      [[x * 0.120, y + length * 0.42, -0.037], 0.038, 0.031],
      [[x * 0.122, y + length * 0.60, -0.029], 0.026, 0.023],
      [[x * 0.125, y + length * 0.72, -0.034], 0.033, 0.027],
      [[x * 0.126, a, -0.021], 0.021, 0.018],
      [[x * 0.126, a + 0.023, -0.021], 0.003, 0.004],
    ]));
    claws.push(flatNail(x * 0.126, a));
  }
  const thumb: Vec3 = [-side * 0.305, 0.363, -0.018];
  flesh.push(sculpt([
    [[-side * 0.072, -0.15, -0.039], 0.082, 0.065],
    [[-side * 0.234, -0.055, -0.025], 0.073, 0.052],
    [[-side * 0.290, 0.088, -0.031], 0.042, 0.037],
    [[-side * 0.306, 0.244, -0.023], 0.047, 0.039],
    [thumb, 0.029, 0.026],
    [[thumb[0], 0.382, thumb[2]], 0.005, 0.005],
  ]));
  claws.push(flatNail(thumb[0], thumb[1]));
  return [finish(flesh), finish(claws)];
}

export function mangaDaCamera() {
  return sculpt([
    [[0.86, -0.69, -0.10], 0.224, 0.149],
    [[0.65, -0.49, -0.08], 0.191, 0.125],
    [[0.44, -0.33, -0.044], 0.137, 0.099],
    [[0.31, -0.25, -0.026], 0.116, 0.088],
    [[0.29, -0.223, -0.026], 0.123, 0.093],
    [[0.27, -0.202, -0.026], 0.103, 0.077],
  ]);
}

export function maoDoVampiro(side: number, skin: MeshStandardMaterial, nail: MeshStandardMaterial, camera = false): Group {
  const group = new Group();
  const geometry = camera ? cameraHand(side) : bodyHand(side, false);
  if (!camera) bodyHand(side, true).forEach((closed, i) => {
    geometry[i].morphAttributes.position = [closed.getAttribute('position')];
    geometry[i].morphAttributes.normal = [closed.getAttribute('normal')];
    closed.dispose();
  });
  group.add(new Mesh(geometry[0], skin), new Mesh(geometry[1], nail));
  return group;
}
