import {
  BackSide, Box3, BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide, DynamicDrawUsage, Euler, Group, LatheGeometry,
  Mesh, MeshStandardMaterial, Quaternion, Vector2, Vector3, type Camera, type Material, type PerspectiveCamera,
} from 'three';
import type { TipoVampiro } from '../../regras/index.ts';
import { span, type Vec3 } from '../../../shared/math.ts';
import { fechamentoDaPegada, VAMPIRO, vampiroAt } from '../domain/vampiroMotion.ts';
import { CENTRO_DA_PEGA, mangaDaCamera, maoDoVampiro } from './vampiroMao.ts';
import { elipsoide as sphere, soldar, superficie } from './malhaLisa.ts';

const UP = new Vector3(0, 1, 0);
const COLUMNS = 76, ROWS = 32, CAPE_SWEEP = 1.94;
const SHOULDERS = 1.68;
const SCALE: Record<TipoVampiro, number> = { 'par-de-criticos': 0.66, 'critico-bestial': 3.35, 'falha-bestial': 3.95 };

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
    const width = 0.245 * (1 - 0.42 * ends);
    const thickness = 0.132 * (1 - 0.46 * ends);
    const d = Math.hypot(thickness * Math.cos(section), width * Math.sin(section));
    const rise = width ** 2 * Math.sin(section) / d;
    const r = 0.42 + 0.35 * rise + thickness ** 2 * Math.cos(section) / d;
    const y = 1.74 + 0.14 * Math.sin(a) ** 2 + rise;
    return [Math.sin(a) * r, y, -Math.cos(a) * r - 0.07];
  });
}

