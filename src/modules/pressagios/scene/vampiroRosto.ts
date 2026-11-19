import { CircleGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { span, type Vec3 } from '../../../shared/math.ts';
import { elipsoide, soldar, superficie } from './malhaLisa.ts';

export const RESOLUCAO_ROSTO = [160, 112] as const;
export const SULCOS_DO_CABELO = 42;
const EYE_Y = 0.272, EYE_X = 0.061;

const gauss = (value: number, center: number, width: number) => Math.exp(-(((value - center) / width) ** 2));
const feature = (x: number, y: number, cx: number, cy: number, w: number, h: number) =>
  gauss(x, cx, w) * gauss(y, cy, h);
const paired = (x: number, y: number, cx: number, cy: number, w: number, h: number) =>
  feature(x, y, cx, cy, w, h) + feature(x, y, -cx, cy, w, h);
const mouthLine = (x: number) => 0.123 - 0.010 * (x / 0.070) ** 2;

// The cranium and mandible share one surface. Displacements use the anatomical
// coordinates of the frontal half, fading to zero at the ears.
function sculptFace() {
  const geometry = new SphereGeometry(1, ...RESOLUCAO_ROSTO);
  const position = geometry.getAttribute('position'), p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    // Spend the angular samples near the features that need the most curvature.
    const longitude = Math.atan2(p.x, p.z), latitude = Math.asin(p.y);
    const a = longitude - 0.54 * Math.sin(longitude), b = latitude - 0.29 * Math.sin(2 * latitude);
    p.set(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
    const y = 0.244 + 0.244 * p.y;
    const jaw = 1 - 0.22 * gauss(y, 0.059, 0.082) + 0.060 * gauss(y, 0.136, 0.057);
    const x = 0.162 * p.x * jaw;
    const u = span(p.z, 0.15, 0.75), front = u * u * (3 - 2 * u);
    const brow = 0.014 * paired(x, y, 0.063, 0.313, 0.050, 0.039);
    const socket = 0.028 * paired(x, y, EYE_X, EYE_Y, 0.046, 0.034);
    const eyelid = 0.008 * paired(x, y, EYE_X, 0.295, 0.046, 0.026)
      + 0.005 * paired(x, y, EYE_X, 0.248, 0.043, 0.026);
    const bone = 0.024 * paired(x, y, 0.101, 0.221, 0.050, 0.046);
    const hollow = 0.021 * paired(x, y, 0.103, 0.159, 0.048, 0.054);
    const bridge = 0.027 * feature(x, y, 0, 0.257, 0.049, 0.101);
    const tip = 0.031 * feature(x, y, 0, 0.192, 0.045, 0.041);
    const wings = 0.010 * paired(x, y, 0.027, 0.171, 0.024, 0.025);
    const nostrils = 0.005 * paired(x, y, 0.024, 0.160, 0.022, 0.026);
    const lipY = mouthLine(x);
    const lips = 0.007 * feature(x, y, 0, lipY + 0.014, 0.057, 0.023)
      + 0.009 * feature(x, y, 0, lipY - 0.016, 0.054, 0.024)
      - 0.005 * feature(x, y, 0, lipY, 0.064, 0.017);
    const corner = 0.008 * paired(x, y, 0.061, mouthLine(0.061), 0.023, 0.027);
    const chin = 0.030 * feature(x, y, 0, 0.055, 0.064, 0.046);
    const mandible = 0.014 * paired(x, y, 0.100, 0.093, 0.047, 0.041);
    const z = 0.169 * p.z - 0.009 + front *
      (brow - socket + eyelid + bone - hollow + bridge + tip + wings - nostrils + lips - corner + chin + mandible);
    position.setXYZ(i, x, y, z);
  }
  return geometry;
}

export function peleDoVampiro() {
  return new MeshPhysicalMaterial({
    name: 'skin', color: '#ddc9c1', roughness: 0.57, vertexColors: true,
    sheen: 0.20, sheenColor: '#aa7873', sheenRoughness: 0.80, specularIntensity: 0.31,
  });
}

export function tingirPele(g: BufferGeometry, color: (x: number, y: number, z: number) => Vec3) {
  const pos = g.getAttribute('position');
  const paint = new Float32Array(3 * pos.count);
  for (let i = 0; i < pos.count; i++) paint.set(color(pos.getX(i), pos.getY(i), pos.getZ(i)), i * 3);
  return g.setAttribute('color', new Float32BufferAttribute(paint, 3));
}

function corDoRosto(x: number, y: number, z: number): Vec3 {
  const k = Math.abs(x), near = span(z, 0.025, 0.120);
  const cheeks = feature(k, y, 0.105, 0.218, 0.043, 0.046);
  const lid = feature(k, y, EYE_X, EYE_Y + 0.013, 0.045, 0.025);
  const ears = feature(k, y, 0.175, 0.244, 0.055, 0.070);
  const cold = near * (0.68 * feature(k, y, EYE_X, 0.247, 0.052, 0.030)
    + 0.58 * feature(k, y, 0.135, 0.306, 0.051, 0.071) + 0.30 * feature(k, y, 0.10, 0.158, 0.047, 0.038));
  const warm = near * (0.30 * cheeks + 0.34 * lid) + 0.51 * ears;
  const ly = mouthLine(x);
  const lip = near * feature(x, y, 0, ly, 0.059, 0.022);
  const line = near * (0.90 * feature(x, y, 0, ly, 0.058, 0.0045) + 0.72 * feature(k, y, 0.022, 0.161, 0.010, 0.007));
  const brow = 0.68 * near * feature(k, y, EYE_X + 0.009, 0.309 + 0.11 * (k - EYE_X), 0.044, 0.008);
  return [
    1 - 0.26 * cold - 0.25 * lip - 0.49 * line - brow,
    1 - 0.28 * warm - 0.17 * cold - 0.55 * lip - 0.42 * line - 0.96 * brow,
    1 - 0.26 * warm - 0.08 * cold - 0.45 * lip - 0.42 * line - 0.90 * brow,
  ];
}

function orelha(side: number) {
  const g = elipsoide([0, 0, 0], [0.027, 0.059, 0.035], 0, 40, 30);
  const xyz = g.getAttribute('position');
  for (let i = 0; i < xyz.count; i++) {
    const u = span(xyz.getY(i), -0.015, 0.059), v = u * u * (3 - 2 * u);
    xyz.setX(i, xyz.getX(i) * (1 - 0.24 * v) + side * 0.010 * v);
  }
  return g.rotateZ(-side * 0.19).translate(side * 0.153, 0.231, -0.023);
}

function cabelo() {
  const columns = 168, rows = 44;
  const geometry = soldar([superficie(columns, rows, (u, v) => {
    const a = -u * 2 * Math.PI, f = Math.cos(a);
    const widow = gauss(Math.acos(f), 0, 0.25);
    const boundary = 1.51 - 0.55 * f + 0.37 * widow;
    const b = v * boundary;
    const strand = SULCOS_DO_CABELO * (a + 0.14 * b * Math.sin(a));
    const ripple = 0.00046 * Math.cos(strand) * Math.sin(b) ** 2;
    return [
      (0.169 + ripple) * Math.sin(a) * Math.sin(b),
      0.244 + (0.253 + ripple) * Math.cos(b),
      -0.012 + (0.187 + ripple) * Math.cos(a) * Math.sin(b),
    ];
  })]);
  const position = geometry.getAttribute('position');
  const base = new Color('#130f12'), strandColor = new Color('#34292a'), tint = new Color();
  const colors: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const a = Math.atan2(position.getX(i) / 0.169, (position.getZ(i) + 0.012) / 0.187);
    const b = Math.acos(Math.min(1, Math.max(-1, (position.getY(i) - 0.244) / 0.253)));
    const stripe = 0.50 + 0.42 * Math.cos(SULCOS_DO_CABELO * (a + 0.14 * b * Math.sin(a)));
    tint.copy(base).lerp(strandColor, stripe * Math.sin(b));
    colors.push(tint.r, tint.g, tint.b);
  }
  return new Mesh(geometry.setAttribute('color', new Float32BufferAttribute(colors, 3)),
    new MeshPhysicalMaterial({ name: 'hair', vertexColors: true, roughness: 0.62, specularIntensity: 0.32 }));
}

