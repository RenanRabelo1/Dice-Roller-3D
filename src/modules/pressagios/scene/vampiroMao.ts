import { Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three';
import { span, type Vec3 } from '../../../shared/math.ts';
import { elipsoide, soldar, superficie } from './malhaLisa.ts';
import { tingirPele } from './vampiroRosto.ts';

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

// The two knuckles separate three phalanges along the arc, with matching rings
// in the open and closed hand so the grip can keep its existing morph.
function dedo({ p, comprimento, inicio, dobra, abertura, base, ponta }: CurvaDoDedo, unha = false) {
  const segmentos = unha ? 18 : 30;
  const tampa = 10;
  return superficie(34, segmentos + tampa, (u, v) => {
    const ring = v * (segmentos + tampa);
    const t = Math.min(1, ring / segmentos);
    const angle = inicio + dobra * t;
    const ratio = comprimento / dobra;
    const cap = Math.max(0, ring - segmentos) / tampa * Math.PI / 2;
    const taper = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const knuckle = unha ? 0 : base * (0.108 * Math.exp(-(((t - 0.31) / 0.10) ** 2))
      + 0.113 * Math.exp(-(((t - 0.65) / 0.095) ** 2)));
    const radius = (base + (ponta - base) * taper + knuckle) * Math.cos(cap);
    const length = ponta * Math.sin(cap);
    const x = radius * Math.cos(u * 2 * Math.PI);
    const cross = -radius * Math.sin(u * 2 * Math.PI) * (unha ? 0.77 : 0.94 + 0.06 * t);
    const y = ratio * (Math.sin(angle) - Math.sin(inicio)) + length * Math.cos(angle) - cross * Math.sin(angle);
    const z = ratio * (Math.cos(inicio) - Math.cos(angle)) + length * Math.sin(angle) + cross * Math.cos(angle);
    return [
      p[0] + x * Math.cos(abertura) - y * Math.sin(abertura),
      p[1] + x * Math.sin(abertura) + y * Math.cos(abertura),
      p[2] + z,
    ];
  });
}

function garra(digit: CurvaDoDedo) {
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
    comprimento: 0.139, inicio: angle, dobra: 0.39, abertura, base: ponta * 0.90, ponta: ponta * 0.19,
  }, true);
}

function palma(side: number, camera: boolean) {
  const g = elipsoide([0, -0.055, -0.035], [camera ? 0.187 : 0.213, 0.382, 0.145], side * 0.09, 48, 30);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i), v = span(y, -0.39, 0.26);
    const x = pos.getX(i) * (0.82 + 0.38 * v * v * (3 - 2 * v));
    pos.setX(i, x);
    const line = y * 1.4 + 0.64;
    const dorsum = Math.max(0, (-z - 0.035) / 0.145) ** 2;
    const tendons = [-0.153, -0.05, 0.053, 0.147].reduce((sum, finger) =>
      sum + Math.exp(-(((x - finger * line + y * side * 0.06) / 0.027) ** 2)), 0);
    pos.setZ(i, z - tendons * dorsum * 0.0031 * Math.exp(-(((y - 0.020) / 0.23) ** 2)));
  }
  return g;
}

function modelarMao(side: number, fechada: boolean, camera: boolean): [BufferGeometry, BufferGeometry] {
  const flesh: BufferGeometry[] = [palma(side, camera)];
  const claws: BufferGeometry[] = [];
  const lengths = camera ? [0.79, 0.87, 0.82, 0.70] : [0.52, 0.65, 0.59, 0.46];
  for (const [i, length] of lengths.entries()) {
    const x = (i - 1.5) * side;
    const digit: CurvaDoDedo = {
      p: [x * (camera ? 0.099 : 0.104), 0.149 - 0.018 * i, -0.047],
      comprimento: length,
      inicio: fechada ? -0.30 : -0.12,
      dobra: fechada ? 2.50 : camera ? 0.38 : 0.90,
      abertura: -x * (camera ? 0.060 : 0.10),
      base: camera ? 0.041 : 0.060 - 0.004 * i,
      ponta: camera ? 0.022 : 0.028 - 0.002 * i,
    };
    flesh.push(dedo(digit));
    claws.push(garra(digit));
  }
  const thumb: CurvaDoDedo = {
    p: [-0.097 * side, -0.128, -0.017],
    comprimento: camera ? 0.53 : 0.51,
    inicio: 0.03, dobra: fechada ? 1.34 : camera ? 0.33 : 0.94,
    abertura: side * (fechada ? 0.38 : 0.49), base: 0.066, ponta: 0.030,
  };
  flesh.push(dedo(thumb));
  claws.push(garra(thumb));
  return [soldar(flesh), soldar(claws)];
}

export function mangaDaCamera() {
  return soldar([elipsoide([0.574, -0.475, -0.056], [0.183, 0.443, 0.139], 0.87)]);
}

export function maoDoVampiro(side: number, skin: MeshStandardMaterial, nail: MeshStandardMaterial, camera = false): Group {
  const group = new Group();
  const geometry = modelarMao(side, false, camera);
  tingirPele(geometry[0], (x, y, z) => {
    const cold = 0.15 * Math.min(1, Math.hypot(x, Math.max(0, y - 0.12)) + Math.max(0, -z));
    return [0.93 - cold, 0.82 - cold, 0.81 - 0.55 * cold];
  });
  if (!camera) modelarMao(side, true, false).forEach((closed, i) => {
    geometry[i].morphAttributes.position = [closed.getAttribute('position')];
    geometry[i].morphAttributes.normal = [closed.getAttribute('normal')];
    closed.dispose();
  });
  group.add(new Mesh(geometry[0], skin), new Mesh(geometry[1], nail));
  return group;
}
