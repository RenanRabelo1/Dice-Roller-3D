import { Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three';
import type { Vec3 } from '../../../shared/math.ts';
import { elipsoide, soldar, superficie } from './malhaLisa.ts';

// In the figure a die sits in front of the palm and under the arch of the fingers.
export const CENTRO_DA_PEGA: Vec3 = [0, 0.25, 0.16];

type CurvaDoDedo = {
  p: Vec3;
  comprimento: number;
  inicio: number;
  dobra: number;
  abertura: number;
  base: number;
  ponta: number;
};

// Sweep the tapered skin along a circular arc. The rings turn with the tangent
// and the last ten form the spherical cap, including on the closed morph.
function dedo({ p, comprimento, inicio, dobra, abertura, base, ponta }: CurvaDoDedo, segmentos = 20) {
  const tampa = 10;
  return superficie(26, segmentos + tampa, (u, v) => {
    const ring = v * (segmentos + tampa);
    const t = Math.min(1, ring / segmentos);
    const angle = inicio + dobra * t;
    const ratio = comprimento / dobra;
    const cap = Math.max(0, ring - segmentos) / tampa * Math.PI / 2;
    const radius = (base + (ponta - base) * (0.5 - 0.5 * Math.cos(Math.PI * t))) * Math.cos(cap);
    const length = ponta * Math.sin(cap);
    const x = radius * Math.cos(u * 2 * Math.PI);
    const cross = -radius * Math.sin(u * 2 * Math.PI);
    const y = ratio * (Math.sin(angle) - Math.sin(inicio)) + length * Math.cos(angle) - cross * Math.sin(angle);
    const z = ratio * (Math.cos(inicio) - Math.cos(angle)) + length * Math.sin(angle) + cross * Math.cos(angle);
    return [
      p[0] + x * Math.cos(abertura) - y * Math.sin(abertura),
      p[1] + x * Math.sin(abertura) + y * Math.cos(abertura),
      p[2] + z,
    ];
  });
}

function unha(digit: CurvaDoDedo) {
  const { p, comprimento, inicio, dobra, abertura, ponta } = digit;
  const angle = inicio + dobra, ratio = comprimento / dobra;
  const end = ratio * (Math.sin(angle) - Math.sin(inicio));
  const base: Vec3 = [
    p[0] - end * Math.sin(abertura),
    p[1] + end * Math.cos(abertura),
    p[2] + ratio * (Math.cos(inicio) - Math.cos(angle)),
  ];
  // The nail continues along the curve, catching the light just above the fingertip.
  return dedo({
    p: [base[0], base[1] + 0.017 * Math.sin(angle), base[2] - 0.68 * ponta * Math.cos(angle)],
    comprimento: 0.102, inicio: angle, dobra: 0.34, abertura, base: ponta * 0.84, ponta: ponta * 0.30,
  }, 12);
}

function modelarMao(side: number, fechada: boolean, camera: boolean): [BufferGeometry, BufferGeometry] {
  const flesh: BufferGeometry[] = [elipsoide([0, -0.055, -0.035], [camera ? 0.187 : 0.229, 0.382, 0.163], side * 0.09)];
  const claws: BufferGeometry[] = [];
  const lengths = camera ? [0.79, 0.87, 0.82, 0.70] : [0.51, 0.63, 0.58, 0.47];
  for (const [i, length] of lengths.entries()) {
    const x = (i - 1.5) * side;
    const digit: CurvaDoDedo = {
      p: [x * (camera ? 0.102 : 0.122), 0.216 - 0.02 * i, -0.065],
      comprimento: length,
      inicio: fechada ? -0.30 : -0.12,
      dobra: fechada ? 2.50 : camera ? 0.38 : 0.90,
      abertura: -x * (camera ? 0.060 : 0.10),
      base: camera ? 0.041 : 0.074 - 0.005 * i,
      ponta: camera ? 0.022 : 0.031 - 0.002 * i,
    };
    flesh.push(dedo(digit));
    claws.push(unha(digit));
  }
  const thumb: CurvaDoDedo = {
    p: [-0.097 * side, -0.128, -0.017],
    comprimento: camera ? 0.53 : 0.51,
    inicio: 0.03, dobra: fechada ? 1.34 : camera ? 0.33 : 0.94,
    abertura: side * (fechada ? 0.38 : 0.49), base: 0.082, ponta: 0.032,
  };
  flesh.push(dedo(thumb));
  claws.push(unha(thumb));
  return [soldar(flesh), soldar(claws)];
}

export function mangaDaCamera() {
  return soldar([elipsoide([0.574, -0.475, -0.056], [0.183, 0.443, 0.139], 0.87)]);
}

export function maoDoVampiro(side: number, skin: MeshStandardMaterial, nail: MeshStandardMaterial, camera = false): Group {
  const group = new Group();
  const geometry = modelarMao(side, false, camera);
  if (!camera) modelarMao(side, true, false).forEach((closed, i) => {
    geometry[i].morphAttributes.position = [closed.getAttribute('position')];
    geometry[i].morphAttributes.normal = [closed.getAttribute('normal')];
    closed.dispose();
  });
  group.add(new Mesh(geometry[0], skin), new Mesh(geometry[1], nail));
  return group;
}
