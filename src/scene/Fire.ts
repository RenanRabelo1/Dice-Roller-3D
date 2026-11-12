import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Group, Mesh, PlaneGeometry, Points, ShaderMaterial, Vector3,
} from 'three';
import { MAX_DICE } from '../dice/polyhedra';
import { TRAY } from '../physics/world';
import { fireAt, fireReach } from './fireMotion';

const ON_FELT = 2600, PER_DIE = 90;

// Flames as GPU particles in one draw: each rises from its spot and burns out, white-yellow to deep red,
// over and over. Felt flames light up as the fire front passes them; die flames ride their die.
const vertexShader = /* glsl */ `
  attribute vec3 origin; attribute float seed; attribute float die;
  uniform float time, radius, tray, grow, scale;
  uniform vec3 dice[${MAX_DICE}]; uniform float lit[${MAX_DICE}];
  uniform vec3 ignite[${MAX_DICE}]; uniform int ignited;
  varying float life; varying float alpha;
  void main() {
    life = fract(time * (1.1 + fract(seed * 7.31) * 0.9) + seed);
    vec3 base = origin; float on, height, size;
    if (die >= 0.0) {
      int i = int(die + 0.5);
      base += dice[i]; on = lit[i] * grow; height = 1.5; size = 0.8;
    } else {
      float d = 1e3;
      for (int k = 0; k < ${MAX_DICE}; k++) { if (k >= ignited) break; d = min(d, distance(origin.xz, ignite[k].xz)); }
      on = smoothstep(radius, radius - 0.8, d) * tray; height = 0.5 + fract(seed * 3.7) * 1.1; size = 0.42 + 0.5 * fract(seed * 5.3);
    }
    vec3 p = base + vec3(sin(time * 5.0 + seed * 40.0) * 0.14 * life, life * height, cos(time * 4.0 + seed * 30.0) * 0.14 * life);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * (1.0 - 0.7 * life) * on * scale / -mv.z;
    alpha = on;
  }`;
const fragmentShader = /* glsl */ `
  varying float life; varying float alpha;
  void main() {
    // A tongue of flame: round at the bottom, drawn to a point at the top (gl_PointCoord.y grows downward).
    vec2 c = gl_PointCoord;
    float dx = abs(c.x - 0.5) / max(0.5 * pow(c.y, 0.7), 1e-3);
    if (dx > 1.0 || alpha <= 0.0) discard;
    float body = pow(1.0 - dx, 1.6) * smoothstep(0.0, 0.5, c.y) * smoothstep(1.0, 0.8, c.y); // soft, so neighbours merge
    vec3 color = life < 0.3 ? mix(vec3(1.0, 0.9, 0.55), vec3(1.0, 0.42, 0.06), life / 0.3)
                            : mix(vec3(1.0, 0.42, 0.06), vec3(0.45, 0.04, 0.01), (life - 0.3) / 0.7);
    gl_FragColor = vec4(color * body * (1.0 - life) * alpha * 1.1, 1.0);
  }`;

// The felt under the fire: charred where it has passed, a glowing ember line at its front.
const scorchVertex = /* glsl */ `
  varying vec3 world;
  void main() { world = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0); }`;
const scorchFragment = /* glsl */ `
  uniform vec3 ignite[${MAX_DICE}]; uniform int ignited; uniform float radius, tray, time;
  varying vec3 world;
  void main() {
    float d = 1e3;
    for (int k = 0; k < ${MAX_DICE}; k++) { if (k >= ignited) break; d = min(d, distance(world.xz, ignite[k].xz)); }
    float burnt = smoothstep(radius, radius - 1.5, d);
    float front = exp(-abs(d - radius) * 3.0) * step(0.01, radius);
    float flicker = 0.75 + 0.25 * sin(time * 20.0 + world.x * 3.0 + world.z * 2.0);
    vec3 color = mix(vec3(0.05, 0.02, 0.01), vec3(1.0, 0.35, 0.05) * 1.6 * flicker, front);
    gl_FragColor = vec4(color, max(burnt * 0.78, front * 0.9) * tray);
  }`;