function sweptHair() {
  const g = new BufferGeometry(), vertices: number[] = [], indices: number[] = [];
  const loops = 25, strands = 60;
  for (let row = 0; row <= loops; row++) for (let col = 0; col <= strands; col++) {
    const a = 2 * Math.PI * col / strands, r = row / loops;
    const front = Math.cos(a), widow = Math.exp(-((Math.acos(front) / 0.34) ** 2));
    const edge = 1.40 - 0.43 * front + widow * 0.34;
    const b = 0.001 + edge * r;
    const groove = 1 + 0.002 * Math.cos(9 * a + 2.9 * r) * Math.sin(Math.PI * r * 0.7);
    vertices.push(Math.sin(a) * Math.sin(b) * 0.39 * groove, 0.56 + 0.455 * Math.cos(b) * groove,
      -0.045 + Math.cos(a) * Math.sin(b) * 0.369 * groove);
    const i = row * (strands + 1) + col, next = i + strands + 1;
    if (row < loops && col < strands) indices.push(i, next, i + 1, i + 1, next, next + 1);
  }
  g.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// Weld the static pieces of each material at a joint. The arm and hand can each move independently.
function batch(material: MeshStandardMaterial, pieces: BufferGeometry[]) {
  return new Mesh(soldar(pieces), material);
}

class Cape {
  readonly group = new Group();
  private geometry = new BufferGeometry();
  private hem: BufferGeometry;
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
    this.hem = superficie(COLUMNS, 18, () => [0, 0, 0]);
    const hemPositions = this.hem.getAttribute('position') as BufferAttribute;
    hemPositions.setUsage(DynamicDrawUsage);
    const edge = new Mesh(this.hem, hemMaterial);
    edge.name = 'vampiro-barra-da-capa';
    edge.frustumCulled = false;
    this.group.add(outside, lining, edge);
    this.group.name = 'vampiro-capa';
    this.update(0, 0, 0);
  }

  update(t: number, step: number, lean: number, opened = false) {
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
          + (opened ? 0 : wave * 0.50 * v ** 3);
        this.positions.setXYZ(row * (COLUMNS + 1) + col, x, y, z);
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
      for (let row = 0; row <= 18; row++) {
        const a = row / 18 * Math.PI;
        point.copy(p).addScaledVector(fall, Math.sin(a) * 0.013).addScaledVector(normal, (1 - Math.cos(a)) * 0.013);
        hem.setXYZ(row * (COLUMNS + 1) + col, point.x, point.y, point.z);
      }
    }
    hem.needsUpdate = true;
    this.hem.computeVertexNormals();
  }
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
function bendArm(arm: Arm, root: Group, torso: Group, grip: Vec3, camera: Camera, holding: boolean, attack: boolean, closure: number, obstacles: readonly Vec3[]) {
  const { side, sleeve, cuff, palm } = arm;
  const shoulder = root.worldToLocal(torso.localToWorld(new Vector3(side * 0.59, SHOULDERS - 0.13, -0.015)));
  const point = root.worldToLocal(new Vector3(...grip));
  const cameraRotation = camera.getWorldQuaternion(new Quaternion());
  const cameraFacing = root.getWorldQuaternion(new Quaternion()).invert().multiply(cameraRotation);
  palm.quaternion.setFromEuler(new Euler(attack ? 0.62 : -0.36, side * 0.42, side * 0.24));
  if (holding) {
    palm.quaternion.copy(cameraFacing);
    const rest = side * (attack ? -0.58 : -0.30);
    palm.rotateZ(closure > 0 ? gripRoll(grip, rest, cameraRotation, obstacles) : rest);
    palm.rotateX(attack ? -0.13 : -0.20);
  }
  for (const mesh of palm.children as Mesh[]) mesh.morphTargetInfluences![0] = closure;
  palm.position.copy(point).sub(new Vector3(...CENTRO_DA_PEGA).applyQuaternion(palm.quaternion));
  const wrist = new Vector3(0, -0.31, -0.035).applyQuaternion(palm.quaternion).add(palm.position);
  const direction = wrist.clone().sub(shoulder), half = direction.length() / 2;
  direction.normalize();
  const bend = new Vector3(side * 0.78, -1, -0.26);
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
  private head = new Group();
  private eyes = new Group(); // the pair of hands in camera space
  private arms: Arm[];
  private legs: Group[];
  private cameraHands: Group[];
  private cameraBounds: Box3[][];
  private cape: Cape;

  constructor() {
    const coat = new MeshStandardMaterial({ name: 'coat', color: '#231b27', roughness: 0.71 });
    const velvet = new MeshStandardMaterial({ name: 'velvet', color: '#67162f', roughness: 0.74 });
    const red = new MeshStandardMaterial({ name: 'red', color: '#75142a', roughness: 0.67, side: DoubleSide });
    const trim = new MeshStandardMaterial({ name: 'trim', color: '#a47d5c', roughness: 0.38, metalness: 0.5 });
    const black = new MeshStandardMaterial({ name: 'black', color: '#22181e', roughness: 0.74, vertexColors: true });
    const lining = new MeshStandardMaterial({ name: 'lining', color: '#84152e', roughness: 0.72, side: BackSide, vertexColors: true });
    const leather = new MeshStandardMaterial({ name: 'leather', color: '#1c1820', roughness: 0.39 });
    const skin = new MeshStandardMaterial({ name: 'skin', color: '#c8adaa', roughness: 0.57, emissive: '#381e23', emissiveIntensity: 0.36 });
    const bone = new MeshStandardMaterial({ name: 'bone', color: '#f4e5d1', roughness: 0.42, side: DoubleSide });
    const nail = new MeshStandardMaterial({ name: 'nail', color: '#581128', roughness: 0.31, metalness: 0.16 });
    const hair = new MeshStandardMaterial({ name: 'hair', color: '#151019', roughness: 0.34 });
    const iris = new MeshStandardMaterial({ name: 'iris', color: '#c6122c', emissive: '#ed0e29', emissiveIntensity: 1.65, roughness: 0.38 });
    this.root.name = 'vampiro';
    this.body.name = 'vampiro-corpo';
    this.head.name = 'vampiro-cabeca';
    this.eyes.name = 'vampiro-maos-da-camera';

    this.cape = new Cape(black, lining, red);
    const vest = profile([[0.0, -0.19], [0.4, -0.10], [0.46, 0.25], [0.52, 0.75], [0.64, 1.31], [0.57, 1.52], [0.16, 1.67], [0, 1.69]], 0.64);
    const sides = [-1, 1];
    this.torso.add(
      this.cape.group,
      batch(velvet, [vest]),
      batch(coat, [profile([[0, -0.5], [0.47, -0.35], [0.49, 0.55], [0.65, 1.35], [0.5, 1.6], [0, 1.72]], 0.50)]),
      batch(red, [gola(),
        ...sides.map((s) => sphere([s * 0.36, 1.17, 0.29], [0.12, 0.47, 0.12], -s * 0.26))]),
      batch(bone, [
        sphere([-0.047, 1.44, 0.379], [0.083, 0.24, 0.086], -0.26),
        sphere([0.052, 1.41, 0.38], [0.075, 0.23, 0.08], 0.33),
      ]),
      batch(trim, [sphere([0, 1.4, 0.464], [0.041, 0.067, 0.031]),
        sphere([0, 1.02, 0.388], [0.034, 0.034, 0.025])]),
    );

    // The face has a closed hairline, a broad forehead and a narrow but continuous jaw.
    const face = profile([[0, 0.005], [0.115, 0.035], [0.205, 0.13], [0.26, 0.27], [0.33, 0.42],
      [0.338, 0.60], [0.292, 0.76], [0.22, 0.86], [0, 0.93]], 0.84);
    this.head.position.set(0, 1.73, 0.015);
    this.head.add(
      batch(skin, [face, taper([0, -0.24, -0.055], [0, 0.13, -0.035], 0.177, 0.155),
        sphere([0, 0.418, 0.29], [0.055, 0.135, 0.077]),
        sphere([0, 0.357, 0.343], [0.063, 0.045, 0.052]),
        ...sides.map((s) => sphere([s * 0.305, 0.442, -0.026], [0.092, 0.158, 0.077], s * -0.24))]),
      batch(hair, [sweptHair(),
        ...sides.map((s) => taper([s * 0.066, 0.550, 0.289], [s * 0.245, 0.602, 0.225], 0.024, 0.013))]),
      batch(leather, [taper([0, -0.25, -0.055], [0, -0.04, -0.039], 0.198, 0.18),
        sphere([0, 0.205, 0.155], [0.121, 0.061, 0.064]),
        ...sides.map((s) => sphere([s * 0.151, 0.51, 0.218], [0.086, 0.053, 0.054], s * 0.20))]),
      batch(iris, sides.map((s) => sphere([s * 0.140, 0.510, 0.251], [0.042, 0.023, 0.027], s * 0.22))),
      batch(bone, sides.map((s) => taper([s * 0.073, 0.214, 0.218], [s * 0.067, 0.152, 0.227], 0.016, 0.005))),
    );
    this.torso.add(this.head);

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
      leg.position.x = 0.25 * side;
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
      this.torso.position.y = 1.45 - corpo.crouch * 0.55;
      this.torso.rotation.x = corpo.lean;
      this.head.rotation.x = tipo === 'par-de-criticos' ? -0.16 : -0.64 - 0.80 * corpo.lean;
      this.legs.forEach((leg, i) => {
        leg.position.y = 1.45 - corpo.crouch * 0.27;
        leg.rotation.x = (i === 0 ? corpo.step : -corpo.step) * 0.67 - corpo.crouch * 0.23;
      });
      this.cape.update(t, corpo.step, corpo.lean, tipo === 'par-de-criticos');
      this.body.updateWorldMatrix(true, true);
      const holding = fase === 'pega' || fase === 'entrega' || fase === 'ataque';
      const clawsForward = fase === 'espera' || fase === 'ataque';
      const [leftClosure, rightClosure] = fechamentoDaPegada(tipo, t);
      bendArm(this.arms[0], this.body, this.torso, esquerda, camera, false, clawsForward, leftClosure, otherDice);
      bendArm(this.arms[1], this.body, this.torso, direita, camera, holding, clawsForward, rightClosure, otherDice);
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

  hide() { this.root.visible = false; this.body.visible = false; this.eyes.visible = false; }

  dispose() {
    const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
    this.root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      geometries.add(o.geometry);
      for (const material of ([] as Material[]).concat(o.material)) materials.add(material);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
}
