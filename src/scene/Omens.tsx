import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, Group, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, Path, PointLight,
  Shape, Sprite, SpriteMaterial, Vector3, type Camera, type Material, type Scene, type WebGLRenderer,
} from 'three';
import { MAX_DICE, type DieKind } from '../dice/polyhedra';
import { DUALITY_HIT, isD20, omenKind, omenMs } from '../dice/omen';
import { useDice } from '../store';
import { Kraken } from './Kraken';

// The 3D side of an omen, played after the dice settle and before the result shows:
// lightning on a critical d20, a kraken under a critical d100, the yin-yang fish for duality (the fumble's
// blood is a screen overlay, see OmenOverlay). Effect materials are compiled at mount and hidden
// (0 draw calls) outside an omen. When the show ends it marks the omen done, and the result goes on.

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const easeIn = (t: number) => clamp01(t) ** 3;

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

// `frame` plays the current omen and reports when it is over.
class Show {
  readonly root = new Group();
  private map = glowTexture();
  private bolts = Array.from({ length: MAX_DICE }, () => new Bolt(this.map));
  private kraken = new Kraken(this.map);
  private taiji = new TaiJi(this.map);
  private light = new PointLight('#CFE6FF', 0, 10, 2);
  private run: { throwId: number; at: number; ms: number; bolts: number; krakens: number; duality: boolean } | null = null;
  constructor() {
    for (const b of this.bolts) this.root.add(b.glow, b.core, b.flash);
    // Keep the light count constant: hiding the rupture must not recompile every die's shader.
    this.root.add(this.kraken.root, this.kraken.light, this.taiji.group, this.light);
  }
  // Compile every effect's shader up front, so the first omen does not stall a frame.
  compile(gl: WebGLRenderer, scene: Scene, camera: Camera, draw = false) {
    if (draw) {
      const target = new Vector3(0, 1, 0);
      this.bolts.forEach((b) => { b.start(target); b.update(70, camera.position); });
      this.kraken.update(900, camera, () => target);
      this.kraken.update(3300, camera, () => target);
      this.taiji.update(1300, camera);
    }
    this.root.traverse((o) => { o.visible = true; });
    gl.compile(scene, camera);
    if (draw) gl.render(scene, camera);
    this.hide();
    // ANGLE finishes some pipelines on their first draw. Replace the warm-up before the browser paints.
    if (draw) gl.render(scene, camera);
  }
  hide() { this.bolts.forEach((b) => b.hide()); this.kraken.hide(); this.taiji.hide(); this.light.intensity = 0; this.run = null; }
  frame(now: number, camera: Camera, at: (i: number) => Vector3 | null): number | null {
    const s = useDice.getState(), o = s.omen;
    if (!o || o.throwId !== s.throwId || s.gesture.phase !== 'settled' || s.omenDone === o.throwId) { if (this.run) this.hide(); return null; }
    if (this.run?.throwId !== o.throwId) {
      this.hide();
      const kind = omenKind(o), on = (is: (die: DieKind) => boolean) => (kind === 'crit' ? o.crits.filter((i) => is(s.dice[i])).map(at).filter((p): p is Vector3 => !!p) : []);
      const lit = on(isD20), deep = on((die) => die === 'd100');
      lit.forEach((p, i) => this.bolts[i].start(p));
      if (deep.length) this.kraken.start(deep, o.crits.filter((i) => s.dice[i] === 'd100'));
      if (lit[0]) this.light.position.copy(lit[0]).y += 1.2;
      this.run = { throwId: o.throwId, at: s.omenAt, ms: omenMs(o, s.dice), bolts: lit.length, krakens: deep.length, duality: kind === 'duality' };
    }
    const r = this.run, t = now - r.at;
    let striking = false;
    for (let i = 0; i < r.bolts; i++) striking = this.bolts[i].update(t, camera.position) || striking;
    if (r.krakens) this.kraken.update(t, camera, at);
    if (r.duality) this.taiji.update(t, camera);
    this.light.intensity = r.bolts ? (striking ? 30 : 0) + 10 * (1 - span(t, 0, 900)) : 0;
    if (t < r.ms) return null;
    this.hide();
    return o.throwId;
  }
  dispose() {
    this.root.traverse((o) => {
      if (o instanceof Mesh || o instanceof Sprite || o instanceof LineSegments) {
        o.dispose();
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
  const warmed = useRef(false);
  useEffect(() => { show.compile(gl, scene, camera); return () => show.dispose(); }, [camera, gl, scene, show]);
  useFrame(() => {
    // Environment builds its reflection texture after mount; warm the final shader variants as well.
    if (!warmed.current && scene.environment && gl.info.render.frame > 5 && !useDice.getState().omen) {
      show.compile(gl, scene, camera, true); warmed.current = true;
    }
    const done = show.frame(performance.now(), camera, (i) => { const b = bodies.current[i]; const p = b?.isValid() ? b.translation() : null; return p ? new Vector3(p.x, p.y, p.z) : null; });
    if (done !== null) useDice.getState().setOmenDone(done);
  });
  return <primitive object={show.root} />;
}
