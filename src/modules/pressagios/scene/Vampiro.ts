import {
  BackSide, Box3, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, DynamicDrawUsage, Euler, Group, LatheGeometry,
  Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Vector2, Vector3, type Camera, type Material, type PerspectiveCamera,
} from 'three';
import type { TipoVampiro } from '../../regras/index.ts';
import { span, type Vec3 } from '../../../shared/math.ts';
import { fechamentoDaPegada, VAMPIRO, vampiroAt } from '../domain/vampiroMotion.ts';
import { CENTRO_DA_PEGA, mangaDaCamera, maoDoVampiro } from './vampiroMao.ts';
import { elipsoide as sphere, soldar, superficie } from './malhaLisa.ts';
import { peleDoVampiro, rostoDoVampiro, tingirPele } from './vampiroRosto.ts';

const UP = new Vector3(0, 1, 0);
const COLUMNS = 82, ROWS = 32, HEM_ROWS = 22, CAPE_SWEEP = 1.94;
const SHOULDERS = 1.68;
const SCALE: Record<TipoVampiro, number> = { 'par-de-criticos': 1.51, 'critico-bestial': 3.35, 'falha-bestial': 3.95 };

function taper(a: Vec3, b: Vec3, r0: number, r1: number, fullness = 0): BufferGeometry {
  const start = new Vector3(...a), end = new Vector3(...b), axis = end.clone().sub(start);
  const length = axis.length();
  // Hemispherical ends continue the shoulder, elbow and boot surfaces at the joints.
  const rings: Vector2[] = [];
  const cap = (r: number, y: number, first: number, last: number, segments: number) => {
    for (let i = 0; i <= segments; i++) {
      const a = first + (last - first) * i / segments;
      rings.push(new Vector2(r * Math.cos(a), y + r * Math.sin(a)));
    }
  };
  cap(r0, 0, -Math.PI / 2, 0, 10);
  for (let i = 1; i < 7; i++) {
    const u = i / 7;
    rings.push(new Vector2(r0 + (r1 - r0) * u + fullness * Math.sin(Math.PI * u) ** 2, length * u));
  }
  cap(r1, length, 0, Math.PI / 2, 10);
  return superficie(28, rings.length - 1, (u, v) => {
    const ring = rings[Math.round(v * (rings.length - 1))];
    const a = 2 * Math.PI * u;
    return [ring.x * Math.sin(a), ring.y, ring.x * Math.cos(a)];
  })
    .applyQuaternion(new Quaternion().setFromUnitVectors(UP, axis.normalize())).translate(...a);
}

function profile(rings: [number, number][], depth: number) {
  const curve = new CatmullRomCurve3(rings.map(([x, y]) => new Vector3(x, y, 0)));
  const points = curve.getPoints(72).map(({ x, y }) => new Vector2(x, y));
  return new LatheGeometry(points, 48).scale(1, 1, depth);
}

function gola() {
  // Swept crescent. The rounded cross-section closes the lining and outer fabric at the lip.
  return superficie(48, 46, (u, v) => {
    const a = (u * 2 - 1) * 2.02;
    const section = v * 2 * Math.PI;
    const ends = Math.cos(Math.PI * u) ** 10;
    const width = 0.174 * (1 - 0.42 * ends);
    const thickness = 0.057 * (1 - 0.46 * ends);
    const d = Math.hypot(thickness * Math.cos(section), width * Math.sin(section));
    const rise = width ** 2 * Math.sin(section) / d;
    const r = 0.36 + 0.35 * rise + thickness ** 2 * Math.cos(section) / d;
    const y = 1.69 + 0.16 * Math.sin(a) ** 2 + rise;
    return [Math.sin(a) * r, y, -Math.cos(a) * r - 0.07];
  });
}

function jabot() {
  return superficie(56, 24, (u, v) => {
    const width = 0.068 + v * 0.061;
    const fold = Math.cos(u * Math.PI * 6 + v * 0.5) * 0.006 * Math.sin(Math.PI * v * 0.8);
    return [(2 * u - 1) * width, 1.63 - 0.29 * v + v ** 3 * fold,
      0.29 + 0.096 * Math.sin(v * Math.PI * 0.60) + fold];
  });
}

// Weld the static pieces of each material at a joint. The arm and hand can each move independently.
function batch(material: MeshStandardMaterial, pieces: BufferGeometry[]) {
  return new Mesh(soldar(pieces), material);
}

