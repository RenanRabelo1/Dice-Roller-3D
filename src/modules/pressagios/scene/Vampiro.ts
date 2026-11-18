import {
  BackSide, BufferAttribute, BufferGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Euler, Group, LatheGeometry,
  Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector2, Vector3, type Camera, type Material, type PerspectiveCamera,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TipoVampiro } from '../../regras/index.ts';
import type { Vec3 } from '../../../shared/math.ts';
import { VAMPIRO, vampiroAt } from '../domain/vampiroMotion.ts';
import { CENTRO_DA_PEGA, maoDoVampiro } from './vampiroMao.ts';

const UP = new Vector3(0, 1, 0);
const COLUMNS = 16, ROWS = 14, CAPE_SWEEP = 1.94;
const SHOULDERS = 1.68;
const SCALE: Record<TipoVampiro, number> = { 'par-de-criticos': 4.1, 'critico-bestial': 3.35, 'falha-bestial': 3.95 };

const sphere = (p: Vec3, s: Vec3, angle = 0) => new SphereGeometry(1, 12, 8).scale(...s).rotateZ(angle).translate(...p);

function taper(a: Vec3, b: Vec3, r0: number, r1: number, sides = 8): BufferGeometry {
  const start = new Vector3(...a), end = new Vector3(...b), axis = end.clone().sub(start);
  const length = axis.length();
  return new CylinderGeometry(r1, r0, length, sides)
    .applyQuaternion(new Quaternion().setFromUnitVectors(UP, axis.normalize())).translate(...start.lerp(end, 0.5).toArray());
}

const profile = (rings: [number, number][], depth: number) =>
  new LatheGeometry(rings.map(([radius, y]) => new Vector2(radius, y)), 18).scale(1, 1, depth);

function plate(a: Vec3, b: Vec3, c: Vec3, d: Vec3): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]), 3));
  g.computeVertexNormals();
  return g;
}

