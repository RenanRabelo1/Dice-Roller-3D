import RAPIER from '@dimforge/rapier3d-compat';
import { bodiesFor, polyhedron, type DieKind } from '../dice/polyhedra';
import { readUp, toResults } from '../dice/read';
import { initSettle, stepSettle } from '../throw/settle';
import { applyLaunch, applySettle, bodyStates, type Launch } from './apply';
import { GRAVITY, isOutside, MATERIAL, SETTLE, STEP, trayColliders, type Quat, type Vec3 } from './world';

export type Pose = { p: Vec3; q: Quat };
export interface Recording { frames: Pose[][]; results: number[]; timedOut: boolean; escaped: boolean; recovered: boolean }

// Runs the whole throw offline with the real engine and the real inputs (hand poses, aim, force, spin),
// recording one pose per body per step. The screen then replays a genuine roll whose result is already
// known, so it can be published the moment the dice stop. Rapier must already be initialised.
export function presimulate(
  kind: DieKind, count: number, start: Pose[], launch: Launch,
  perturb?: (step: number, bodies: RAPIER.RigidBody[]) => void,
): Recording {
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
    const polys = bodiesFor(kind, count).map((b) => polyhedron(b.shape, b.labels));
    if (start.length !== polys.length) throw new Error(`presimulate needs ${polys.length} start poses, got ${start.length}`);
    const bodies = polys.map((poly, i) => {
      const [x, y, z, w] = start[i].q;
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(...start[i].p).setRotation({ x, y, z, w }).setCcdEnabled(true));
      const hull = RAPIER.ColliderDesc.convexHull(new Float32Array(poly.points.flat()));
      if (!hull) throw new Error(`convex hull failed for ${poly.shape}`);
      const m = MATERIAL.die;
      world.createCollider(hull.setFriction(m.friction).setRestitution(m.restitution).setDensity(m.density), body);
      return body;
    });
    const radii = polys.map((p) => p.radius);
    applyLaunch(bodies, launch);
    let settle = initSettle(launch.throwId, bodies.length);
    let escaped = false, recovered = false;
    const frames: Pose[][] = [];
    for (let step = 1; step <= SETTLE.timeoutSteps; step++) {
      world.step();
      perturb?.(step, bodies);
      const states = bodyStates(bodies);
      if (states.some((b, i) => isOutside(b.p, radii[i]))) escaped = true;
      const next = stepSettle(settle, { throwId: launch.throwId, phase: 'rolling', radii, bodies: states });
      settle = next.state;
      applySettle(bodies, next.action);
      if (next.action.type === 'recover') recovered = true;
      frames.push(bodyStates(bodies).map(({ p, q }) => ({ p, q })));
      if (next.action.type === 'reveal') {
        const raw = next.action.poses.map((pose, i) => readUp(polys[i], pose.q).value);
        return { frames, results: toResults(kind, raw), timedOut: next.action.timedOut, escaped, recovered };
      }
    }
    throw new Error('settle never revealed'); // unreachable: stepSettle reveals at SETTLE.timeoutSteps
  } finally {
    world.free();
  }
}
