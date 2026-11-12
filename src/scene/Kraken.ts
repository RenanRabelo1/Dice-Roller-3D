import {
  BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, Group, InstancedMesh, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, TorusGeometry,
  Vector3, type Camera,
} from 'three';
import { fractureCells, KRAKEN, krakenAt, span, stormAt } from './krakenMotion';

const ARMS = 10, RINGS = 56, SIDES = 10, SUCKER_EVERY = 5;
const SUCKERS = Math.floor((RINGS - 6) / SUCKER_EVERY) + 1; // per arm, on rings 3 … RINGS-3
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
const COIL = 1.05; // radius of the coil round a die (d100: 0.9 + the tentacle's tip)

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

type Root = { p: Vector3; inward: Vector3; side: Vector3; length: number; phase: number };
// Storm: the tentacles come up from the sea outside the tray, clear of the middle of the front so the die can come through.
const SEA: [number, number][] = [[-5.2, -6.6], [0, -7.2], [5.2, -6.6], [-9.2, -2.6], [-9.4, 2.4], [9.2, -2.6], [9.4, 2.4], [-7.6, 6.4], [7.6, 6.4], [-2.6, -7.4]];

// The kraken, for both d100 shows. "grab" (a 1): the felt bursts; one tentacle coils round the die, lifts it,
// flings it out of sight, fetches it and brings it to the screen, while nine others thrash round the hole.
// "storm" (a 100): ten tentacles rise from the sea round the tray and sway. One mesh for all arms
// (recomputed in place each frame, ~4k vertices) plus instanced suckers and splinters.
export class Kraken {
  readonly root = new Group();
  private mode: 'grab' | 'storm' = 'grab';
  private arms: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private suckers = new InstancedMesh(new TorusGeometry(0.115, 0.035, 5, 10), new MeshStandardMaterial({ color: FLESH, roughness: 0.4 }), ARMS * SUCKERS);
  private splinters = new InstancedMesh(new BoxGeometry(0.11, 0.55, 0.09), new MeshStandardMaterial({ color: SHARD_DEFAULT.wood, transparent: true }), 56);
  private floor = new Group();
  private floorMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  private pieces: { mesh: Mesh; x: number; z: number; dx: number; dz: number; near: number }[] = [];
  private cracks = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: '#E2B674', transparent: true }));
  private abyss = new Mesh(new CircleGeometry(3.8, 64).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: '#080B12' }));
  private center = new Vector3();
  private roots: Root[] = [];
  private target = 0; // the grabbed die
  private line = Array.from({ length: RINGS + 1 }, () => new Vector3());
  private transform = new Object3D();
  private sucker = 0;

  constructor() {
    this.root.name = 'kraken'; this.floor.name = 'kraken-fragments';
    const g = new BufferGeometry(), count = ARMS * (RINGS + 1) * SIDES;
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    const colors = new Float32Array(count * 3), index: number[] = [];
    for (let a = 0; a < ARMS; a++) for (let i = 0; i <= RINGS; i++) for (let j = 0; j < SIDES; j++) {
      const v = (a * (RINGS + 1) + i) * SIDES + j;
      const c = Math.cos(j * 2 * Math.PI / SIDES) > 0.6 ? FLESH : SKIN.clone().lerp(TIP, i / RINGS); // the sucker side is the frame's normal
      colors.set([c.r, c.g, c.b], v * 3);
      if (i < RINGS) {
        const next = (j + 1) % SIDES, w = (a * (RINGS + 1) + i) * SIDES;
        index.push(w + j, w + next, w + SIDES + j, w + next, w + SIDES + next, w + SIDES + j);
      }
    }
    g.setAttribute('color', new BufferAttribute(colors, 3)); g.setIndex(index);
    this.arms = new Mesh(g, new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.8 }));
    this.arms.frustumCulled = this.suckers.frustumCulled = this.splinters.frustumCulled = false;
    this.root.add(this.arms, this.suckers, this.splinters, this.floor, this.cracks, this.abyss);
    this.start('grab', [new Vector3(0, 0.9, 0)], 0);
    this.hide();
  }

  start(mode: 'grab' | 'storm', positions: Vector3[], target: number, table = SHARD_DEFAULT) {
    this.mode = mode; this.target = target;
    const ring = (p: Vector3, length: number, phase: number): Root => {
      const inward = this.center.clone().sub(p).setY(0).normalize();
      return { p, inward, side: new Vector3().crossVectors(UP, inward), length, phase };
    };
    this.pieces.forEach(({ mesh }) => mesh.geometry.dispose()); this.floor.clear(); this.pieces = [];
    this.root.visible = true;
    if (mode === 'storm') {
      this.center.set(0, 0, 0);
      this.roots = SEA.map(([x, z], i) => ring(new Vector3(x, -2, z), 7.2 + 1.6 * Math.abs(Math.sin(i * 2.3)), i * 1.9));
      this.floor.visible = this.cracks.visible = this.abyss.visible = this.splinters.visible = false;
      return;
    }
    this.center.set(0, 0, 0);
    positions.forEach((p) => this.center.addScaledVector(p, 1 / positions.length));
    this.center.set(Math.max(-4.1, Math.min(4.1, this.center.x)), 0, Math.max(-2.1, Math.min(2.1, this.center.z)));
    // Arm 0 grabs: it comes up just behind the die. The others thrash in a ring round the hole.
    this.roots = Array.from({ length: ARMS }, (_, i) => {
      if (i === 0) return ring(this.center.clone().add(new Vector3(0.2, 0, -1.4)), 6, 0);
      const a = i * 2 * Math.PI / (ARMS - 1), r = 2.2 + 0.25 * Math.sin(i * 7);
      return ring(this.center.clone().add(new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)), 5.4 + 0.8 * Math.sin(i * 3), i * 2.4);
    });
    this.abyss.position.copy(this.center).y = -0.45;
    const felt = new Color(table.felt), wood = shardWood(table.wood);
    this.splinters.material.color.copy(wood);
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
  }

  update(t: number, camera: Camera, at: (i: number) => Vector3 | null) {
    this.root.visible = true; this.sucker = 0;
    if (this.mode === 'storm') {
      const rise = stormAt(t).arms;
      this.arms.visible = this.suckers.visible = rise > 0;
      if (rise > 0) this.roots.forEach((root, a) => { this.sway(root, t, Math.min(rise, span(t, 80 * a, 1000 + 80 * a))); this.skin(a, (s) => 0.5 * (1 - 0.95 * s), root.inward); });
      this.commit();
      return;
    }
    const k = krakenAt(t), sec = t / 1000;
    this.floor.visible = k.broken;
    this.pieces.forEach(({ mesh, x, z, dx, dz, near }, i) => {
      const burst = k.spread * near;
      mesh.position.set(x + dx * burst, k.spread * (0.5 + 1.8 * near + 0.08 * Math.sin(sec * 2 + i)), z + dz * burst);
      mesh.rotation.set(dz * burst * 0.45, burst * Math.sin(i * 4) * 0.18, -dx * burst * 0.45);
    });
    this.cracks.visible = t < KRAKEN.rupture;
    this.cracks.geometry.setDrawRange(0, 2 * Math.floor(span(t, 50, KRAKEN.rupture) * this.cracks.geometry.getAttribute('position').count / 2));
    this.abyss.visible = k.broken; this.abyss.scale.setScalar(0.4 + k.spread * 0.8);
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
    const grabbing = t < KRAKEN.restored - 200;
    this.arms.visible = this.suckers.visible = k.arms > 0 || grabbing;
    if (!this.arms.visible) return;
    const die = at(this.target) ?? this.center.clone().setY(0.9);
    this.grab(t, k.grip, die, camera);
    this.skin(0, (s) => 0.46 * (1 - 0.82 * s), die.clone().sub(this.roots[0].p).setY(0).normalize());
    for (let a = 1; a < ARMS; a++) { this.thrash(this.roots[a], t, k.arms * span(t, 300 + 40 * a, 1050 + 35 * a)); this.skin(a, (s) => 0.36 * (1 - 0.96 * s), this.roots[a].inward); }
    this.commit();
  }

  // The grabbing arm: up out of the hole and over onto the die, coiled round it (as seen from the camera, so
  // the rolled face stays visible), letting go to throw it, reaching after it out of sight, carrying it back.
  private grab(t: number, grip: number, die: Vector3, camera: Camera) {
    const root = this.roots[0].p, rest = root.clone().addScaledVector(UP, 4.5), below = root.clone().addScaledVector(UP, -1.5);
    let tip = die.clone();
    if (t >= KRAKEN.fling && t < KRAKEN.catch) {
      // Whips after the thrown die and pulls back; then stretches out to fetch it.
      tip = t < KRAKEN.away ? die.clone().lerp(rest, span(t, KRAKEN.fling + 80, KRAKEN.away) ** 0.7)
        : rest.clone().lerp(die, span(t, KRAKEN.away + 100, KRAKEN.catch) ** 2);
    } else if (t >= KRAKEN.release) tip = die.clone().lerp(below, span(t, KRAKEN.release + 200, KRAKEN.restored - 400) ** 2);
    tip.lerp(below, 1 - span(t, 450, 1050) ** 0.6); // rising out of the hole at first
    const axis = camera.position.clone().sub(die).normalize();
    const u1 = root.clone().sub(die).addScaledVector(axis, -root.clone().sub(die).dot(axis));
    if (u1.lengthSq() < 1e-6) u1.set(1, 0, 0).addScaledVector(axis, -axis.x);
    u1.normalize();
    const u2 = new Vector3().crossVectors(axis, u1);
    // The coil always takes the last third of the arm; letting go shortens its arc (it unwinds) into a tapering tip.
    const wrap = Math.min(1, grip * 3), coilStart = die.clone().addScaledVector(u1, COIL).addScaledVector(axis, -0.3 * grip);
    const end = tip.clone().lerp(coilStart, wrap);
    const coilRings = Math.round(RINGS * 0.36), bodyRings = RINGS - coilRings;
    const reach = end.distanceTo(root), toward = root.clone().sub(end).setY(0).normalize();
    const p0 = root.clone().addScaledVector(UP, -1.2), p1 = root.clone().addScaledVector(UP, 0.45 * reach + 1.2);
    const p2 = end.clone().addScaledVector(UP, 1.3).addScaledVector(toward, 0.7);
    const side = new Vector3().crossVectors(end.clone().sub(p0), UP);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    for (let i = 0; i <= bodyRings; i++) {
      const s = i / Math.max(1, bodyRings), r = 1 - s;
      this.line[i].copy(p0).multiplyScalar(r ** 3).addScaledVector(p1, 3 * r * r * s).addScaledVector(p2, 3 * r * s * s).addScaledVector(end, s ** 3)
        .addScaledVector(side, 0.35 * Math.sin(4 * Math.PI * s + t / 170) * Math.sin(Math.PI * s) * (1 - 0.7 * grip));
    }
    const ahead = end.clone().sub(this.line[bodyRings - 1]).normalize();
    for (let j = 1; j <= coilRings; j++) {
      const v = j / coilRings, phi = 2 * Math.PI * 1.6 * grip * v, r = COIL * (1 - 0.08 * v);
      const coiled = die.clone().addScaledVector(u1, r * Math.cos(phi)).addScaledVector(u2, r * Math.sin(phi)).addScaledVector(axis, (0.6 * v - 0.3) * grip);
      this.line[bodyRings + j].copy(end).addScaledVector(ahead, 1.1 * v).lerp(coiled, wrap);
    }
  }

  // A thrashing arm round the hole, curling in over it.
  private thrash(root: Root, t: number, rise: number) {
    const p = root.p.clone().addScaledVector(UP, -(1 - rise) * root.length - 0.06), w = new Vector3(), d = new Vector3();
    for (let i = 0; i <= RINGS; i++) {
      const s = i / RINGS;
      const theta = 1.15 * s ** 1.6 + 0.5 * s * Math.sin(t / 300 + root.phase + 4 * s);
      const psi = 0.6 * s * Math.sin(t / 500 + root.phase);
      w.copy(root.inward).multiplyScalar(Math.cos(psi)).addScaledVector(root.side, Math.sin(psi));
      d.copy(UP).multiplyScalar(Math.cos(theta)).addScaledVector(w, Math.sin(theta));
      this.line[i].copy(p);
      p.addScaledVector(d, root.length / RINGS);
    }
  }

  // A storm arm out of the sea, leaning over the tray and swaying.
  private sway(root: Root, t: number, rise: number) {
    const p = root.p.clone().addScaledVector(UP, -(1 - rise) * root.length), w = new Vector3(), d = new Vector3();
    for (let i = 0; i <= RINGS; i++) {
      const s = i / RINGS;
      const theta = (0.9 + 0.35 * Math.sin(t / 900 + root.phase)) * s ** 1.3 + 0.5 * s * Math.sin(t / 520 + root.phase + 3 * s);
      const psi = 0.5 * s * Math.sin(t / 760 + 1.3 * root.phase);
      w.copy(root.inward).multiplyScalar(Math.cos(psi)).addScaledVector(root.side, Math.sin(psi));
      d.copy(UP).multiplyScalar(Math.cos(theta)).addScaledVector(w, Math.sin(theta));
      this.line[i].copy(p);
      p.addScaledVector(d, root.length / RINGS);
    }
  }

  // Skins arm `a` round `this.line` with frames carried along it (no twisting), suckers on the normal's side.
  private skin(a: number, radius: (s: number) => number, normal: Vector3) {
    const pos = this.arms.geometry.getAttribute('position') as BufferAttribute;
    const tangent = new Vector3(), n = normal.clone(), b = new Vector3(), v = new Vector3();
    for (let i = 0; i <= RINGS; i++) {
      tangent.subVectors(this.line[Math.min(RINGS, i + 1)], this.line[Math.max(0, i - 1)]);
      if (tangent.lengthSq() < 1e-10) tangent.copy(UP); else tangent.normalize();
      n.addScaledVector(tangent, -n.dot(tangent));
      if (n.lengthSq() < 1e-8) n.set(1, 0, 0).addScaledVector(tangent, -tangent.x);
      n.normalize(); b.crossVectors(tangent, n);
      const s = i / RINGS, r = radius(s);
      for (let j = 0; j < SIDES; j++) {
        const ang = j * 2 * Math.PI / SIDES;
        v.copy(this.line[i]).addScaledVector(n, Math.cos(ang) * r).addScaledVector(b, Math.sin(ang) * r);
        pos.setXYZ((a * (RINGS + 1) + i) * SIDES + j, v.x, v.y, v.z);
      }
      if (i >= 3 && i <= RINGS - 3 && (i - 3) % SUCKER_EVERY === 0) {
        this.transform.position.copy(this.line[i]).addScaledVector(n, r);
        this.transform.quaternion.setFromUnitVectors(Z, n); this.transform.scale.setScalar(1 - 0.7 * s);
        this.transform.updateMatrix(); this.suckers.setMatrixAt(this.sucker++, this.transform.matrix);
      }
    }
  }

  private commit() {
    this.arms.geometry.getAttribute('position').needsUpdate = true;
    this.arms.geometry.computeVertexNormals();
    this.suckers.instanceMatrix.needsUpdate = true;
  }

  hide() { this.root.visible = false; }
}
