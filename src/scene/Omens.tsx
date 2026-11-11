import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, Group, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, Path, PointLight,
  Points, Shape, Sprite, SpriteMaterial, Vector3, type Camera, type Material, type PerspectiveCamera, type Scene, type WebGLRenderer,
} from 'three';
import { MAX_DICE } from '../dice/polyhedra';
import { DUALITY_HIT, omenKind, omenMs } from '../dice/omen';
import { omenPlaying, useDice } from '../store';
import { krakenIndices, span, stormIndices } from './krakenMotion';
import { Kraken } from './Kraken';
import { Fire } from './Fire';
import { fireAt, fireIndices } from './fireMotion';

// The 3D side of an omen, played after the dice settle and before the result shows: lightning on a d20 20,
// the kraken grabbing a d100 1, fire on a d20 1, the kraken's storm on a d100 100, the yin-yang fish for
// duality (the rain, heat and shakes are screen overlays, see OmenOverlay). Effect materials are compiled at
// mount and hidden (0 draw calls) outside an omen. When the show ends it marks the omen done, and the result goes on.

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
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

// `frame` plays the current omen and reports when it is over. Fire outlives it: a die that rolled a 1 on a
// d20 keeps burning at the front until it is picked up.
class Show {
  readonly root = new Group();
  private map = glowTexture();
  private bolts = Array.from({ length: MAX_DICE }, () => new Bolt(this.map));
  private kraken = new Kraken();
  private fire = new Fire();
  private taiji = new TaiJi(this.map);
  private light = new PointLight('#CFE6FF', 0, 10, 2); // the one omen light (lightning or fire never play together)
  private run: { throwId: number; at: number; ms: number; bolts: number; kraken: 'grab' | 'storm' | null; fire: number[]; duality: boolean; over: boolean } | null = null;
  constructor() {
    for (const b of this.bolts) this.root.add(b.glow, b.core, b.flash);
    // Keep the light count constant: hiding an effect must not recompile every die's shader.
    this.root.add(this.kraken.root, this.fire.root, this.taiji.group, this.light);
  }
  // Compile every effect's shader up front, so the first omen does not stall a frame.
  compile(gl: WebGLRenderer, scene: Scene, camera: Camera, draw = false) {
    if (draw) {
      const target = new Vector3(0, 1, 0), here = () => target;
      this.bolts.forEach((b) => { b.start(target); b.update(70, camera.position); });
      this.kraken.start('grab', [target], 0); this.kraken.update(900, camera, here);
      this.fire.start([0], [target]); this.fire.update(1500, here, 1000);
      this.taiji.update(1300, camera);
    }
    this.root.traverse((o) => { o.visible = true; });
    gl.compile(scene, camera);
    if (draw) gl.render(scene, camera);
    this.hide();
    // ANGLE finishes some pipelines on their first draw. Replace the warm-up before the browser paints.
    if (draw) gl.render(scene, camera);
  }
  hide() { this.bolts.forEach((b) => b.hide()); this.kraken.hide(); this.fire.hide(); this.taiji.hide(); this.light.intensity = 0; this.run = null; }
  frame(now: number, camera: Camera, at: (i: number) => Vector3 | null, pixels: number): number | null {
    const s = useDice.getState(), o = s.omen;
    // This throw's omen, while its dice lie settled (after the show only the fire is left).
    if (!o || o.throwId !== s.throwId || s.gesture.phase !== 'settled') { if (this.run) this.hide(); return null; }
    if (this.run?.throwId !== o.throwId) {
      this.hide();
      const kind = omenKind(o), positions = (indices: number[]) => indices.map(at).filter((p): p is Vector3 => !!p);
      const lit = kind === 'crit' ? o.crits.filter((i) => s.dice[i] === 'd20') : [];
      const grab = krakenIndices(o, s.dice), storm = stormIndices(o, s.dice), fire = fireIndices(o, s.dice);
      positions(lit).forEach((p, i) => this.bolts[i].start(p));
      if (grab.length) this.kraken.start('grab', positions(grab), grab[0]);
      else if (storm.length) this.kraken.start('storm', [], storm[0]);
      if (fire.length) this.fire.start(fire, positions(fire));
      const first = positions(lit)[0] ?? positions(fire)[0];
      if (first) this.light.position.copy(first).y += 1.2;
      this.light.color.set(fire.length ? '#FF7A2A' : '#CFE6FF');
      this.run = { throwId: o.throwId, at: s.omenAt, ms: omenMs(o, s.dice), bolts: lit.length, kraken: grab.length ? 'grab' : storm.length ? 'storm' : null, fire, duality: kind === 'duality', over: false };
    }
    const r = this.run, t = now - r.at;
    if (r.fire.length) { // burns on after the show, on the dice now at the front
      this.fire.update(t, at, pixels);
      const p = at(r.fire[0]);
      if (p) this.light.position.copy(p).y += 1.2;
      const flicker = 0.75 + 0.25 * Math.sin(t / 45) * Math.sin(t / 73);
      this.light.intensity = (6 + 18 * fireAt(t, 1).tray) * fireAt(t, 1).die * flicker;
    }
    if (r.over || !omenPlaying(s)) return null;
    let striking = false;
    for (let i = 0; i < r.bolts; i++) striking = this.bolts[i].update(t, camera.position) || striking;
    if (r.kraken) this.kraken.update(t, camera, at);
    if (r.duality) this.taiji.update(t, camera);
    if (r.bolts) this.light.intensity = (striking ? 30 : 0) + 10 * (1 - span(t, 0, 900));
    if (t < r.ms) return null;
    this.bolts.forEach((b) => b.hide()); this.kraken.hide(); this.taiji.hide();
    if (!r.fire.length) this.light.intensity = 0;
    r.over = true;
    return o.throwId;
  }
  dispose() {
    this.root.traverse((o) => {
      if (o instanceof Mesh || o instanceof Sprite || o instanceof LineSegments || o instanceof Points) {
        if ('dispose' in o && typeof o.dispose === 'function') o.dispose();
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
    const pixels = gl.domElement.height / (2 * Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360));
    const done = show.frame(performance.now(), camera, (i) => { const b = bodies.current[i]; const p = b?.isValid() ? b.translation() : null; return p ? new Vector3(p.x, p.y, p.z) : null; }, pixels);
    if (done !== null) useDice.getState().setOmenDone(done);
  });
  return <primitive object={show.root} />;
}
