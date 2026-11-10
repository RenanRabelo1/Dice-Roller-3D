import { Path, Shape, ShapeGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SymbolName } from './polyhedra';

// The Vampire dice faces, as our own plain drawings (not the game's official art).
// Each is flat on the XY plane, facing +z, 1 unit tall and centred on the origin.
export const SYMBOLS: SymbolName[] = ['ankh', 'crit', 'skull', 'fangs'];
const SEGMENTS = 16;

function ankh(): Shape {
  const a = Math.asin(0.19 / 0.21); // where the loop meets the top of the crossbar
  const s = new Shape();
  s.moveTo(-0.075, -0.5); s.lineTo(0.075, -0.5); s.lineTo(0.075, -0.04); s.lineTo(0.3, -0.04); s.lineTo(0.3, 0.1);
  s.absellipse(0, 0.29, 0.18, 0.21, -a, Math.PI + a, false);
  s.lineTo(-0.3, 0.1); s.lineTo(-0.3, -0.04); s.lineTo(-0.075, -0.04);
  s.holes.push(new Path().absellipse(0, 0.3, 0.095, 0.125, 0, 2 * Math.PI, true));
  return s;
}

// Critical: the ankh inside a ring.
function ring(): Shape {
  const s = new Shape().absarc(0, 0, 0.5, 0, 2 * Math.PI, false);
  s.holes.push(new Path().absarc(0, 0, 0.41, 0, 2 * Math.PI, true));
  return s;
}

function skull(): Shape {
  const jaw = 0.24, a = Math.acos(jaw / 0.4); // where the jaw meets the cranium
  const s = new Shape();
  s.moveTo(-jaw, -0.5);
  for (const x of [-0.12, 0.06]) { s.lineTo(x, -0.5); s.lineTo(x, -0.38); s.lineTo(x + 0.06, -0.38); s.lineTo(x + 0.06, -0.5); } // gaps between three teeth
  s.lineTo(jaw, -0.5);
  s.absarc(0, 0.1, 0.4, -a, Math.PI + a, false);
  for (const x of [-0.17, 0.17]) s.holes.push(new Path().absarc(x, 0.1, 0.105, 0, 2 * Math.PI, true));
  s.holes.push(new Path().moveTo(0, -0.04).lineTo(0.055, -0.16).lineTo(-0.055, -0.16));
  return s;
}

// Messy critical: two fangs hanging from the gum, small teeth between them, and a drop of blood.
function fangs(): Shape[] {
  const teeth = new Shape();
  teeth.moveTo(-0.38, 0.5); teeth.lineTo(-0.38, 0.36); teeth.lineTo(-0.31, 0.36);
  teeth.quadraticCurveTo(-0.3, 0, -0.2, -0.22); teeth.quadraticCurveTo(-0.1, 0, -0.1, 0.36);
  for (const x of [-0.07, 0.01]) { teeth.lineTo(x, 0.36); teeth.lineTo(x, 0.2); teeth.lineTo(x + 0.06, 0.2); teeth.lineTo(x + 0.06, 0.36); }
  teeth.lineTo(0.1, 0.36);
  teeth.quadraticCurveTo(0.1, 0, 0.2, -0.22); teeth.quadraticCurveTo(0.3, 0, 0.31, 0.36);
  teeth.lineTo(0.38, 0.36); teeth.lineTo(0.38, 0.5);
  const drop = new Shape();
  drop.moveTo(0, -0.16); drop.quadraticCurveTo(0.1, -0.3, 0.1, -0.4);
  drop.absarc(0, -0.4, 0.1, 0, Math.PI, true);
  drop.quadraticCurveTo(-0.1, -0.3, 0, -0.16);
  return [teeth, drop];
}

const BUILD: Record<SymbolName, () => BufferGeometry> = {
  ankh: () => new ShapeGeometry(ankh(), SEGMENTS),
  crit: () => mergeGeometries([new ShapeGeometry(ring(), 2 * SEGMENTS), new ShapeGeometry(ankh(), SEGMENTS).scale(0.66, 0.66, 1)]),
  skull: () => new ShapeGeometry(skull(), SEGMENTS),
  fangs: () => new ShapeGeometry(fangs(), SEGMENTS),
};

const cache = new Map<SymbolName, BufferGeometry>();
export function symbolGeometry(name: SymbolName): BufferGeometry {
  let g = cache.get(name);
  if (!g) { g = BUILD[name](); cache.set(name, g); }
  return g;
}
