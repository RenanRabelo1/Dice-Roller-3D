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
  falanges?: 2 | 3;
};

// The two knuckles separate three phalanges along the arc, with matching rings
// in the open and closed hand so the grip can keep its existing morph.
function dedo({ p, comprimento, inicio, dobra, abertura, base, ponta, falanges = 3 }: CurvaDoDedo, unha = false) {
  const segmentos = unha ? 18 : 30;
  const tampa = 10;
  return superficie(34, segmentos + tampa, (u, v) => {
    const ring = v * (segmentos + tampa);
    const t = Math.min(1, ring / segmentos);
    const angle = inicio + dobra * t;
    const ratio = comprimento / dobra;
    const cap = Math.max(0, ring - segmentos) / tampa * Math.PI / 2;
    const taper = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const knuckle = unha ? 0 : base * (falanges === 2 ? 0.13 * Math.exp(-(((t - 0.49) / 0.11) ** 2))
      : 0.108 * Math.exp(-(((t - 0.31) / 0.10) ** 2)) + 0.113 * Math.exp(-(((t - 0.65) / 0.095) ** 2)));
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

function dorsalTendons(x: number, y: number, side: number) {
  const spread = y * 1.4 + 0.64;
  return Math.exp(-(((y - 0.020) / 0.23) ** 2)) * [-0.153, -0.05, 0.053, 0.147].reduce((sum, finger) =>
    sum + Math.exp(-(((x - finger * spread + y * side * 0.06) / 0.027) ** 2)), 0);
}

const basesDosDedos = [-1.5, -0.5, 0.5, 1.5];
const larguraEntreDedos = 0.103;

function palma(side: number) {
  const wristRows = 11, palmRows = 19, crownRows = 15, rows = wristRows + palmRows + crownRows;
  return superficie(38, rows, (u, v) => {
    const row = Math.round(v * rows), across = u * 2 * Math.PI;
    const rise = span(row, wristRows, wristRows + palmRows);
    const wrist = -Math.PI / 2 * (1 - span(row, 0, wristRows));
    const crown = Math.PI / 2 * span(row, wristRows + palmRows, rows);
    const rounding = Math.cos(wrist + crown);
    const spread = rise * rise * (3 - 2 * rise);
    const radiusX = 0.111 + 0.122 * spread;
    const radiusZ = 0.052 + 0.011 * spread + 0.005 * Math.sin(Math.PI * rise) ** 2;
    const y = -0.317 + 0.468 * rise + 0.074 * Math.sin(wrist) + 0.092 * Math.sin(crown);
    const horizontal = Math.sin(across), depth = Math.cos(across);
    const support = Math.hypot(radiusX * horizontal, radiusZ * depth);
    const x = radiusX ** 2 * horizontal / support * rounding;
    const z = radiusZ ** 2 * depth / support * rounding;
    const dorsum = Math.max(0, -z / radiusZ) ** 2;
    const knuckles = basesDosDedos.reduce((sum, k, j) => sum + Math.exp(-(((x - k * side * larguraEntreDedos) / 0.042) ** 2)
      - (((y - (0.125 - 0.009 * j)) / 0.061) ** 2)), 0);
    return [x, y, z - 0.016 - dorsum * (0.0037 * dorsalTendons(x, y, side) + 0.0061 * knuckles)];
  });
}

export function partesDaMao(side: number, fechada = false) {
  const lengths = [0.52, 0.65, 0.59, 0.46];
  const fingers = lengths.map((length, i): CurvaDoDedo => {
    const x = basesDosDedos[i] * side;
    return {
      p: [x * larguraEntreDedos, 0.113 - 0.012 * i, -0.019],
      comprimento: length,
      inicio: fechada ? -0.30 : -0.12,
      dobra: fechada ? 2.50 : 0.69,
      abertura: -x * 0.105,
      base: 0.060 - 0.004 * i,
      ponta: 0.028 - 0.002 * i,
    };
  });
  fingers.push({ p: [-0.126 * side, -0.245, -0.005], comprimento: 0.405,
    inicio: 0.04, dobra: fechada ? 1.27 : 0.68,
    abertura: side * (fechada ? 0.67 : 0.89), base: 0.065, ponta: 0.030, falanges: 2 });
  return { palma: palma(side), dedos: fingers.map((finger) => dedo(finger)), garras: fingers.map(garra) };
}

function modelarMao(side: number, fechada: boolean): [BufferGeometry, BufferGeometry] {
  const { palma, dedos, garras } = partesDaMao(side, fechada);
  return [soldar([palma, ...dedos]), soldar(garras)];
}

export function mangaDaCamera() {
  return soldar([elipsoide([0.574, -0.475, -0.056], [0.183, 0.443, 0.139], 0.87)]);
}

export function maoDoVampiro(side: number, skin: MeshStandardMaterial, nail: MeshStandardMaterial, camera = false): Group {
  const group = new Group();
  const geometry = modelarMao(side, false);
  tingirPele(geometry[0], (x, y, z) => {
    const cold = 0.15 * Math.min(1, Math.hypot(x, Math.max(0, y - 0.12)) + Math.max(0, -z));
    const tendon = 0.065 * span(-z, 0.035, 0.075) * dorsalTendons(x, y, side);
    return [0.93 - cold + tendon, 0.82 - cold + tendon, 0.81 - 0.55 * cold + tendon];
  });
  if (!camera) modelarMao(side, true).forEach((closed, i) => {
    geometry[i].morphAttributes.position = [closed.getAttribute('position')];
    geometry[i].morphAttributes.normal = [closed.getAttribute('normal')];
    closed.dispose();
  });
  group.add(new Mesh(geometry[0], skin), new Mesh(geometry[1], nail));
  return group;
}