// d20 = 1: fire on each fumbled d20 and over the whole felt (see fireMotion).
export class Fire {
  readonly root = new Group();
  private uniforms = {
    time: { value: 0 }, radius: { value: 0 }, tray: { value: 0 }, grow: { value: 0 }, scale: { value: 1000 },
    dice: { value: Array.from({ length: MAX_DICE }, () => new Vector3()) }, lit: { value: new Array<number>(MAX_DICE).fill(0) },
    ignite: { value: Array.from({ length: MAX_DICE }, () => new Vector3()) }, ignited: { value: 0 },
  };
  private dice: number[] = [];
  private reach = 0;

  constructor() {
    this.root.name = 'fire';
    const n = ON_FELT + PER_DIE * MAX_DICE, origin = new Float32Array(n * 3), seed = new Float32Array(n), die = new Float32Array(n);
    let k = 0;
    const rnd = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
    for (let i = 0; i < ON_FELT; i++, k++) {
      origin.set([(rnd() * 2 - 1) * (TRAY.halfWidth - 0.1), 0.02, (rnd() * 2 - 1) * (TRAY.halfDepth - 0.1)], k * 3);
      seed[k] = rnd(); die[k] = -1;
    }
    for (let d = 0; d < MAX_DICE; d++) for (let i = 0; i < PER_DIE; i++, k++) {
      const a = rnd() * 2 * Math.PI, r = 0.75 * Math.sqrt(rnd());
      origin.set([Math.cos(a) * r, (rnd() - 0.6) * 0.9, Math.sin(a) * r], k * 3);
      seed[k] = rnd(); die[k] = d;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3)); // unused: the shader places every flame
    g.setAttribute('origin', new BufferAttribute(origin, 3));
    g.setAttribute('seed', new BufferAttribute(seed, 1));
    g.setAttribute('die', new BufferAttribute(die, 1));
    const flames = new Points(g, new ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
    flames.frustumCulled = false; flames.renderOrder = 12;
    const scorch = new Mesh(new PlaneGeometry(TRAY.halfWidth * 2, TRAY.halfDepth * 2).rotateX(-Math.PI / 2),
      new ShaderMaterial({ uniforms: this.uniforms, vertexShader: scorchVertex, fragmentShader: scorchFragment, transparent: true, depthWrite: false, toneMapped: false }));
    scorch.position.y = 0.006; scorch.renderOrder = 1;
    this.root.add(scorch, flames);
    this.hide();
  }

  // `dice`: the burning dice; `positions`: where they lie, where the fire starts.
  start(dice: number[], positions: Vector3[]) {
    this.dice = dice;
    positions.forEach((p, i) => this.uniforms.ignite.value[i].copy(p));
    this.uniforms.ignited.value = positions.length;
    this.reach = fireReach(positions.map((p) => ({ x: p.x, z: p.z })));
    this.uniforms.lit.value.fill(0);
    dice.forEach((d) => { this.uniforms.lit.value[d] = 1; });
  }

  // `pixels`: the drawing buffer's height over 2·tan(fov/2), so a flame's size is in world units.
  update(t: number, at: (i: number) => Vector3 | null, pixels: number) {
    const f = fireAt(t, this.reach);
    this.root.visible = true;
    this.uniforms.time.value = t / 1000; this.uniforms.radius.value = f.radius; this.uniforms.tray.value = f.tray;
    this.uniforms.grow.value = f.die; this.uniforms.scale.value = pixels;
    for (const d of this.dice) { const p = at(d); if (p) this.uniforms.dice.value[d].copy(p); }
    this.root.children[0].visible = f.tray > 0; // the scorch goes with the tray fire
  }

  hide() { this.root.visible = false; }
}
