import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Path, PointLight,
  RingGeometry, Shape, Sprite, SpriteMaterial, Vector3, type Camera, type Material, type Scene, type WebGLRenderer,
} from 'three';
import { MAX_DICE, type DieKind } from '../dice/polyhedra';
import { DUALITY_HIT, omenKind, omenMs } from '../dice/omen';
import { TRAY } from '../physics/world';
import { useDice } from '../store';

// The 3D side of an omen, played after the dice settle and before the result shows:
// lightning on a critical d20, a kraken under a critical d100, the yin-yang fish for duality (the fumble's
// blood is a screen overlay, see OmenOverlay). Everything is built once, compiled at mount and hidden
// (0 draw calls) outside an omen. When the show ends it marks the omen done, and the result goes on.

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const easeIn = (t: number) => clamp01(t) ** 3;
const UP = new Vector3(0, 1, 0);

function glowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}
const glow = (map: CanvasTexture, color: string) =>
  new Sprite(new SpriteMaterial({ map, color, blending: AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));

// Lightning: a jagged ribbon (wide blue glow + thin white core) from above the screen down to the die,
// with one branch. Three short flashes, each a new path; never a strobe.
const BOLT = 16, BRANCH = 6;
const FLASHES = [[0, 150], [200, 310], [350, 430]];
class Bolt {
  readonly glow: Mesh; readonly core: Mesh; readonly flash: Sprite;
  private points = Array.from({ length: BOLT + BRANCH }, () => new Vector3());
  private target = new Vector3();
  private flashIndex = -1;
  constructor(map: CanvasTexture) {
    const strip = (from: number, n: number) => Array.from({ length: n - 1 }, (_, i) => {
      const v = 2 * (from + i);
      return [v, v + 1, v + 2, v + 1, v + 3, v + 2];
    }).flat();
    const ribbon = (color: string, opacity: number) => {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array((BOLT + BRANCH) * 6), 3));
      g.setIndex([...strip(0, BOLT), ...strip(BOLT, BRANCH)]);
      const m = new Mesh(g, new MeshBasicMaterial({ color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }));
      m.frustumCulled = false; m.renderOrder = 15;
      return m;
    };
    this.glow = ribbon('#5FA8FF', 0.6); this.core = ribbon('#F4FBFF', 1); this.flash = glow(map, '#BFE3FF');
  }
  start(target: Vector3) { this.target.copy(target); this.flashIndex = -1; }
  private strike(camera: Vector3) {
    const top = this.target.clone().add(new Vector3((Math.random() - 0.5) * 3, 11, -1.2 - Math.random()));
    const end = this.target.clone().add(new Vector3(0, 0.55, 0));
    for (let i = 0; i < BOLT; i++) {
      const f = i / (BOLT - 1), a = i === BOLT - 1 ? 0 : 0.6 * Math.sqrt(Math.sin(Math.PI * f));
      this.points[i].lerpVectors(top, end, f).add(new Vector3((Math.random() - 0.5) * 2 * a, 0, (Math.random() - 0.5) * 2 * a));
    }
    const from = this.points[5 + Math.floor(Math.random() * 4)];
    const dir = new Vector3(Math.random() < 0.5 ? -1 : 1, -1.3, (Math.random() - 0.5) * 0.6).normalize();
    for (let k = 0; k < BRANCH; k++) this.points[BOLT + k].copy(from).addScaledVector(dir, k * 0.45).add(new Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3));
    for (const [mesh, width] of [[this.glow, 0.34], [this.core, 0.07]] as const) {
      const pos = mesh.geometry.getAttribute('position') as BufferAttribute;
      for (const [from, n, w] of [[0, BOLT, width], [BOLT, BRANCH, width * 0.6]]) {
        for (let i = 0; i < n; i++) {
          const p = this.points[from + i], d = this.points[from + Math.min(n - 1, i + 1)].clone().sub(this.points[from + Math.max(0, i - 1)]);
          const side = d.cross(camera.clone().sub(p)).normalize().multiplyScalar(w * (1 - 0.35 * i / n));
          pos.setXYZ(2 * (from + i), p.x + side.x, p.y + side.y, p.z + side.z);
          pos.setXYZ(2 * (from + i) + 1, p.x - side.x, p.y - side.y, p.z - side.z);
        }
      }
      pos.needsUpdate = true;
    }
  }
  update(t: number, camera: Vector3) {
    const flash = FLASHES.findIndex(([a, b]) => t >= a && t < b);
    if (flash >= 0 && flash !== this.flashIndex) this.strike(camera);
    this.flashIndex = flash;
    const drawn = flash === 0 ? Math.max(1, Math.floor(span(t, 0, 70) * (BOLT - 1))) : BOLT - 1; // the first one falls
    for (const m of [this.glow, this.core]) {
      m.visible = flash >= 0;
      m.geometry.setDrawRange(0, drawn === BOLT - 1 ? Infinity : drawn * 6);
    }
    const k = t < 60 ? easeOut(t / 60) : 1 - span(t, 60, 900);
    this.flash.visible = k > 0;
    this.flash.position.copy(this.target).y += 0.5;
    this.flash.scale.setScalar(3 * k + 0.01);
    (this.flash.material as SpriteMaterial).opacity = k;
    return flash >= 0;
  }
  hide() { this.glow.visible = this.core.visible = this.flash.visible = false; }
}

