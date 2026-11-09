import RAPIER, { type RigidBody } from '@dimforge/rapier3d-compat';
import type { DieKind } from '../../src/dice/polyhedra';
import { presimulate } from '../../src/physics/presim';
import { handPositions, type Vec3 } from '../../src/physics/world';

// rapier3d-compat 0.19.2's init() always hands wasm-bindgen a bare byte array, which logs a deprecation
// warning no argument of ours can avoid; mute exactly that line while the module loads.
let ready: Promise<void> | undefined;
export function initRapier(): Promise<void> {
  ready ??= (async () => {
    const warn = console.warn;
    console.warn = (...args: unknown[]) => {
      if (!String(args[0]).includes('deprecated parameters for the initialization function')) warn(...args);
    };
    try { await RAPIER.init(); } finally { console.warn = warn; }
  })();
  return ready;
}

// The app's own offline roll, from the resting hand poses.
export async function simulate(o: {
  kind: DieKind; count: number; dice?: DieKind[]; force: number; target: Vec3; seed: number;
  perturb?: (step: number, bodies: RigidBody[]) => void;
}) {
  await initRapier();
  const dice = o.dice ?? Array<DieKind>(o.count).fill(o.kind);
  const hand = handPositions(dice.length, 0);
  const handCenter = [0, 1, 2].map((k) => hand.reduce((s, p) => s + p[k], 0) / hand.length) as Vec3;
  const start = hand.map((p) => ({ p, q: [0, 0, 0, 1] as [number, number, number, number] }));
  const rec = presimulate(dice, start, { throwId: 1, seed: o.seed, target: o.target, force: o.force, handCenter, handOmega: [0, 0, 0] }, o.perturb);
  return { ...rec, steps: rec.frames.length, bodies: hand.length, final: rec.frames.at(-1)!.map((f) => f.p) };
}
