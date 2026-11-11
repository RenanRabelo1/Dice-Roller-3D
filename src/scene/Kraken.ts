import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Group,
  InstancedMesh, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, Object3D, PointLight, Shape, ShapeGeometry, Sprite, SpriteMaterial, TorusGeometry,
  Vector3, type Camera, type CanvasTexture,
} from 'three';
import { MAX_DICE } from '../dice/polyhedra';
import { fractureCells, KRAKEN, krakenAt, span } from './krakenMotion';

const ARMS = 10, RINGS = 36, SIDES = 10, SUCKERS = 8;
const UP = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
const FLESH = new Color('#E8AFB9'), SKIN = new Color('#41243F'), TIP = new Color('#915C82');
// The shards take the table's own colours; their wood is the lit inside of the plank, lighter than the planks' face
// (the default table's #3B2416 shows as #815435, and any other wood gets the same lift).
export const SHARD_DEFAULT = { felt: '#3A0F1A', wood: '#815435' };
export const shardWood = (wood: string) => {
  if (wood.toLowerCase() === '#3b2416') return new Color(SHARD_DEFAULT.wood);
  const c = new Color(wood), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL(hsl.h, hsl.s, Math.min(0.85, hsl.l * 2.24));
};

export function shard(points: [number, number][], x: number, z: number, felt = new Color(SHARD_DEFAULT.felt), wood = new Color(SHARD_DEFAULT.wood)) {
  const positions: number[] = [], colors: number[] = [];
  const tri = (a: number[], b: number[], c: number[], color: Color) => {
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  };
  const top = points.map(([px, pz]) => [px - x, 0, pz - z]);
  const bottom = points.map(([px, pz]) => [px - x, -0.5, pz - z]);
  for (let i = 1; i < points.length - 1; i++) {
    tri(top[0], top[i + 1], top[i], felt);
    tri(bottom[0], bottom[i], bottom[i + 1], wood);
  }
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    tri(top[i], top[next], bottom[i], wood); tri(top[next], bottom[next], bottom[i], wood);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  g.computeVertexNormals();
  return g;
}

function feathers() {
  const positions: number[] = [];
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    const x = 0.65 + i * 0.08, y = -0.35 + i * 0.13;
    const tx = 2.0 + i * 0.17, ty = 0.15 + i * 0.36;
    const s = new Shape().moveTo(side * x, y);
    s.quadraticCurveTo(side * (tx - 0.25), ty - 0.75, side * tx, ty);
    s.quadraticCurveTo(side * (tx - 0.55), ty - 0.1, side * (x + 0.18), y + 0.32);
    s.closePath();
    const indexed = new ShapeGeometry(s, 12), g = indexed.toNonIndexed();
    positions.push(...g.getAttribute('position').array);
    indexed.dispose(); g.dispose();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  return g;
}