// Kraken: a dark whirlpool opens in the felt under the die and seven tapering, suckered tentacles rise out of it,
// curl over the die and sink back. All seven are one mesh, recomputed in place each frame (~1.6k vertices).
const ARMS = 7, RINGS = 28, SEG = 8;
class Kraken {
  readonly arms: Mesh<BufferGeometry, MeshPhysicalMaterial>; readonly vortex: Mesh; readonly ripple: Mesh;
  private center = new Vector3();
  private roots: { p: Vector3; inward: Vector3; side: Vector3; length: number; phase: number }[] = [];
  constructor() {
    const g = new BufferGeometry(), n = ARMS * (RINGS + 1) * SEG;
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    const colors = new Float32Array(n * 3), index: number[] = [];
    const outer = [new Color('#3A1636'), new Color('#6E3766')], inner = new Color('#C4707E'), sucker = new Color('#F0B7B0');
    for (let a = 0; a < ARMS; a++) for (let i = 0; i <= RINGS; i++) for (let j = 0; j < SEG; j++) {
      const v = (a * (RINGS + 1) + i) * SEG + j, inside = Math.cos((2 * Math.PI * j) / SEG) > 0.5;
      const c = inside ? (i % 3 === 1 && i < RINGS - 2 ? sucker : inner) : outer[0].clone().lerp(outer[1], i / RINGS);
      colors.set([c.r, c.g, c.b], v * 3);
      if (i < RINGS) {
        const w = (a * (RINGS + 1) + i) * SEG, next = (j + 1) % SEG;
        index.push(w + j, w + next, w + SEG + j, w + next, w + SEG + next, w + SEG + j);
      }
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    g.setIndex(index);
    this.arms = new Mesh(g, new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.25 }));
    this.arms.frustumCulled = false;
    this.vortex = new Mesh(new CircleGeometry(2.1, 48).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: '#04110F', transparent: true, opacity: 0.9, depthWrite: false }));
    this.ripple = new Mesh(new RingGeometry(1.75, 2.1, 48).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: '#1E6F66', transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
  }
  start(target: Vector3) {
    this.center.set(target.x, 0, target.z);
    const lim = (v: number, m: number) => Math.max(-m, Math.min(m, v));
    this.roots = Array.from({ length: ARMS }, (_, a) => {
      const angle = (2 * Math.PI * a) / ARMS + Math.random() * 0.4, r = 1.25 + Math.random() * 0.35;
      const p = new Vector3(lim(this.center.x + Math.cos(angle) * r, TRAY.halfWidth - 0.3), 0, lim(this.center.z + Math.sin(angle) * r, TRAY.halfDepth - 0.3));
      const inward = this.center.clone().sub(p).setY(0).normalize();
      return { p, inward, side: new Vector3().crossVectors(UP, inward), length: 2.6 + Math.random() * 0.8, phase: Math.random() * 6 };
    });
    this.vortex.position.set(this.center.x, 0.012, this.center.z);
    this.ripple.position.set(this.center.x, 0.014, this.center.z);
  }
  update(t: number) {
    const open = easeOut(t / 350) * (1 - easeIn(span(t, 1950, 2300)));
    this.vortex.visible = this.ripple.visible = this.arms.visible = open > 0;
    this.vortex.scale.setScalar(open + 0.001);
    this.ripple.scale.setScalar((open + 0.001) * (1 + 0.06 * Math.sin(t / 90)));
    this.ripple.rotation.y = -t / 400;
    (this.ripple.material as MeshBasicMaterial).opacity = 0.7 * open;
    const curl = 0.5 + 1.9 * easeOut(span(t, 350, 1300)) - 0.6 * span(t, 1600, 2100);
    const pos = this.arms.geometry.getAttribute('position') as BufferAttribute;
    const p = new Vector3(), d = new Vector3(), n = new Vector3(), b = new Vector3(), w = new Vector3(), v = new Vector3();
    this.roots.forEach((root, a) => {
      const rise = easeOut(span(t, 150 + 70 * a, 850 + 70 * a)) * (1 - easeIn(span(t, 1600 + 40 * a, 2050 + 40 * a)));
      const ds = root.length / RINGS, sec = t / 1000;
      p.copy(root.p).addScaledVector(UP, -(1 - rise) * root.length - 0.05); // below the felt until it rises
      for (let i = 0; i <= RINGS; i++) {
        const s = i / RINGS;
        const theta = curl * s ** 1.6 + 0.35 * s * Math.sin(3.2 * sec + root.phase + 4 * s);
        const psi = 0.35 * s * Math.sin(2.1 * sec + 1.7 * root.phase);
        w.copy(root.inward).multiplyScalar(Math.cos(psi)).addScaledVector(root.side, Math.sin(psi));
        d.copy(UP).multiplyScalar(Math.cos(theta)).addScaledVector(w, Math.sin(theta));
        n.copy(UP).multiplyScalar(-Math.sin(theta)).addScaledVector(w, Math.cos(theta)); // toward the inside of the curl: the suckers
        b.crossVectors(d, n);
        const radius = 0.24 * (1 - 0.93 * s) * (0.7 + 0.3 * rise);
        for (let j = 0; j < SEG; j++) {
          const ang = (2 * Math.PI * j) / SEG;
          v.copy(p).addScaledVector(n, Math.cos(ang) * radius).addScaledVector(b, Math.sin(ang) * radius);
          pos.setXYZ((a * (RINGS + 1) + i) * SEG + j, v.x, v.y, v.z);
        }
        p.addScaledVector(d, ds);
      }
    });
    pos.needsUpdate = true;
    this.arms.geometry.computeVertexNormals();
  }
  hide() { this.arms.visible = this.vortex.visible = this.ripple.visible = false; }
}

