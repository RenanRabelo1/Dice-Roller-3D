import { CircleGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { span, type Vec3 } from '../../../shared/math.ts';
import { elipsoide, soldar, superficie } from './malhaLisa.ts';

export const RESOLUCAO_ROSTO = [144, 100] as const;
export const SULCOS_DO_CABELO = 42;
const EYE_Y = 0.273, EYE_X = 0.074;
const HALF_APERTURE = 0.039, UPPER_LID = 0.0172, LOWER_LID = 0.0148;
const IRIS_RADIUS = 0.0072;

const gauss = (value: number, center: number, width: number) => Math.exp(-(((value - center) / width) ** 2));
const feature = (x: number, y: number, cx: number, cy: number, w: number, h: number) =>
  gauss(x, cx, w) * gauss(y, cy, h);
const paired = (x: number, y: number, cx: number, cy: number, w: number, h: number) =>
  feature(x, y, cx, cy, w, h) + feature(x, y, -cx, cy, w, h);
const mouthLine = (x: number) => 0.123 - 0.010 * (x / 0.070) ** 2;
const jawWidth = (y: number) => 0.162 * (1 - 0.22 * gauss(y, 0.059, 0.082) + 0.060 * gauss(y, 0.136, 0.057));

function depthOfFace(x: number, y: number, nz: number) {
  const u = span(nz, 0.15, 0.75), front = u * u * (3 - 2 * u);
  const brow = 0.015 * paired(x, y, 0.067, 0.316, 0.051, 0.042);
  const socket = 0.035 * paired(x, y, EYE_X, EYE_Y, 0.045, 0.037);
  const bone = 0.027 * paired(x, y, 0.102, 0.218, 0.051, 0.050);
  const hollow = 0.020 * paired(x, y, 0.105, 0.162, 0.049, 0.051);
  const bridge = 0.044 * feature(x, y, 0, 0.251, 0.045, 0.091);
  const tip = 0.056 * feature(x, y, 0, 0.196, 0.048, 0.046);
  const wings = 0.013 * paired(x, y, 0.027, 0.177, 0.021, 0.028);
  const nostrils = 0.009 * paired(x, y, 0.027, 0.164, 0.018, 0.019);
  const philtrum = 0.006 * feature(x, y, 0, 0.145, 0.017, 0.021);
  const corner = 0.007 * paired(x, y, 0.060, mouthLine(0.060), 0.025, 0.027);
  const chin = 0.030 * feature(x, y, 0, 0.053, 0.064, 0.049);
  const mandible = 0.015 * paired(x, y, 0.100, 0.093, 0.048, 0.041);
  return 0.169 * nz - 0.009 + front * (brow - socket + bone - hollow + bridge + tip + wings - nostrils - philtrum - corner + chin + mandible);
}

function frontalDepth(x: number, y: number) {
  const nx = x / jawWidth(y), ny = (y - 0.244) / 0.244;
  return depthOfFace(x, y, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
}

// The cranium and mandible share one surface. Displacements use the anatomical
// coordinates of the frontal half, fading to zero at the ears.
function sculptFace() {
  const geometry = new SphereGeometry(1, ...RESOLUCAO_ROSTO);
  const position = geometry.getAttribute('position'), p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    // Spend the angular samples near the features that need the most curvature.
    const longitude = Math.atan2(p.x, p.z), latitude = Math.asin(p.y);
    const a = longitude - 0.66 * Math.sin(longitude), b = latitude - 0.35 * Math.sin(2 * latitude);
    p.set(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
    const y = 0.244 + 0.244 * p.y;
    const x = jawWidth(y) * p.x;
    position.setXYZ(i, x, y, depthOfFace(x, y, p.z));
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
  const height = span(y, 0, 0.49), sides = span(Math.abs(x), 0.045, 0.18);
  const front = span(z, -0.06, 0.22);
  return [0.915 + 0.055 * height + 0.019 * front,
    0.883 + 0.044 * height + 0.012 * front - 0.019 * sides,
    0.873 + 0.040 * height + 0.012 * sides];
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

const abertura = (q: number) => {
  const edge = Math.sqrt(Math.max(0, 1 - q * q));
  return edge * (0.82 + 0.18 * edge);
};
const eixoDoOlho = (q: number, side: number) => EYE_Y + 0.004 * q * side;

function profundidadeDoOlho(x: number, y: number, side: number) {
  const q = (x - side * EYE_X) / HALF_APERTURE, axis = eixoDoOlho(q, side);
  const reach = (y >= axis ? UPPER_LID : LOWER_LID) * abertura(q);
  const v = reach > 0.00001 ? (y - axis) / reach : 0;
  const curve = Math.max(0, (1 - q * q) * (1 - v * v));
  return frontalDepth(x, y) + 0.0019 + 0.0052 * curve;
}

function esclera(side: number) {
  return superficie(44, 12, (u, v) => {
    const q = -Math.cos(Math.PI * u), x = side * EYE_X + HALF_APERTURE * q;
    const y = eixoDoOlho(q, side) + abertura(q) * (v * (UPPER_LID + LOWER_LID) - LOWER_LID);
    return [x, y, profundidadeDoOlho(x, y, side)];
  });
}

function palpebras(side: number) {
  return superficie(68, 14, (u, v) => {
    const a = -2 * Math.PI * u, q = Math.cos(a), vertical = Math.sin(a);
    const x = side * EYE_X + (HALF_APERTURE + 0.010 * v) * q;
    const lid = vertical >= 0 ? UPPER_LID : LOWER_LID;
    const y = eixoDoOlho(q, side) + Math.sign(vertical) * lid * abertura(q) + 0.011 * v * vertical;
    const thickness = (0.0027 + 0.0018 * Math.sin(Math.PI * v)) * (1 - v) - 0.0010 * v;
    return [x, y, frontalDepth(x, y) + thickness];
  });
}

function sobrancelha(side: number) {
  return superficie(42, 9, (u, v) => {
    const x = side * EYE_X + (u - 0.5) * 0.089;
    const corner = (side * (u - 0.5) + 0.5);
    const arch = 0.310 + 0.017 * Math.sin(Math.PI * (corner * 0.87 + 0.08));
    const width = 0.003 + 0.005 * (Math.sin(Math.PI * u) ** 0.8);
    const y = arch + (v - 0.5) * width;
    return [x, y, frontalDepth(x, y) + 0.0009 + 0.0015 * Math.sin(Math.PI * v) * Math.sin(Math.PI * u)];
  });
}

function labio(superior: boolean) {
  return superficie(46, 14, (u, v) => {
    const x = (u * 2 - 1) * 0.056;
    const profile = Math.sin(Math.PI * u);
    const width = (superior ? 0.010 : 0.013) * profile;
    const y = mouthLine(x) + (superior ? 0.0015 + width * v : -0.0015 - width * (1 - v));
    return [x, y, frontalDepth(x, y) + profile * (0.0015 + 0.0036 * Math.sin(Math.PI * v))];
  });
}

export function pescocoDoVampiro(skin: MeshPhysicalMaterial, taper: Taper) {
  const geometry = soldar([taper([0, 1.47, -0.055], [0, 1.88, -0.046], 0.086, 0.077)]);
  const neck = new Mesh(tingirPele(geometry, () => [0.91, 0.87, 0.85]), skin);
  neck.name = 'vampiro-pescoco';
  return neck;
}

export function rostoDoVampiro(skin: MeshPhysicalMaterial, tooth: MeshStandardMaterial, taper: Taper) {
  const head = new Group();
  const sides = [-1, 1];
  const face = new Mesh(tingirPele(soldar([sculptFace(), ...sides.map(orelha), ...sides.map(palpebras)]), corDoRosto), skin);
  face.name = 'vampiro-rosto-esculpido';
  const sclera = new Mesh(soldar(sides.map(esclera)), new MeshPhysicalMaterial({
    name: 'esclera', color: '#b0a29c', roughness: 0.47, specularIntensity: 0.18,
  }));
  sclera.name = 'vampiro-fendas';
  const disk = (r: number, relief: number, material: MeshStandardMaterial) => new Mesh(soldar(sides.map((side) => {
    const g = new CircleGeometry(r, 48).translate(side * EYE_X, EYE_Y, 0);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) pos.setZ(i, profundidadeDoOlho(pos.getX(i), pos.getY(i), side) + relief);
    return g;
  })), material);
  const iris = disk(IRIS_RADIUS, 0.0015, new MeshStandardMaterial({
    name: 'iris', color: '#651721', roughness: 0.58, emissive: '#511017', emissiveIntensity: 0.42,
  }));
  iris.name = 'vampiro-irises';
  const pupil = disk(0.0031, 0.0022, new MeshStandardMaterial({ name: 'pupila', color: '#100b10', roughness: 0.60 }));
  const fangs = new Mesh(soldar(sides.map((s) => {
    const x = 0.036 * s, y = mouthLine(x) + 0.001;
    return taper([x, y, frontalDepth(x, y) + 0.004], [x - 0.003 * s, y - 0.031, frontalDepth(x, y) + 0.012], 0.0046, 0.0016);
  })), tooth);
  const hair = cabelo();
  const brows = new Mesh(tingirPele(soldar(sides.map(sobrancelha)), () => [0.032, 0.020, 0.019]), hair.material);
  brows.name = 'vampiro-sobrancelhas';
  const lips = new Mesh(soldar([labio(true), labio(false)]), new MeshPhysicalMaterial({
    name: 'labios', color: '#a87775', roughness: 0.57, specularIntensity: 0.17,
  }));
  lips.name = 'vampiro-labios';
  head.name = 'vampiro-cabeca';
  head.position.set(0, 1.79, 0.023);
  head.add(face, sclera, iris, pupil, fangs, hair, brows, lips);
  return head;
}
