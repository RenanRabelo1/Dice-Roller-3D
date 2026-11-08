import RAPIER, { RigidBodyType, type RigidBody } from '@dimforge/rapier3d-compat';
import { bodiesFor, polyhedron, type DieKind } from '../../src/dice/polyhedra';
import { toResults } from '../../src/dice/read';
import { applyLaunch, applySettle, bodyStates } from '../../src/physics/apply';
import { GRAVITY, handPositions, isOutside, MATERIAL, STEP, trayColliders, type Vec3 } from '../../src/physics/world';
import { initSettle, stepSettle } from '../../src/throw/settle';

const SAFETY_STEPS = 600;

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

export async function simulate(o: {
  kind: DieKind; count: number; force: number; target: Vec3; seed: number;
  perturb?: (step: number, bodies: RigidBody[]) => void;
}): Promise<{ results: number[]; steps: number; escaped: boolean; recovered: boolean; bodies: number; final: Vec3[]; fixed: boolean }> {
  await initRapier();
  const world = new RAPIER.World({ x: GRAVITY[0], y: GRAVITY[1], z: GRAVITY[2] });
  try {
    world.timestep = STEP;

    const tray = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    for (const box of trayColliders()) {
      const m = box.kind === 'floor' ? MATERIAL.velvet : MATERIAL.wall;
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(...box.half).setTranslation(...box.center).setFriction(m.friction).setRestitution(m.restitution),
        tray,
      );
    }

    const polys = bodiesFor(o.kind, o.count).map((b) => polyhedron(b.shape, b.labels));
    const hand = handPositions(polys.length, 0);
    const bodies = polys.map((poly, i) => {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...hand[i]).setCcdEnabled(true));
      const hull = RAPIER.ColliderDesc.convexHull(new Float32Array(poly.points.flat()));
      if (!hull) throw new Error(`convex hull failed for ${poly.shape}`);
      const m = MATERIAL.die;
      world.createCollider(hull.setFriction(m.friction).setRestitution(m.restitution).setDensity(m.density), body);
      return body;
    });

    const handCenter = [0, 1, 2].map((k) => hand.reduce((s, p) => s + p[k], 0) / hand.length) as Vec3;
    applyLaunch(bodies, { throwId: 1, seed: o.seed, target: o.target, force: o.force, handCenter, handOmega: [0, 0, 0] });

    let settle = initSettle(1, bodies.length);
    let escaped = false;
    let recovered = false;
    for (let step = 1; step <= SAFETY_STEPS; step++) {
      world.step();
      o.perturb?.(step, bodies);
      const states = bodyStates(bodies);
      if (states.some((b, i) => isOutside(b.p, polys[i].radius))) escaped = true;
      const next = stepSettle(settle, { throwId: 1, phase: 'rolling', polys, bodies: states });
      settle = next.state;
      applySettle(bodies, next.action);
      if (next.action.type === 'recover') recovered = true;
      if (next.action.type === 'publish') {
        return {
          results: toResults(o.kind, next.action.raw),
          steps: step,
          escaped,
          recovered,
          bodies: bodies.length,
          final: bodyStates(bodies).map((b) => b.p),
          fixed: bodies.every((b) => b.bodyType() === RigidBodyType.Fixed),
        };
      }
    }
    throw new Error(`no publish within ${SAFETY_STEPS} steps (${o.kind} × ${o.count}, seed ${o.seed})`);
  } finally {
    world.free();
  }
}
