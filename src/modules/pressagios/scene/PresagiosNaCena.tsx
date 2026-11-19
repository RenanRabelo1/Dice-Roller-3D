import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, Group, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, Path, PointLight,
  Points, Shape, Sprite, SpriteMaterial, Vector3, type Camera, type Material, type Object3D, type PerspectiveCamera, type Scene, type WebGLRenderer,
} from 'three';
import { MAX_DICE, type PresagioVampiro } from '../../regras/index.ts';
import { presagio, presagioTocando, setOmenDone } from '../store.ts';
import { DUALITY_HIT } from '../domain/omen.ts';
import { fireAt } from '../domain/fireMotion.ts';
import { COR_KRAKEN, COR_TEMPESTADE, COR_VAMPIRO, corDaDualidade, fonteDaLuz, luzDaDualidade, luzDaTempestade, luzDoKraken, luzDoPar, luzDoVampiro, POS_DUALIDADE, POS_KRAKEN, POS_LUZ_DO_PAR, POS_TEMPESTADE, POS_VAMPIRO, type FonteDaLuz } from '../domain/luz.ts';
import { PAR } from '../domain/vampiroMotion.ts';
import { planoDoPresagio } from '../domain/plano.ts';
import { arremesso, registroDeCorpos } from '../../arremesso/index.ts';
import { clamp01, span, type Vec3 } from '../../../shared/math.ts';
import { Kraken } from './Kraken.ts';
import { coresDaMesa } from '../../mesa/index.ts';
import { Fire } from './Fire.ts';
import { Vampiro } from './Vampiro.ts';
import { VampiroGlb } from './VampiroGlb.ts';
import { parseGlb } from '../../../shared/modelos3d/index.ts';
import { Morcegos } from './Morcegos.ts';
import { Sangue } from './Sangue.ts';

// The 3D side of an omen, played after the dice settle and before the result shows: lightning on a d20 20,
// the kraken grabbing a d100 1, fire on a d20 1, the kraken's storm on a d100 100, the yin-yang fish for
// duality (the rain, heat and shakes are screen overlays, see OverlayDoPresagio). Which effect plays on which die is
// `planoDoPresagio`. Effect materials are compiled at mount and hidden (0 draw calls) outside an omen. When the show
// ends it marks the omen done, and the result goes on.

const ARQUIVO_DO_VAMPIRO = `${import.meta.env.BASE_URL}modelos/vampiro.glb`;
const easeOutCubica = (t: number) => 1 - (1 - clamp01(t)) ** 3;
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
    const k = t < 60 ? easeOutCubica(t / 60) : 1 - span(t, 60, 900);
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
    const spin = t < DUALITY_HIT ? 4 * Math.PI * p * p : 4 * Math.PI + 2 * Math.PI * easeOutCubica(after / 900);
    const r = t < DUALITY_HIT ? 6.5 * (1 - p * p) : 0;
    this.fish.forEach((f, k) => {
      const a = spin + f.userData.turn + Math.PI; // the light fish starts on the left
      f.position.set(r * Math.cos(a), r * Math.sin(a), Math.sin(2 * Math.PI * p + k * Math.PI) * 1.2 * (1 - p));
      f.rotation.set(0, (1 - p) ** 2 * 3 * (k ? 1 : -1), spin + f.userData.turn); // tumbling in 3D until they lock
    });
    const out = easeIn(span(t, 2000, 2600));
    const pulse = after > 0 ? 1 + 0.25 * (1 - easeOutCubica(after / 400)) : 1;
    this.disc.scale.setScalar(pulse * (1 - out) + 0.001);
    this.group.position.y += 1.5 * out;
    this.aura.scale.setScalar(5.5 * (1 - out) + 0.01);
    (this.aura.material as SpriteMaterial).opacity = (after > 0 ? 0.6 : 0.35 * p) * (1 - out);
    const b = after > 0 ? span(after, 0, 400) : 0;
    this.burst.visible = after > 0 && b < 1;
    this.burst.scale.setScalar(9 * easeOutCubica(after / 250) + 0.01);
    (this.burst.material as SpriteMaterial).opacity = 1 - b;
  }
  hide() { this.group.visible = false; }
}