// Duality: the two halves of the yin-yang, each a fish with an eye of the other colour, fly in from opposite
// sides in a tightening spiral over the tray, collide into the disc (the screen shakes), spin and vanish.
class TaiJi {
  readonly group = new Group();
  private disc = new Group();
  private fish: Group[];
  private aura: Sprite; private burst: Sprite;
  constructor(map: CanvasTexture) {
    const R = 1.5, depth = 0.3;
    const half = new Shape().moveTo(0, R);
    half.absarc(0, 0, R, Math.PI / 2, (3 * Math.PI) / 2, false); // the big left half, top to bottom
    half.absarc(0, -R / 2, R / 2, (3 * Math.PI) / 2, Math.PI / 2, true); // up around the lower small circle
    half.absarc(0, R / 2, R / 2, -Math.PI / 2, Math.PI / 2, false); // and the upper one, back to the top
    half.holes.push(new Path().absarc(0, R / 2, R / 7, 0, 2 * Math.PI, true));
    const body = new ExtrudeGeometry(half, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2, curveSegments: 32 }).translate(0, 0, -depth / 2);
    const eye = new CylinderGeometry(R / 7, R / 7, depth + 0.06, 24).rotateX(Math.PI / 2).translate(0, R / 2, 0);
    const light = new MeshStandardMaterial({ color: '#F3EFE6', roughness: 0.4, emissive: '#2A2620' });
    const dark = new MeshStandardMaterial({ color: '#0D0C10', roughness: 0.22, metalness: 0.4 });
    this.fish = [[light, dark], [dark, light]].map(([skin, iris], k) => {
      const f = new Group();
      f.add(new Mesh(body, skin), new Mesh(eye, iris));
      f.userData.turn = k * Math.PI; // the dark fish is the light one turned half a circle
      return f;
    });
    this.aura = glow(map, '#FFD98A'); this.burst = glow(map, '#FFF4D6');
    this.aura.position.z = this.burst.position.z = -0.5;
    this.disc.add(...this.fish);
    this.group.add(this.disc, this.aura, this.burst);
  }
  update(t: number, camera: Camera) {
    this.group.visible = true;
    this.group.position.set(0, 4, 1.5);
    this.group.quaternion.copy(camera.quaternion); // the disc faces the viewer
    const p = clamp01(t / DUALITY_HIT), after = t - DUALITY_HIT;
    const spin = t < DUALITY_HIT ? 4 * Math.PI * p * p : 4 * Math.PI + 2 * Math.PI * easeOut(after / 900);
    const r = t < DUALITY_HIT ? 6.5 * (1 - p * p) : 0;
    this.fish.forEach((f, k) => {
      const a = spin + f.userData.turn + Math.PI; // the light fish starts on the left
      f.position.set(r * Math.cos(a), r * Math.sin(a), Math.sin(2 * Math.PI * p + k * Math.PI) * 1.2 * (1 - p));
      f.rotation.set(0, (1 - p) ** 2 * 3 * (k ? 1 : -1), spin + f.userData.turn); // tumbling in 3D until they lock
    });
    const out = easeIn(span(t, 2000, 2600));
    const pulse = after > 0 ? 1 + 0.25 * (1 - easeOut(after / 400)) : 1;
    this.disc.scale.setScalar(pulse * (1 - out) + 0.001);
    this.group.position.y += 1.5 * out;
    this.aura.scale.setScalar(5.5 * (1 - out) + 0.01);
    (this.aura.material as SpriteMaterial).opacity = (after > 0 ? 0.6 : 0.35 * p) * (1 - out);
    const b = after > 0 ? span(after, 0, 400) : 0;
    this.burst.visible = after > 0 && b < 1;
    this.burst.scale.setScalar(9 * easeOut(after / 250) + 0.01);
    (this.burst.material as SpriteMaterial).opacity = 1 - b;
  }
  hide() { this.group.visible = false; }
}