function sweptHair() {
  const g = new BufferGeometry(), vertices: number[] = [], indices: number[] = [];
  const loops = 14, strands = 36;
  for (let row = 0; row <= loops; row++) for (let col = 0; col <= strands; col++) {
    const a = 2 * Math.PI * col / strands, r = row / loops;
    const front = Math.cos(a), widow = Math.exp(-((Math.acos(front) / 0.24) ** 2));
    const edge = front > 0 ? 1.06 + 0.39 * (1 - front) + widow * 0.51 : 1.45 - 0.63 * front;
    const b = 0.001 + edge * r;
    const groove = 1 + 0.021 * Math.cos(18 * a + 2.9 * r) * Math.sin(Math.PI * r * 0.7);
    vertices.push(Math.sin(a) * Math.sin(b) * 0.39 * groove, 0.56 + 0.455 * Math.cos(b) * groove,
      -0.045 + Math.cos(a) * Math.sin(b) * 0.369 * groove - 0.051 * (1 - r));
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
  const parts = pieces.map((g) => {
    g.deleteAttribute('uv');
    return g.index ? g.toNonIndexed() : g;
  });
  const geometry = mergeGeometries(parts);
  new Set([...pieces, ...parts]).forEach((g) => g.dispose());
  if (!geometry) throw new Error('Could not batch Vampire geometry');
  return new Mesh(geometry, material);
}

class Cape {
  readonly group = new Group();
  private geometry = new BufferGeometry();
  private positions = new BufferAttribute(new Float32Array((COLUMNS + 1) * (ROWS + 1) * 3), 3).setUsage(DynamicDrawUsage);

  constructor(black: MeshStandardMaterial, red: MeshStandardMaterial) {
    const indices: number[] = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLUMNS; col++) {
      const a = row * (COLUMNS + 1) + col, b = a + 1, c = a + COLUMNS + 1, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
    this.geometry.setIndex(indices).setAttribute('position', this.positions);
    const outside = new Mesh(this.geometry, black), lining = new Mesh(this.geometry, red);
    outside.frustumCulled = lining.frustumCulled = false;
    this.group.add(outside, lining);
    this.update(0, 0, 0);
  }

  update(t: number, step: number, lean: number) {
    for (let row = 0; row <= ROWS; row++) {
      const v = row / ROWS;
      for (let col = 0; col <= COLUMNS; col++) {
        const angle = (col / COLUMNS * 2 - 1) * CAPE_SWEEP;
        const folds = v * (0.06 * Math.cos(angle * 13) + 0.10 * Math.sin(t * 0.006 + angle * 4 - v * 5));
        const radius = 0.72 + v * 0.81;
        const x = Math.sin(angle) * (radius + folds) + 0.22 * step * v * v;
        const y = 1.61 - v * (3.04 - 0.12 * Math.cos(angle * 3)) + v * v * 0.11 * Math.abs(step);
        const z = -Math.cos(angle) * (0.38 + 0.83 * v + folds) - 0.09 - v * (0.36 * Math.abs(step) + 0.65 * lean);
        this.positions.setXYZ(row * (COLUMNS + 1) + col, x, y, z);
      }
    }
    this.positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

interface Arm { sleeve: Mesh; cuff: Group; palm: Group; side: number }

// The world-space grip point is the centre of the die. Sleeves aim at an elbow and the wrist; the palm sits beneath it.
function bendArm(arm: Arm, root: Group, torso: Group, grip: Vec3, camera: Camera, holding: boolean, attack: boolean) {
  const { side, sleeve, cuff, palm } = arm;
  const shoulder = root.worldToLocal(torso.localToWorld(new Vector3(side * 0.59, SHOULDERS - 0.13, -0.015)));
  const point = root.worldToLocal(new Vector3(...grip));
  const cameraFacing = root.getWorldQuaternion(new Quaternion()).invert().multiply(camera.getWorldQuaternion(new Quaternion()));
  palm.quaternion.setFromEuler(new Euler(attack ? 0.62 : -0.36, side * 0.42, side * 0.24));
  if (holding) {
    palm.quaternion.copy(cameraFacing);
    palm.rotateZ(side * (attack ? -0.58 : -0.30));
    palm.rotateX(attack ? -0.13 : -0.20);
  }
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
  private cape: Cape;

  constructor() {
    const coat = new MeshStandardMaterial({ color: '#231b27', roughness: 0.71 });
    const velvet = new MeshStandardMaterial({ color: '#67162f', roughness: 0.74 });
    const red = new MeshStandardMaterial({ color: '#75142a', roughness: 0.67, side: DoubleSide });
    const trim = new MeshStandardMaterial({ color: '#a47d5c', roughness: 0.38, metalness: 0.5 });
    const black = new MeshStandardMaterial({ color: '#120e19', roughness: 0.74 });
    const lining = new MeshStandardMaterial({ color: '#84152e', roughness: 0.72, side: BackSide });
    const leather = new MeshStandardMaterial({ color: '#1c1820', roughness: 0.39 });
    const skin = new MeshStandardMaterial({ color: '#c8adaa', roughness: 0.57, emissive: '#381e23', emissiveIntensity: 0.36 });
    const bone = new MeshStandardMaterial({ color: '#f4e5d1', roughness: 0.42, side: DoubleSide });
    const nail = new MeshStandardMaterial({ color: '#581128', roughness: 0.31, metalness: 0.16 });
    const hair = new MeshStandardMaterial({ color: '#151019', roughness: 0.34 });
    const iris = new MeshStandardMaterial({ color: '#c6122c', emissive: '#ed0e29', emissiveIntensity: 1.65, roughness: 0.38 });
    this.root.name = 'vampiro';
    this.body.name = 'vampiro-corpo';
    this.head.name = 'vampiro-cabeca';
    this.eyes.name = 'vampiro-maos-da-camera';

    this.cape = new Cape(black, lining);
    const vest = profile([[0.0, -0.19], [0.4, -0.10], [0.46, 0.25], [0.52, 0.75], [0.64, 1.31], [0.57, 1.52], [0.16, 1.67], [0, 1.69]], 0.64);
    const sides = [-1, 1];
    const panels = sides.flatMap((s) => [
      plate([s * 0.46, -0.15, 0.235], [s * 0.48, 1.39, 0.355], [s * 0.29, 1.51, 0.405], [s * 0.28, 0.22, 0.31]),
      plate([s * 0.23, 1.08, 0.415], [s * 0.55, 1.54, 0.32], [s * 0.47, 1.74, 0.165], [s * 0.17, 1.65, 0.34]),
      plate([s * 0.18, 1.58, 0.10], [s * 0.41, 1.53, -0.13], [s * 0.60, 2.13, -0.28], [s * 0.18, 2.00, -0.41]),
    ]);
    this.torso.add(
      this.cape.group,
      batch(velvet, [vest]),
      batch(coat, [profile([[0, -0.5], [0.47, -0.35], [0.49, 0.55], [0.65, 1.35], [0.5, 1.6], [0, 1.72]], 0.50)]),
      batch(red, panels),
      batch(bone, [
        plate([-0.15, 1.65, 0.375], [0.15, 1.65, 0.375], [0.12, 1.38, 0.439], [-0.10, 1.27, 0.43]),
        sphere([-0.035, 1.34, 0.421], [0.076, 0.18, 0.042], -0.32),
        sphere([0.052, 1.31, 0.418], [0.053, 0.17, 0.035], 0.39),
      ]),
      batch(trim, [sphere([0, 1.4, 0.464], [0.041, 0.067, 0.031]),
        ...[0.32, 0.54, 0.76, 0.98].flatMap((y) => sides.map((s) => sphere([s * 0.11, y, 0.327 + 0.06 * y], [0.034, 0.034, 0.025])))]),
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
      batch(leather, [taper([0, -0.25, -0.055], [0, -0.04, -0.039], 0.198, 0.18, 18),
        sphere([0, 0.203, 0.231], [0.117, 0.050, 0.026]),
        ...sides.map((s) => sphere([s * 0.151, 0.51, 0.242], [0.097, 0.041, 0.030], s * 0.20))]),
      batch(iris, sides.map((s) => sphere([s * 0.138, 0.509, 0.271], [0.049, 0.021, 0.024], s * 0.20))),
      batch(bone, sides.map((s) => taper([s * 0.071, 0.228, 0.256], [s * 0.067, 0.149, 0.265], 0.022, 0.001))),
    );
    this.torso.add(this.head);

    this.arms = sides.map((side) => {
      const sleeve = batch(coat, [taper([0, -0.08, 0], [0, 1, 0], 0.26, 0.15), sphere([0, 0.06, 0], [0.26, 0.22, 0.23])]);
      const cuff = new Group();
      cuff.add(batch(coat, [taper([0, -0.05, 0], [0, 1.02, 0], 0.173, 0.125)]),
        batch(velvet, [taper([0, 0.73, 0], [0, 0.96, 0], 0.15, 0.158)]),
        batch(trim, [sphere([0.02 * side, 0.88, 0.15], [0.038, 0.033, 0.027])]));
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

    this.cameraHands = sides.map((s) => maoDoVampiro(s, skin, nail, true));
    this.eyes.add(...this.cameraHands);
    this.body.add(this.torso);
    this.root.add(this.body, this.eyes);
    this.hide();
  }

  // Poses both sets for the shared compile and the environment warm-up draw.
  prepare(camera: Camera) {
    this.update('falha-bestial', VAMPIRO.falha.destapa, camera);
  }

  update(tipo: TipoVampiro, t: number, camera: Camera, origins: readonly Vec3[] = [], carried?: Vec3) {
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
      this.head.rotation.x = -0.64 - 0.80 * corpo.lean;
      this.legs.forEach((leg, i) => {
        leg.position.y = 1.45 - corpo.crouch * 0.27;
        leg.rotation.x = (i === 0 ? corpo.step : -corpo.step) * 0.67 - corpo.crouch * 0.23;
      });
      this.cape.update(t, corpo.step, corpo.lean);
      this.body.updateWorldMatrix(true, true);
      const both = fase === 'pega' && tipo === 'par-de-criticos' || fase === 'junta';
      const holding = fase === 'pega' || fase === 'junta' || fase === 'prepara' || fase === 'entrega' || fase === 'ataque';
      const clawsForward = fase === 'espera' || fase === 'ataque';
      bendArm(this.arms[0], this.body, this.torso, esquerda, camera, both, clawsForward);
      bendArm(this.arms[1], this.body, this.torso, direita, camera, holding || fase === 'arremesso', clawsForward);
    }
    if (cobertura > 0) {
      camera.getWorldPosition(this.eyes.position);
      camera.getWorldQuaternion(this.eyes.quaternion);
      const { fov = 40, aspect = 1.6 } = camera as PerspectiveCamera;
      this.cameraHands.forEach((palm, i) => {
        const side = i === 0 ? -1 : 1;
        const depth = 3.56 - 0.86 * i;
        const halfY = depth * Math.tan(fov * Math.PI / 360), halfX = halfY * aspect;
        const reach = 1 - (1 - cobertura) ** 1.54;
        palm.position.set(side * halfX * (2.06 - 1.34 * reach), side * halfY * 0.23, -depth);
        palm.rotation.set(-0.095, side * (0.35 - 0.24 * cobertura), side * (1.42 + 0.07 * cobertura));
        palm.scale.setScalar(halfY * Math.min(2.48, 1.15 + aspect * 0.77));
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