// `frame` plays the current omen and reports when it is over. Fire outlives it: a die that rolled a 1 on a
// d20 keeps burning at the front until it is picked up.
// oxlint-disable-next-line react/only-export-components -- Scene tests exercise the shared compile and frame lifecycle.
export class Show {
  readonly root = new Group();
  private map = glowTexture();
  private bolts = Array.from({ length: MAX_DICE }, () => new Bolt(this.map));
  private kraken = new Kraken();
  private fire = new Fire();
  private taiji = new TaiJi(this.map);
  private vampiro = new Vampiro();
  private vampiroGlb = new VampiroGlb();
  private morcegos = new Morcegos();
  private sangue = new Sangue();
  private light = new PointLight('#CFE6FF', 0, 10, 2); // shared by all omens, see domain/luz.ts
  private run: { throwId: number; at: number; ms: number; bolts: number; kraken: 'grab' | 'storm' | null; fire: number[]; duality: boolean; vampiro: PresagioVampiro | null; origins: Vec3[]; luz: FonteDaLuz | null; over: boolean } | null = null;
  constructor() {
    for (const b of this.bolts) this.root.add(b.glow, b.core, b.flash);
    // Keep the light count constant: hiding an effect must not recompile every die's shader.
    this.root.add(this.kraken.root, this.fire.root, this.taiji.group, this.vampiro.root, this.vampiroGlb.root, this.morcegos.root, this.sangue.root, this.light);
  }
  // Compile every effect's shader up front, so the first omen does not stall a frame.
  compile(gl: WebGLRenderer, scene: Scene, camera: Camera, draw = false) {
    this.vampiro.prepare(camera);
    this.morcegos.prepare(camera);
    this.sangue.update(PAR.sai);
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
  // The GLB arrives after mount: attach it and warm its shaders like the other effects.
  anexarGlb(objeto: Object3D, gl: WebGLRenderer, scene: Scene, camera: Camera) {
    this.vampiroGlb.anexar(objeto);
    this.compile(gl, scene, camera, true);
  }
  private hideVampiro() { this.vampiro.hide(); this.vampiroGlb.hide(); this.morcegos.hide(); this.sangue.hide(); }

  hide() { this.bolts.forEach((b) => b.hide()); this.kraken.hide(); this.fire.hide(); this.taiji.hide(); this.hideVampiro(); this.light.intensity = 0; this.run = null; }
  frame(now: number, camera: Camera, at: (i: number) => Vector3 | null, pixels: number): number | null {
    const s = { ...arremesso(), ...presagio() }, current = s.omen ?? s.vampiro;
    // This throw's omen, while its dice lie settled (after the show only the fire is left).
    if (!current || current.throwId !== s.throwId || s.gesture.phase !== 'settled') { if (this.run) this.hide(); return null; }
    if (this.run?.throwId !== current.throwId) {
      this.hide();
      const plano = planoDoPresagio(s.omen, s.dice, s.vampiro), positions = (indices: number[]) => indices.map(at).filter((p): p is Vector3 => !!p);
      const { raios: lit, kraken: grab, tempestade: storm, fogo: fire, vampiro } = plano;
      positions(lit).forEach((p, i) => this.bolts[i].start(p));
      if (grab.length) this.kraken.start('grab', positions(grab), grab[0], coresDaMesa());
      else if (storm.length) this.kraken.start('storm', [], storm[0]);
      if (fire.length) this.fire.start(fire, positions(fire));
      const first = positions(lit)[0] ?? positions(fire)[0];
      if (first) this.light.position.copy(first).y += 1.2;
      const luz = fonteDaLuz(plano);
      this.light.color.set(luz === 'fogo' ? '#FF7A2A' : luz === 'tempestade' ? COR_TEMPESTADE : luz === 'kraken' ? COR_KRAKEN : luz === 'vampiro' ? COR_VAMPIRO : '#CFE6FF');
      if (luz === 'tempestade') this.light.position.set(...POS_TEMPESTADE);
      else if (luz === 'kraken') this.light.position.set(...POS_KRAKEN);
      else if (luz === 'dualidade') this.light.position.set(...POS_DUALIDADE);
      else if (luz === 'vampiro') this.light.position.set(...(vampiro?.tipo === 'par-de-criticos' ? POS_LUZ_DO_PAR : POS_VAMPIRO));
      const origins = vampiro?.dados.map((i) => at(i)?.toArray() ?? [0, 0.8, 0] as Vec3) ?? [];
      this.run = { throwId: current.throwId, at: s.omenAt, ms: plano.ms, bolts: lit.length, kraken: grab.length ? 'grab' : storm.length ? 'storm' : null,
        fire, duality: plano.kind === 'duality', vampiro, origins, luz, over: false };
    }
    const r = this.run, t = now - r.at;
    if (r.fire.length) { // burns on after the show, on the dice now at the front
      this.fire.update(t, at, pixels);
      const p = at(r.fire[0]);
      if (p) this.light.position.copy(p).y += 1.2;
      const flicker = 0.75 + 0.25 * Math.sin(t / 45) * Math.sin(t / 73);
      this.light.intensity = (6 + 18 * fireAt(t, 1).tray) * fireAt(t, 1).die * flicker;
    }
    if (r.over) return null;
    if (!presagioTocando()) {
      if (r.vampiro) { this.hideVampiro(); this.light.intensity = 0; }
      return null;
    }
    let striking = false;
    for (let i = 0; i < r.bolts; i++) striking = this.bolts[i].update(t, camera.position) || striking;
    if (r.kraken) this.kraken.update(t, camera, at);
    if (r.duality) this.taiji.update(t, camera);
    if (r.vampiro) {
      const vampiro = r.vampiro;
      const otherDice: Vec3[] = [];
      if (vampiro.tipo === 'critico-bestial') {
        s.dice.forEach((_, i) => {
          if (vampiro.dados.includes(i)) return;
          const pos = at(i);
          if (pos) otherDice.push(pos.toArray());
        });
      }
      if (vampiro.tipo === 'par-de-criticos' && this.vampiroGlb.pronto) {
        const dados: Vec3[] = [];
        s.dice.forEach((_, i) => { const pos = at(i); if (pos) dados.push(pos.toArray()); });
        this.vampiro.hide();
        this.vampiroGlb.update(t, { dado: this.vampiroGlb.maisPertoDoOmbro(r.origins), dados }); // the lunge aims at the real die
      }
      else this.vampiro.update(vampiro.tipo, t, camera, r.origins, at(vampiro.dados[0])?.toArray(), otherDice);
      if (vampiro.tipo === 'par-de-criticos') {
        this.morcegos.update(t, camera);
        this.sangue.update(t);
      }
    }
    if (r.bolts) this.light.intensity = (striking ? 30 : 0) + 10 * (1 - span(t, 0, 900));
    else if (r.luz === 'tempestade') this.light.intensity = luzDaTempestade(t);
    else if (r.luz === 'kraken') this.light.intensity = luzDoKraken(t, r.ms);
    else if (r.luz === 'dualidade') { this.light.intensity = luzDaDualidade(t, r.ms); this.light.color.set(corDaDualidade(t)); }
    else if (r.luz === 'vampiro') this.light.intensity = r.vampiro?.tipo === 'par-de-criticos' ? luzDoPar(t) : luzDoVampiro(t, r.ms);
    if (t < r.ms) return null;
    this.bolts.forEach((b) => b.hide()); this.kraken.hide(); this.taiji.hide(); this.hideVampiro();
    if (!r.fire.length) this.light.intensity = 0;
    r.over = true;
    return current.throwId;
  }
  dispose() {
    this.vampiro.dispose();
    this.vampiroGlb.dispose();
    const disposeObject = (o: Group['children'][number]) => {
      if (o instanceof Mesh || o instanceof Sprite || o instanceof LineSegments || o instanceof Points) {
        if ('dispose' in o && typeof o.dispose === 'function') o.dispose();
        o.geometry.dispose();
        for (const m of ([] as Material[]).concat(o.material)) m.dispose();
      }
    };
    for (const child of this.root.children) if (child !== this.vampiro.root && child !== this.vampiroGlb.root) child.traverse(disposeObject);
    this.map.dispose();
  }
}

export function PresagiosNaCena() {
  const { camera, gl, scene } = useThree();
  const show = useMemo(() => new Show(), []);
  const warmed = useRef(false);
  useEffect(() => { show.compile(gl, scene, camera); return () => show.dispose(); }, [camera, gl, scene, show]);
  useEffect(() => {
    let vivo = true;
    fetch(ARQUIVO_DO_VAMPIRO).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then((bytes) => parseGlb(bytes, () => 2048))
      .then((objeto) => { if (vivo) show.anexarGlb(objeto, gl, scene, camera); })
      .catch((e) => console.warn('Vampiro em GLB indisponível, usando a figura procedural.', e));
    return () => { vivo = false; };
  }, [camera, gl, scene, show]);
  useFrame(() => {
    // Environment builds its reflection texture after mount; warm the final shader variants as well.
    if (!warmed.current && scene.environment && gl.info.render.frame > 5 && !presagio().omen && !presagio().vampiro) {
      show.compile(gl, scene, camera, true); warmed.current = true;
    }
    const pixels = gl.domElement.height / (2 * Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360));
    const done = show.frame(performance.now(), camera, (i) => { const b = registroDeCorpos.current[i]; const p = b?.isValid() ? b.translation() : null; return p ? new Vector3(p.x, p.y, p.z) : null; }, pixels);
    if (done !== null) setOmenDone(done);
  });
  return <primitive object={show.root} />;
}