// Every effect, pooled per die; `frame` plays the current omen and reports when it is over.
class Show {
  readonly root = new Group();
  private map = glowTexture();
  private bolts = Array.from({ length: MAX_DICE }, () => new Bolt(this.map));
  private krakens = Array.from({ length: MAX_DICE }, () => new Kraken());
  private taiji = new TaiJi(this.map);
  private light = new PointLight('#CFE6FF', 0, 10, 2);
  private run: { throwId: number; at: number; ms: number; bolts: number; krakens: number; duality: boolean } | null = null;
  constructor() {
    for (const b of this.bolts) this.root.add(b.glow, b.core, b.flash);
    for (const k of this.krakens) this.root.add(k.vortex, k.ripple, k.arms);
    this.root.add(this.taiji.group, this.light);
  }
  // Compile every effect's shader up front, so the first omen does not stall a frame.
  compile(gl: WebGLRenderer, scene: Scene, camera: Camera) {
    this.root.traverse((o) => { o.visible = true; });
    gl.compile(scene, camera);
    this.hide();
  }
  hide() { this.bolts.forEach((b) => b.hide()); this.krakens.forEach((k) => k.hide()); this.taiji.hide(); this.light.intensity = 0; this.run = null; }
  frame(now: number, camera: Camera, at: (i: number) => Vector3 | null): number | null {
    const s = useDice.getState(), o = s.omen;
    if (!o || o.throwId !== s.throwId || s.gesture.phase !== 'settled' || s.omenDone === o.throwId) { if (this.run) this.hide(); return null; }
    if (this.run?.throwId !== o.throwId) {
      this.hide();
      const kind = omenKind(o), on = (die: DieKind) => (kind === 'crit' ? o.crits.filter((i) => s.dice[i] === die).map(at).filter((p): p is Vector3 => !!p) : []);
      const lit = on('d20'), deep = on('d100');
      lit.forEach((p, i) => this.bolts[i].start(p));
      deep.forEach((p, i) => this.krakens[i].start(p));
      if (lit[0]) this.light.position.copy(lit[0]).y += 1.2;
      this.run = { throwId: o.throwId, at: now, ms: omenMs(o, s.dice), bolts: lit.length, krakens: deep.length, duality: kind === 'duality' };
    }
    const r = this.run, t = now - r.at;
    let striking = false;
    for (let i = 0; i < r.bolts; i++) striking = this.bolts[i].update(t, camera.position) || striking;
    for (let i = 0; i < r.krakens; i++) this.krakens[i].update(t);
    if (r.duality) this.taiji.update(t, camera);
    this.light.intensity = r.bolts ? (striking ? 30 : 0) + 10 * (1 - span(t, 0, 900)) : 0;
    if (t < r.ms) return null;
    this.hide();
    return o.throwId;
  }
  dispose() {
    this.root.traverse((o) => {
      if (o instanceof Mesh || o instanceof Sprite) {
        o.geometry.dispose();
        for (const m of ([] as Material[]).concat(o.material)) m.dispose();
      }
    });
    this.map.dispose();
  }
}

export function Omens({ bodies }: { bodies: RefObject<(RapierRigidBody | null)[]> }) {
  const { camera, gl, scene } = useThree();
  const show = useMemo(() => new Show(), []);
  useEffect(() => { show.compile(gl, scene, camera); return () => show.dispose(); }, [camera, gl, scene, show]);
  useFrame(() => {
    const done = show.frame(performance.now(), camera, (i) => { const p = bodies.current[i]?.translation(); return p ? new Vector3(p.x, p.y, p.z) : null; });
    if (done !== null) useDice.getState().setOmenDone(done);
  });
  return <primitive object={show.root} />;
}