function rays() {
  const positions: number[] = [];
  for (let i = 0; i < 32; i++) {
    const a = i * Math.PI / 16, width = i % 4 === 0 ? 0.035 : 0.012, reach = i % 4 === 0 ? 3.5 : 2.6;
    for (const [r, angle] of [[1.15, a - width], [reach, a], [1.15, a + width]]) positions.push(r * Math.cos(angle), r * Math.sin(angle), -0.1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  return g;
}

// A single rupture per throw, including several critical d100s: ten arms and instanced suckers/splinters.
export class Kraken {
  readonly root = new Group();
  private arms: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private suckers = new InstancedMesh(new TorusGeometry(0.115, 0.035, 5, 10), new MeshStandardMaterial({ color: FLESH, roughness: 0.4 }), ARMS * SUCKERS);
  private splinters = new InstancedMesh(new BoxGeometry(0.11, 0.55, 0.09), new MeshStandardMaterial({ color: SHARD_DEFAULT.wood, transparent: true }), 56);
  private floor = new Group();
  private floorMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  private pieces: { mesh: Mesh; x: number; z: number; dx: number; dz: number; near: number }[] = [];
  private cracks = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: '#E2B674', transparent: true }));
  private abyss = new Mesh(new CircleGeometry(3.8, 64).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: '#080B12' }));
  private center = new Vector3();
  private roots: { p: Vector3; inward: Vector3; side: Vector3; length: number; phase: number }[] = [];
  private transform = new Object3D();
  private ringMaterial = new MeshBasicMaterial({ color: '#FFE3A0', transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  private wingMaterial = new MeshBasicMaterial({ color: '#FFF5DB', transparent: true, side: DoubleSide, depthWrite: false, toneMapped: false });
  private rayMaterial = new MeshBasicMaterial({ color: '#FFD178', transparent: true, blending: AdditiveBlending, side: DoubleSide, depthWrite: false, toneMapped: false });
  private halos: Group[];
  readonly light = new PointLight('#FFDCA0', 0, 22, 2);
  private targets: number[] = [];

  constructor(map: CanvasTexture) {
    this.root.name = 'kraken'; this.floor.name = 'kraken-fragments';
    const g = new BufferGeometry(), count = ARMS * (RINGS + 1) * SIDES;
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    const colors = new Float32Array(count * 3), index: number[] = [];
    for (let a = 0; a < ARMS; a++) for (let i = 0; i <= RINGS; i++) for (let j = 0; j < SIDES; j++) {
      const v = (a * (RINGS + 1) + i) * SIDES + j;
      const c = Math.cos(j * 2 * Math.PI / SIDES) > 0.6 ? FLESH : SKIN.clone().lerp(TIP, i / RINGS);
      colors.set([c.r, c.g, c.b], v * 3);
      if (i < RINGS) {
        const next = (j + 1) % SIDES, w = (a * (RINGS + 1) + i) * SIDES;
        index.push(w + j, w + next, w + SIDES + j, w + next, w + SIDES + next, w + SIDES + j);
      }
    }
    g.setAttribute('color', new BufferAttribute(colors, 3)); g.setIndex(index);
    this.arms = new Mesh(g, new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.8 }));
    this.arms.frustumCulled = this.suckers.frustumCulled = this.splinters.frustumCulled = false;
    const wing = feathers(), beam = rays(), ring = new TorusGeometry(1.38, 0.018, 6, 96);
    this.halos = Array.from({ length: MAX_DICE }, () => {
      const h = new Group(); h.name = 'kraken-halo';
      const feathers = new Mesh(wing, this.wingMaterial), rays = new Mesh(beam, this.rayMaterial);
      const inner = new Mesh(ring, this.ringMaterial), outer = new Mesh(ring, this.ringMaterial);
      outer.scale.setScalar(1.13); outer.rotation.x = 0.16;
      const aura = new Sprite(new SpriteMaterial({ map, color: '#FFE5A6', blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
      aura.scale.setScalar(6.5); aura.position.z = -0.2;
      h.add(aura, rays, feathers, inner, outer);
      return h;
    });
    this.root.add(this.arms, this.suckers, this.splinters, this.floor, this.cracks, this.abyss, ...this.halos);
    this.start([new Vector3(0, 0.9, 0)], [0]);
    this.hide();
  }

  start(positions: Vector3[], targets: number[], table = SHARD_DEFAULT) {
    this.targets = targets;
    const felt = new Color(table.felt), wood = shardWood(table.wood);
    this.splinters.material.color.copy(wood);
    this.center.set(0, 0, 0);
    positions.forEach((p) => this.center.addScaledVector(p, 1 / positions.length));
    this.center.set(Math.max(-4.1, Math.min(4.1, this.center.x)), 0, Math.max(-2.1, Math.min(2.1, this.center.z)));
    this.roots = Array.from({ length: ARMS }, (_, i) => {
      const a = i * 2 * Math.PI / ARMS, r = 2.1 + 0.25 * Math.sin(i * 7);
      const p = this.center.clone().add(new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      const inward = this.center.clone().sub(p).normalize();
      return { p, inward, side: new Vector3().crossVectors(UP, inward), length: 5.1 + 0.65 * Math.sin(i * 3), phase: i * 2.4 };
    });
    this.abyss.position.copy(this.center).y = -0.45;
    this.pieces.forEach(({ mesh }) => mesh.geometry.dispose()); this.floor.clear();
    const lines: number[] = [];
    this.pieces = fractureCells(this.center.x, this.center.z).map((cell) => {
      const x = cell.reduce((sum, p) => sum + p[0], 0) / cell.length, z = cell.reduce((sum, p) => sum + p[1], 0) / cell.length;
      const dir = new Vector3(x - this.center.x, 0, z - this.center.z), near = dir.length() < 3.1 ? 1 : 0.35;
      dir.normalize();
      const mesh = new Mesh(shard(cell, x, z, felt, wood), this.floorMaterial); this.floor.add(mesh);
      cell.forEach((p, i) => { const next = cell[(i + 1) % cell.length]; lines.push(p[0], 0.018, p[1], next[0], 0.018, next[1]); });
      return { mesh, x, z, dx: dir.x, dz: dir.z, near };
    });
    this.cracks.geometry.dispose(); this.cracks.geometry = new BufferGeometry();
    this.cracks.geometry.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
    this.root.visible = true;
  }

  update(t: number, camera: Camera, at: (i: number) => Vector3 | null) {
    const k = krakenAt(t), sec = t / 1000;
    this.root.visible = true;
    this.floor.visible = k.broken;
    this.pieces.forEach(({ mesh, x, z, dx, dz, near }, i) => {
      const burst = k.spread * near;
      mesh.position.set(x + dx * burst, k.spread * (0.5 + 1.8 * near + 0.08 * Math.sin(sec * 2 + i)), z + dz * burst);
      mesh.rotation.set(dz * burst * 0.45, burst * Math.sin(i * 4) * 0.18, -dx * burst * 0.45);
    });
    this.cracks.visible = t < KRAKEN.rupture;
    this.cracks.geometry.setDrawRange(0, 2 * Math.floor(span(t, 50, KRAKEN.rupture) * this.cracks.geometry.getAttribute('position').count / 2));
    this.abyss.visible = k.broken; this.abyss.scale.setScalar(0.4 + k.spread * 0.8);
    this.arms.visible = this.suckers.visible = k.arms > 0;
    if (k.arms > 0) this.tentacles(t, k.arms);
    const debris = span(t, KRAKEN.rupture, 1900);
    this.splinters.visible = t >= KRAKEN.rupture && debris < 1;
    if (this.splinters.visible) {
      this.splinters.material.opacity = 1 - span(t, 1450, 1900);
      for (let i = 0; i < this.splinters.count; i++) {
        const a = i * 2.4, r = 0.5 + 4 * debris * (0.45 + (i % 7) / 10);
        this.transform.position.set(this.center.x + Math.cos(a) * r, 0.2 + (2 + i % 4) * Math.sin(Math.PI * debris), this.center.z + Math.sin(a) * r);
        this.transform.rotation.set(a + debris * 8, debris * i, a); this.transform.scale.setScalar(0.6 + (i % 5) * 0.2);
        this.transform.updateMatrix(); this.splinters.setMatrixAt(i, this.transform.matrix);
      }
      this.splinters.instanceMatrix.needsUpdate = true;
    }
    this.ringMaterial.opacity = k.halo * 0.9; this.wingMaterial.opacity = k.halo * 0.72; this.rayMaterial.opacity = k.halo * 0.32;
    const back = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    this.halos.forEach((h, i) => {
      const p = i < this.targets.length ? at(this.targets[i]) : null;
      h.visible = !!p && k.halo > 0;
      if (!p) return;
      h.position.copy(p).addScaledVector(back, -0.85); h.quaternion.copy(camera.quaternion);
      h.children[1].rotation.z = sec * 0.12;
      h.children[2].rotation.y = Math.sin(sec * 1.3) * 0.08;
      (h.children[0] as Sprite).material.opacity = k.halo * 0.38;
    });
    this.light.position.copy(this.center).setY(3);
    this.light.intensity = 35 * k.halo;
  }

  private tentacles(t: number, amount: number) {
    const pos = this.arms.geometry.getAttribute('position') as BufferAttribute;
    const p = new Vector3(), d = new Vector3(), n = new Vector3(), b = new Vector3(), w = new Vector3(), v = new Vector3();
    let sucker = 0;
    this.roots.forEach((root, a) => {
      const rise = amount * span(t, 300 + 40 * a, 1050 + 35 * a);
      p.copy(root.p).addScaledVector(UP, -(1 - rise) * root.length - 0.06);
      for (let i = 0; i <= RINGS; i++) {
        const s = i / RINGS;
        const theta = (2.6 - 1.6 * span(t, KRAKEN.launch, KRAKEN.reveal)) * s ** 1.5 + 0.27 * s * Math.sin(t / 400 + root.phase + 4 * s);
        const psi = 0.4 * s * Math.sin(t / 650 + root.phase);
        w.copy(root.inward).multiplyScalar(Math.cos(psi)).addScaledVector(root.side, Math.sin(psi));
        d.copy(UP).multiplyScalar(Math.cos(theta)).addScaledVector(w, Math.sin(theta));
        n.copy(UP).multiplyScalar(-Math.sin(theta)).addScaledVector(w, Math.cos(theta)); b.crossVectors(d, n);
        const radius = 0.36 * (1 - 0.96 * s);
        for (let j = 0; j < SIDES; j++) {
          const ang = j * 2 * Math.PI / SIDES;
          v.copy(p).addScaledVector(n, Math.cos(ang) * radius).addScaledVector(b, Math.sin(ang) * radius);
          pos.setXYZ((a * (RINGS + 1) + i) * SIDES + j, v.x, v.y, v.z);
        }
        if (i >= 3 && i <= 31 && (i - 3) % 4 === 0) {
          this.transform.position.copy(p).addScaledVector(n, radius);
          this.transform.quaternion.setFromUnitVectors(Z, n); this.transform.scale.setScalar(1 - 0.7 * s);
          this.transform.updateMatrix(); this.suckers.setMatrixAt(sucker++, this.transform.matrix);
        }
        p.addScaledVector(d, root.length / RINGS);
      }
    });
    pos.needsUpdate = true; this.arms.geometry.computeVertexNormals();
    this.suckers.instanceMatrix.needsUpdate = true;
  }

  hide() { this.root.visible = false; this.light.intensity = 0; }
}
