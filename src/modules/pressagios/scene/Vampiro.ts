import {
  BackSide, BufferAttribute, BufferGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, LatheGeometry,
  Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector2, Vector3, type Camera, type Material, type PerspectiveCamera,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TipoVampiro } from '../../regras/index.ts';
import type { Vec3 } from '../../../shared/math.ts';
import { VAMPIRO, vampiroAt } from '../domain/vampiroMotion.ts';

const UP = new Vector3(0, 1, 0);
const COLUMNS = 16, ROWS = 14, CAPE_SWEEP = 1.94;
const SHOULDERS = 1.68;

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

function hand(side: number, skin: MeshStandardMaterial, nail: MeshStandardMaterial): Group {
  const palm = new Group();
  const flesh: BufferGeometry[] = [sphere([0, 0.03, 0], [0.255, 0.31, 0.13]), sphere([0, -0.2, 0], [0.15, 0.22, 0.11])];
  const claws: BufferGeometry[] = [];
  const lengths = [0.57, 0.7, 0.63, 0.49];
  for (const [i, length] of lengths.entries()) {
    const x = side * (i - 1.5);
    const base: Vec3 = [x * 0.139, 0.23, 0.02], knuckle: Vec3 = [x * 0.18, 0.38, 0.025];
    const joint: Vec3 = [x * 0.21, 0.28 + length * 0.72, 0.14], tip: Vec3 = [x * 0.235, 0.23 + length, 0.22];
    flesh.push(taper(base, knuckle, 0.069, 0.062), sphere(knuckle, [0.063, 0.072, 0.065]),
      taper(knuckle, joint, 0.058, 0.047), sphere(joint, [0.05, 0.059, 0.052]), taper(joint, tip, 0.044, 0.029));
    claws.push(taper(tip, [tip[0] - x * 0.014, tip[1] + 0.16, 0.37], 0.046, 0.001));
  }
  const thumb: Vec3 = [-0.31 * side, 0.18, 0.13], tip: Vec3 = [-0.39 * side, 0.36, 0.23];
  flesh.push(taper([-0.16 * side, -0.03, 0], thumb, 0.10, 0.073), sphere(thumb, [0.074, 0.077, 0.071]), taper(thumb, tip, 0.069, 0.039));
  claws.push(taper(tip, [-0.43 * side, 0.48, 0.36], 0.049, 0.001));
  palm.add(batch(skin, flesh), batch(nail, claws));
  return palm;
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
function bendArm(arm: Arm, root: Group, torso: Group, grip: Vec3, holding: boolean, attack: boolean) {
  const { side, sleeve, cuff, palm } = arm;
  const shoulder = root.worldToLocal(torso.localToWorld(new Vector3(side * 0.59, SHOULDERS - 0.13, -0.015)));
  const point = root.worldToLocal(new Vector3(...grip));
  const wrist = point.clone().add(new Vector3(0.05 * side, holding ? -0.30 : -0.08, holding ? -0.20 : -0.04));
  const direction = wrist.clone().sub(shoulder), half = direction.length() / 2;
  direction.normalize();
  const bend = new Vector3(side * 0.72, -1, -0.25);
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
  palm.position.copy(wrist);
  palm.rotation.set(holding ? 0.72 : attack ? 0.62 : -0.27, side * 0.2, side * (holding ? -0.35 : 0.2));
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
    const velvet = new MeshStandardMaterial({ color: '#6b182e', roughness: 0.79 });
    const red = new MeshStandardMaterial({ color: '#a5233b', roughness: 0.69, side: DoubleSide });
    const trim = new MeshStandardMaterial({ color: '#a47d5c', roughness: 0.38, metalness: 0.5 });
    const black = new MeshStandardMaterial({ color: '#120e19', roughness: 0.74 });
    const lining = new MeshStandardMaterial({ color: '#84152e', roughness: 0.72, side: BackSide });
    const leather = new MeshStandardMaterial({ color: '#1c1820', roughness: 0.39 });
    const skin = new MeshStandardMaterial({ color: '#d5c4bc', roughness: 0.56, emissive: '#2a1b23', emissiveIntensity: 0.32 });
    const bone = new MeshStandardMaterial({ color: '#f4e4d0', roughness: 0.43 });
    const nail = new MeshStandardMaterial({ color: '#691b30', roughness: 0.28, metalness: 0.12 });
    const hair = new MeshStandardMaterial({ color: '#15111b', roughness: 0.41 });
    const iris = new MeshStandardMaterial({ color: '#fa293a', emissive: '#e41133', emissiveIntensity: 2.3, roughness: 0.4 });
    this.root.name = 'vampiro';
    this.body.name = 'vampiro-corpo';
    this.head.name = 'vampiro-cabeca';
    this.eyes.name = 'vampiro-maos-da-camera';

    this.cape = new Cape(black, lining);
    const vest = profile([[0.0, -0.19], [0.4, -0.10], [0.46, 0.25], [0.52, 0.75], [0.64, 1.31], [0.57, 1.52], [0.16, 1.67], [0, 1.69]], 0.64);
    const sides = [-1, 1];
    const panels = sides.flatMap((s) => [
      plate([s * 0.53, -0.22, 0.10], [s * 0.53, 1.49, 0.33], [s * 0.29, 1.57, 0.39], [s * 0.23, 0.25, 0.28]),
      plate([s * 0.28, 0.94, 0.39], [s * 0.65, 1.63, 0.28], [s * 0.55, 1.85, 0.12], [s * 0.19, 1.74, 0.29]),
      plate([s * 0.2, 1.55, 0.05], [s * 0.49, 1.51, -0.12], [s * 0.68, 2.14, -0.24], [s * 0.19, 1.95, -0.38]),
    ]);
    this.torso.add(
      this.cape.group,
      batch(velvet, [vest]),
      batch(coat, [profile([[0, -0.5], [0.47, -0.35], [0.49, 0.55], [0.65, 1.35], [0.5, 1.6], [0, 1.72]], 0.50)]),
      batch(red, panels),
      batch(bone, [
        sphere([0, 1.42, 0.405], [0.19, 0.24, 0.052]),
        sphere([-0.09, 1.31, 0.409], [0.075, 0.19, 0.041], -0.25),
        sphere([0.07, 1.29, 0.412], [0.075, 0.18, 0.043], 0.31),
      ]),
      batch(trim, [sphere([0, 1.41, 0.46], [0.085, 0.11, 0.035]),
        ...[0.32, 0.54, 0.76, 0.98].flatMap((y) => sides.map((s) => sphere([s * 0.11, y, 0.327 + 0.06 * y], [0.034, 0.034, 0.025])))]),
    );

    // Swept hair, narrow cheekbones and a peaked jaw are built from simple surfaces.
    const face = profile([[0, 0.03], [0.16, 0.07], [0.23, 0.19], [0.35, 0.45], [0.32, 0.67], [0.24, 0.82], [0, 0.91]], 0.81);
    this.head.position.y = 1.78;
    this.head.add(
      batch(skin, [face, taper([0, -0.19, 0], [0, 0.2, 0], 0.19, 0.17),
        sphere([0, 0.41, 0.25], [0.079, 0.18, 0.10]),
        ...sides.flatMap((s) => [sphere([s * 0.31, 0.4, -0.025], [0.10, 0.17, 0.12], s * -0.23),
          sphere([s * 0.19, 0.39, 0.185], [0.131, 0.089, 0.097], s * 0.35)])]),
      batch(hair, [sphere([0, 0.695, -0.11], [0.35, 0.255, 0.31]),
        ...[-2, -1, 0, 1, 2].map((i) => sphere([0.106 * i, 0.795 - 0.022 * Math.abs(i), -0.04], [0.093, 0.10, 0.27], 0.14 * i)),
        ...sides.map((s) => sphere([s * 0.287, 0.565, 0.016], [0.083, 0.225, 0.16], s * -0.20))]),
      batch(leather, [sphere([0, 0.248, 0.215], [0.127, 0.048, 0.049]),
        ...sides.map((s) => sphere([s * 0.148, 0.52, 0.240], [0.117, 0.049, 0.05], s * 0.28))]),
      batch(iris, sides.map((s) => sphere([s * 0.148, 0.516, 0.28], [0.061, 0.027, 0.023], s * 0.28))),
      batch(bone, sides.map((s) => taper([s * 0.081, 0.277, 0.254], [s * 0.08, 0.202, 0.271], 0.026, 0.003))),
    );
    this.torso.add(this.head);

    this.arms = sides.map((side) => {
      const sleeve = batch(coat, [taper([0, -0.08, 0], [0, 1, 0], 0.26, 0.15), sphere([0, 0.06, 0], [0.26, 0.22, 0.23])]);
      const cuff = new Group();
      cuff.add(batch(coat, [taper([0, -0.05, 0], [0, 1.02, 0], 0.173, 0.125)]),
        batch(velvet, [taper([0, 0.73, 0], [0, 0.96, 0], 0.15, 0.158)]),
        batch(trim, [sphere([0.02 * side, 0.88, 0.15], [0.038, 0.033, 0.027])]));
      const palm = hand(side, skin, nail);
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

    this.cameraHands = sides.map((s) => hand(s, skin, nail));
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
    this.head.visible = corpo.cabeca;
    if (corpo.visivel) {
      this.body.position.set(...corpo.p);
      this.body.rotation.y = corpo.yaw;
      this.body.scale.setScalar(tipo === 'par-de-criticos' ? 1.95 : 1.15);
      this.torso.position.y = 1.45 - corpo.crouch * 0.55;
      this.torso.rotation.x = corpo.lean;
      this.legs.forEach((leg, i) => {
        leg.position.y = 1.45 - corpo.crouch * 0.27;
        leg.rotation.x = (i === 0 ? corpo.step : -corpo.step) * 0.67 - corpo.crouch * 0.23;
      });
      this.cape.update(t, corpo.step, corpo.lean);
      this.body.updateWorldMatrix(true, true);
      const both = fase === 'pega' && tipo === 'par-de-criticos' || fase === 'junta';
      const holding = fase === 'pega' || fase === 'junta' || fase === 'prepara' || fase === 'entrega' || fase === 'ataque';
      const clawsForward = fase === 'espera' || fase === 'ataque';
      bendArm(this.arms[0], this.body, this.torso, esquerda, both, clawsForward);
      bendArm(this.arms[1], this.body, this.torso, direita, holding, clawsForward);
    }
    if (cobertura > 0) {
      camera.getWorldPosition(this.eyes.position);
      camera.getWorldQuaternion(this.eyes.quaternion);
      const { fov = 40, aspect = 1.6 } = camera as PerspectiveCamera;
      const depth = 1.68, halfY = depth * Math.tan(fov * Math.PI / 360), halfX = halfY * aspect;
      this.cameraHands.forEach((palm, i) => {
        const side = i === 0 ? -1 : 1;
        palm.position.set(side * halfX * (1.86 - 1.22 * cobertura), -halfY * (0.93 - cobertura * 0.60) + side * 0.11 * cobertura, -depth + i * 0.09);
        palm.rotation.set(0.14, side * (0.50 - 0.30 * cobertura), side * (0.75 + 0.38 * cobertura));
        palm.scale.setScalar(1.55 * Math.min(1, 0.48 + aspect * 0.42));
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