type Taper = (a: Vec3, b: Vec3, r0: number, r1: number) => BufferGeometry;

export function rostoDoVampiro(skin: MeshPhysicalMaterial, tooth: MeshStandardMaterial, taper: Taper) {
  const head = new Group();
  const sides = [-1, 1];
  const face = new Mesh(tingirPele(soldar([sculptFace(), ...sides.map(orelha)]), corDoRosto), skin);
  face.name = 'vampiro-rosto-esculpido';
  const sclera = new Mesh(soldar(sides.map((s) => elipsoide([s * EYE_X, EYE_Y, 0.124],
    [0.040, 0.014, 0.019], -s * 0.055, 44, 29))),
    new MeshPhysicalMaterial({ name: 'esclera', color: '#b0a29c', roughness: 0.43, specularIntensity: 0.23 }));
  const disk = (r: number, z: number, material: MeshStandardMaterial) =>
    new Mesh(soldar(sides.map((s) => new CircleGeometry(r, 48).translate(s * (EYE_X + 0.009), EYE_Y, z))), material);
  const iris = disk(0.0105, 0.1431, new MeshStandardMaterial({
    name: 'iris', color: '#5a111c', roughness: 0.58, emissive: '#511017', emissiveIntensity: 0.42,
  }));
  const pupil = disk(0.0036, 0.1434, new MeshStandardMaterial({ name: 'pupila', color: '#100b10', roughness: 0.60 }));
  const fangs = new Mesh(soldar(sides.map((s) => taper([s * 0.037, 0.122, 0.144],
    [s * 0.033, 0.089, 0.151], 0.0053, 0.0017))), tooth);
  head.name = 'vampiro-cabeca';
  head.position.set(0, 1.79, 0.023);
  head.add(face, sclera, iris, pupil, fangs, cabelo());
  return head;
}