export const DOBRAS_CRITICO = 7;
export const AMPLITUDE_DA_CAPA = 0.086;

export function dobraDoCritico(u: number) {
  return AMPLITUDE_DA_CAPA * Math.cos(u * DOBRAS_CRITICO * Math.PI * 2);
}

export const COLUNAS_CRITICO = 192;

class CapaCritica {
  readonly mesh: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly positions: BufferAttribute;
  private readonly colors = new BufferAttribute(new Float32Array((COLUNAS_CRITICO + 1) * (ROWS + 1) * 3), 3);
  private readonly velvet = new Color('#281d23');
  private readonly edging = new Color('#811831');

  constructor() {
    const geometry = superficie(COLUNAS_CRITICO, ROWS, () => [0, 0, 0]).setAttribute('color', this.colors);
    this.positions = geometry.getAttribute('position') as BufferAttribute;
    this.positions.setUsage(DynamicDrawUsage);
    const material = new MeshPhysicalMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.76, sheen: 0.52, sheenColor: '#704451' });
    const lining = new Color('#941c37');
    // Both sides share the same folded surface and are drawn once.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        if (!gl_FrontFacing) {
          vec3 lining = vec3(${lining.r}, ${lining.g}, ${lining.b});
          diffuseColor.rgb = mix(lining * (0.79 + 3.4 * diffuseColor.g), diffuseColor.rgb, 0.13);
        }
      `);
    };
    material.customProgramCacheKey = () => 'critico-bestial-capa-bicolor';
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'vampiro-capa-critica';
    this.mesh.frustumCulled = false;
    this.update();
  }

  update() {
    const tint = new Color();
    const period = Math.PI * 2 * DOBRAS_CRITICO;
    for (let col = 0; col <= COLUNAS_CRITICO; col++) {
      const base = col / COLUNAS_CRITICO;
      const u = base - 0.22 / period * Math.sin(base * period * 2);
      const angle = (u * 2 - 1) * CAPE_SWEEP;
      const side = Math.sin(angle), back = -Math.cos(angle);
      const edge = Math.abs(u * 2 - 1);
      const fold = dobraDoCritico(u);
      for (let row = 0; row <= ROWS; row++) {
        const v = row / ROWS;
        const rx = 0.92 + 0.65 * v, rz = 0.63 + 0.48 * v;
        const ray = Math.hypot(side / rx, back / rz);
        const hem = 0.16 * v ** 3 * Math.sin(5 * angle + 0.17);
        const opening = edge ** 6 * v;
        const index = row * (COLUNAS_CRITICO + 1) + col;
        this.positions.setXYZ(index, side * rx + fold * side / (rx * ray),
          1.68 - 2.28 * v + hem + 0.44 * opening,
          back * rz + fold * back / (rz * ray) - 0.24 - 0.52 * v + 0.43 * opening);
        const rim = Math.max(span(v, 0.90, 0.985), span(edge, 0.83, 1) * 0.84);
        tint.copy(this.velvet).lerp(this.edging, rim).multiplyScalar(1 + 7.6 * fold);
        this.colors.setXYZ(index, tint.r, tint.g, tint.b);
      }
    }
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}

class Cape {
  readonly group = new Group();
  private geometry = new BufferGeometry();
  private hem: BufferGeometry;
  private readonly critico = new CapaCritica();
  private readonly comum: Mesh<BufferGeometry, MeshStandardMaterial>[];
  private tecidoCritico = false;
  private pleatColors = new BufferAttribute(new Float32Array((COLUMNS + 1) * (ROWS + 1) * 3), 3);
  private positions = new BufferAttribute(new Float32Array((COLUMNS + 1) * (ROWS + 1) * 3), 3).setUsage(DynamicDrawUsage);

  constructor(black: MeshStandardMaterial, red: MeshStandardMaterial, hemMaterial: MeshStandardMaterial) {
    const indices: number[] = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLUMNS; col++) {
      const a = row * (COLUMNS + 1) + col, b = a + 1, c = a + COLUMNS + 1, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
    this.geometry.setIndex(indices).setAttribute('position', this.positions).setAttribute('color', this.pleatColors);
    for (let row = 0; row <= ROWS; row++) for (let col = 0; col <= COLUMNS; col++) {
      const stripe = Math.cos((col / COLUMNS * 2 - 1) * CAPE_SWEEP * 4.5);
      const tint = 1 + (0.43 * stripe + 0.16 * stripe ** 2) * (row / ROWS) ** 0.72;
      this.pleatColors.setXYZ(row * (COLUMNS + 1) + col, tint, tint * 0.98, tint);
    }
    const outside = new Mesh(this.geometry, black), lining = new Mesh(this.geometry, red);
    outside.frustumCulled = lining.frustumCulled = false;
    lining.position.z = 0.01;
    this.hem = superficie(COLUMNS, HEM_ROWS, () => [0, 0, 0]);
    const hemPositions = this.hem.getAttribute('position') as BufferAttribute;
    hemPositions.setUsage(DynamicDrawUsage);
    const edge = new Mesh(this.hem, hemMaterial);
    edge.name = 'vampiro-barra-da-capa';
    edge.frustumCulled = false;
    this.comum = [outside, lining, edge];
    this.group.add(...this.comum);
    this.group.name = 'vampiro-capa';
    this.update(0, 0, 0);
  }

  update(t: number, step: number, lean: number, opened = false, critico = false) {
    if (critico !== this.tecidoCritico) {
      this.group.clear().add(...(critico ? [this.critico.mesh] : this.comum));
      this.tecidoCritico = critico;
    }
    if (critico) return;
    for (let row = 0; row <= ROWS; row++) {
      const v = row / ROWS;
      for (let col = 0; col <= COLUMNS; col++) {
        const angle = (col / COLUMNS * 2 - 1) * (opened ? 2.12 : CAPE_SWEEP);
        const pleats = v * (0.032 * Math.cos(angle * 4.5) + 0.023 * Math.sin(t * 0.005 + angle * 3.2 - v * 3));
        const shoulder = 0.18 * Math.sin(Math.PI * v) * (1 - v);
        const radius = 0.70 + shoulder + v * (opened ? 1.51 : 0.59);
        const x = Math.sin(angle) * (radius + pleats) + 0.15 * step * v * v;
        const wave = 0.098 * Math.cos(angle * 3.4) + 0.014 * Math.cos(angle * 6.1 + t * 0.004);
        const y = 1.68 - v * (opened ? 2.88 : 2.18) + v ** 3 * wave + 0.13 * v ** 2 * Math.abs(step);
        const drape = Math.cos(angle) * (0.39 + 0.35 * v + pleats);
        const z = -drape - 0.16 - v * (0.24 + 0.22 * Math.abs(step) + 0.42 * lean)
          - pleats * 0.72 * Math.abs(Math.sin(angle))
          + (opened ? 0.11 + 0.41 * v ** 2 : wave * 0.50 * v ** 3);
        this.positions.setXYZ(row * (COLUMNS + 1) + col, x * (opened ? 1.18 : 1), y, z);
      }
    }
    this.positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
    const hem = this.hem.getAttribute('position');
    const p = new Vector3(), before = new Vector3(), after = new Vector3();
    const tangent = new Vector3(), fall = new Vector3(), normal = new Vector3(), point = new Vector3();
    const base = ROWS * (COLUMNS + 1);
    for (let col = 0; col <= COLUMNS; col++) {
      p.fromBufferAttribute(this.positions, base + col);
      before.fromBufferAttribute(this.positions, base + Math.max(col - 1, 0));
      after.fromBufferAttribute(this.positions, base + Math.min(col + 1, COLUMNS));
      tangent.subVectors(after, before).normalize();
      fall.copy(p).sub(before.fromBufferAttribute(this.positions, base + col - (COLUMNS + 1)));
      fall.addScaledVector(tangent, -fall.dot(tangent)).normalize();
      normal.crossVectors(tangent, fall).normalize();
      for (let row = 0; row <= HEM_ROWS; row++) {
        const a = row / HEM_ROWS * Math.PI;
        point.copy(p).addScaledVector(fall, Math.sin(a) * 0.013).addScaledVector(normal, (1 - Math.cos(a)) * 0.013);
        hem.setXYZ(row * (COLUMNS + 1) + col, point.x, point.y, point.z);
      }
    }
    hem.needsUpdate = true;
    this.hem.computeVertexNormals();
  }
  prepare() { this.group.add(this.critico.mesh); }
  hide() { if (!this.tecidoCritico) this.group.remove(this.critico.mesh); }

  assets() { return [...this.comum, this.critico.mesh]; }

}

interface Arm { sleeve: Mesh; cuff: Group; palm: Group; side: number }

// Keep the wrist and the bulk of the palm on the clear side of a neighbouring die.
function gripRoll(grip: Vec3, rest: number, cameraRotation: Quaternion, obstacles: readonly Vec3[]) {
  let closest: Vec3 | undefined, best = 2.8;
  for (const p of obstacles) {
    const distance = Math.hypot(p[0] - grip[0], p[2] - grip[2], (p[1] - grip[1]) * 1.25);
    if (distance < best) { closest = p; best = distance; }
  }
  if (!closest) return rest;
  const screen = new Vector3(...closest).sub(new Vector3(...grip)).applyQuaternion(cameraRotation.clone().invert());
  if (Math.hypot(screen.x, screen.y) < 0.08) return rest;
  const turn = Math.atan2(-screen.x, screen.y) - rest;
  return rest + Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - span(best, 1.25, 2.8));
}

// The world-space grip point is the centre of the die. Sleeves aim at an elbow and the wrist; the palm sits beneath it.
function bendArm(arm: Arm, root: Group, torso: Group, grip: Vec3, camera: Camera, holding: boolean, attack: boolean, closure: number, obstacles: readonly Vec3[], presenca: boolean) {
  const { side, sleeve, cuff, palm } = arm;
  const shoulder = root.worldToLocal(torso.localToWorld(new Vector3(side * 0.59, SHOULDERS - 0.13, -0.015)));
  const point = root.worldToLocal(new Vector3(...grip));
  const cameraRotation = camera.getWorldQuaternion(new Quaternion());
  const cameraFacing = root.getWorldQuaternion(new Quaternion()).invert().multiply(cameraRotation);
  palm.quaternion.setFromEuler(presenca ? new Euler(1.89, side * 0.20, -side * 0.29)
    : new Euler(attack ? 0.62 : -0.36, side * 0.42, side * 0.24));
  if (holding) {
    palm.quaternion.copy(cameraFacing);
    const rest = side * (attack ? -0.58 : -0.30);
    palm.rotateZ(closure > 0 ? gripRoll(grip, rest, cameraRotation, obstacles) : rest);
    palm.rotateX(attack ? -0.13 : -0.20);
  }
  for (const mesh of palm.children as Mesh[]) mesh.morphTargetInfluences![0] = closure;
  palm.scale.setScalar(presenca ? 0.87 : 1);
  palm.position.copy(point).sub(new Vector3(...CENTRO_DA_PEGA).multiply(palm.scale).applyQuaternion(palm.quaternion));
  const wrist = new Vector3(0, -0.31, -0.035).multiply(palm.scale).applyQuaternion(palm.quaternion).add(palm.position);
  const direction = wrist.clone().sub(shoulder), half = direction.length() / 2;
  direction.normalize();
  const bend = presenca ? new Vector3(side * 0.96, -0.28, -0.32) : new Vector3(side * 0.78, -1, -0.26);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const elbow = shoulder.clone().lerp(wrist, 0.47).addScaledVector(bend, Math.sqrt(Math.max(0.025, 0.91 ** 2 - half ** 2)));
  const link = (o: Mesh | Group, a: Vector3, b: Vector3) => {
    const axis = b.clone().sub(a);
    o.position.copy(a);
    o.scale.y = axis.length() + 0.025;
    o.quaternion.setFromUnitVectors(UP, axis.normalize());
  };
  link(sleeve, shoulder, elbow);
  link(cuff, elbow, wrist);
}

export class Vampiro {
  readonly root = new Group();
  private body = new Group();
  private torso = new Group();
  private head: Group;
  private eyes = new Group(); // the pair of hands in camera space
  private arms: Arm[];
  private legs: Group[];
  private cameraHands: Group[];
  private cameraBounds: Box3[][];
  private cape: Cape;

  constructor() {
    const cloth = { sheen: 0.52, sheenColor: '#744a59', sheenRoughness: 0.78 };
    const coat = new MeshPhysicalMaterial({ ...cloth, name: 'coat', color: '#19131d', roughness: 0.71 });
    const velvet = new MeshPhysicalMaterial({ ...cloth, name: 'velvet', color: '#4f1428', roughness: 0.74 });
    const red = new MeshPhysicalMaterial({ ...cloth, name: 'red', color: '#5d1326', roughness: 0.67, side: DoubleSide });
    const trim = new MeshStandardMaterial({ name: 'trim', color: '#a47d5c', roughness: 0.38, metalness: 0.5 });
    const black = new MeshPhysicalMaterial({ ...cloth, name: 'black', color: '#22181e', roughness: 0.74, vertexColors: true });
    const lining = new MeshPhysicalMaterial({ ...cloth, name: 'lining', color: '#84152e', roughness: 0.72, side: BackSide, vertexColors: true });
    const leather = new MeshStandardMaterial({ name: 'leather', color: '#1c1820', roughness: 0.39 });
    const skin = peleDoVampiro();
    const bone = new MeshStandardMaterial({ name: 'bone', color: '#f4e5d1', roughness: 0.42, side: DoubleSide });
    const nail = new MeshStandardMaterial({ name: 'nail', color: '#330818', roughness: 0.31, metalness: 0.16 });
    const shirting = new MeshPhysicalMaterial({ ...cloth, name: 'jabot', color: '#c7b8ab', roughness: 0.73, side: DoubleSide });
    this.root.name = 'vampiro';
    this.body.name = 'vampiro-corpo';
    this.head = rostoDoVampiro(skin, bone, taper);
    this.eyes.name = 'vampiro-maos-da-camera';
    this.torso.name = 'vampiro-tronco';
    this.torso.position.y = 1.45;

    this.cape = new Cape(black, lining, red);
    const vest = profile([[0.0, -0.19], [0.4, -0.10], [0.46, 0.25], [0.52, 0.75], [0.64, 1.31], [0.57, 1.52], [0.16, 1.67], [0, 1.69]], 0.64);
    const sides = [-1, 1];
    const shoulders = batch(coat, [profile([[0, -0.5], [0.47, -0.35], [0.49, 0.55], [0.65, 1.35], [0.5, 1.6], [0, 1.72]], 0.50)]);
    shoulders.name = 'vampiro-ombros';
    const neck = new Mesh(tingirPele(soldar([taper([0, 1.57, -0.023], [0, 1.82, 0.028], 0.112, 0.093)]),
      () => [0.91, 0.85, 0.83]), skin);
    neck.name = 'vampiro-pescoco';
    this.torso.add(
      this.cape.group,
      batch(velvet, [vest]),
      shoulders,
      batch(red, [gola().scale(0.88, 0.80, 0.89).translate(0, 0.30, 0),
        ...sides.map((s) => sphere([s * 0.36, 1.33, 0.244], [0.110, 0.285, 0.085], -s * 0.36))]),
      batch(shirting, [jabot(), sphere([0, 1.59, 0.294], [0.075, 0.044, 0.048], 0, 32, 24)]),
      batch(trim, [[1.02, 0.390], [0.83, 0.359], [0.65, 0.345], [0.47, 0.328]].map(([y, z]) =>
        sphere([0, y, z], [0.027, 0.028, 0.021], 0, 28, 20))),
      neck,
      this.head,
    );

    this.arms = sides.map((side) => {
      const sleeve = batch(coat, [taper([0, -0.05, 0], [0, 1, 0], 0.19, 0.10, 0.075)]);
      const cuff = new Group();
      cuff.add(batch(coat, [taper([0, -0.06, 0], [0, 1, 0], 0.116, 0.076, 0.045)]),
        batch(velvet, [taper([0, 0.76, 0], [0, 0.95, 0], 0.105, 0.087)]));
      const palm = maoDoVampiro(side, skin, nail);
      palm.name = side < 0 ? 'vampiro-mao-esquerda' : 'vampiro-mao-direita';
      this.body.add(sleeve, cuff, palm);
      return { sleeve, cuff, palm, side };
    });

    this.legs = sides.map((side) => {
      const leg = new Group();
      leg.name = side < 0 ? 'vampiro-perna-esquerda' : 'vampiro-perna-direita';
      leg.position.set(0.25 * side, 1.45, 0);
      leg.add(batch(coat, [taper([0, -0.92, 0], [0, 0.1, 0], 0.14, 0.22)]),
        batch(leather, [taper([0, -1.35, 0], [0, -0.55, 0], 0.146, 0.185), sphere([0, -1.36, 0.13], [0.173, 0.115, 0.33])]));
      this.body.add(leg);
      return leg;
    });

    const cuff = mangaDaCamera();
    this.cameraHands = sides.map((side) => {
      const palm = maoDoVampiro(side, skin, nail, true), sleeve = new Mesh(cuff, coat);
      sleeve.scale.x = -side;
      palm.add(sleeve);
      return palm;
    });
    this.cameraBounds = this.cameraHands.map((palm) => (palm.children as Mesh[]).map((mesh) => {
      mesh.geometry.computeBoundingBox();
      mesh.updateMatrix();
      return mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrix);
    }));
    this.eyes.add(...this.cameraHands);
    this.body.add(this.torso);
    this.root.add(this.body, this.eyes);
    this.hide();
  }

  // Poses both sets for the shared compile and the environment warm-up draw.
  prepare(camera: Camera) {
    this.update('falha-bestial', VAMPIRO.falha.destapa, camera);
    this.cape.prepare();
  }

  update(tipo: TipoVampiro, t: number, camera: Camera, origins: readonly Vec3[] = [], carried?: Vec3, otherDice: readonly Vec3[] = []) {
    const { corpo, esquerda, direita, fase, cobertura } = vampiroAt(tipo, t, origins, carried);
    this.root.visible = corpo.visivel || cobertura > 0;
    this.eyes.visible = cobertura > 0;
    this.body.visible = corpo.visivel;
    if (corpo.visivel) {
      this.body.position.set(...corpo.p);
      this.body.rotation.y = corpo.yaw;
      this.body.scale.setScalar(SCALE[tipo]);
      const pair = tipo === 'par-de-criticos';
      const reach = pair ? span(corpo.lean, 0.58, 0.665) : 0;
      this.torso.position.set(0, 1.45 - corpo.crouch * 0.55 + 0.155 * reach, 0.138 * reach);
      this.torso.rotation.x = corpo.lean;
      this.head.rotation.x = pair ? -corpo.lean - 0.42 : -0.64 - 0.80 * corpo.lean;
      this.legs.forEach((leg, i) => {
        leg.position.y = 1.45 - corpo.crouch * 0.27;
        leg.rotation.x = (i === 0 ? corpo.step : -corpo.step) * 0.67 - corpo.crouch * 0.23;
      });
      this.cape.update(t, corpo.step, corpo.lean, pair, tipo === 'critico-bestial');
      this.body.updateWorldMatrix(true, true);
      const holding = fase === 'pega' || fase === 'entrega' || fase === 'ataque';
      const clawsForward = fase === 'espera' || fase === 'ataque';
      const [leftClosure, rightClosure] = fechamentoDaPegada(tipo, t);
      bendArm(this.arms[0], this.body, this.torso, esquerda, camera, false, clawsForward, leftClosure, otherDice, pair);
      bendArm(this.arms[1], this.body, this.torso, direita, camera, holding, clawsForward, rightClosure, otherDice, pair);
    }
    if (cobertura > 0) {
      camera.getWorldPosition(this.eyes.position);
      camera.getWorldQuaternion(this.eyes.quaternion);
      const { fov = 40, aspect = 1.6 } = camera as PerspectiveCamera;
      this.cameraHands.forEach((palm, i) => {
        const side = i === 0 ? -1 : 1;
        const depth = 3.18;
        const halfY = depth * Math.tan(fov * Math.PI / 360), halfX = halfY * aspect;
        const reach = 1 - (1 - cobertura) ** 1.54;
        const angle = side * (1.40 + 0.111 * cobertura), sx = 2.74 * halfY, sy = 0.565 * halfX;
        const inwardX = -side * Math.cos(angle) * sx, inwardY = side * Math.sin(angle) * sy;
        // Clip the whole silhouette by placement, keeping a slit between the two sets of claws at full reach.
        const extent = Math.max(...this.cameraBounds[i].map(({ min, max }) =>
          inwardX * (inwardX > 0 ? max.x : min.x) + inwardY * (inwardY > 0 ? max.y : min.y)));
        palm.position.set(side * (extent + halfX * (0.012 + 0.82 * (1 - reach))), halfY * (0.24 - 0.56 * (1 - cobertura)), -depth);
        palm.rotation.set(0, 0, angle);
        palm.scale.set(sx, sy, halfY * 1.87);
      });
    }
  }

  hide() { this.root.visible = false; this.body.visible = false; this.eyes.visible = false; this.cape.hide(); }

  dispose() {
    const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
    this.root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      geometries.add(o.geometry);
      for (const material of ([] as Material[]).concat(o.material)) materials.add(material);
    });
    for (const mesh of this.cape.assets()) {
      geometries.add(mesh.geometry);
      materials.add(mesh.material);
    }
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
}
