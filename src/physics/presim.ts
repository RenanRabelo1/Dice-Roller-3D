import RAPIER from '@dimforge/rapier3d-compat';
import type { CustomKind } from '../dice/custom';
import { polyhedron, type DieKind, type Polyhedron } from '../dice/polyhedra';
import { readUp, toResults } from '../dice/read';
import { initSettle, stepSettle } from '../throw/settle';
import { applyLaunch, applySettle, bodyStates, type Launch } from './apply';
import { DAMPING, GRAVITY, isOutside, MATERIAL, SETTLE, STEP, trayColliders, type Quat, type Vec3 } from './world';

export type Pose = { p: Vec3; q: Quat };
export interface Recording { frames: Pose[][]; raw: number[]; results: number[]; timedOut: boolean; escaped: boolean; recovered: boolean }
// `customs`: the imported dice of the selection, because the worker has no registry of its own.
export interface RollRequest { dice: DieKind[]; start: Pose[]; launch: Launch; customs: Record<CustomKind, Polyhedron> }
export type RollResponse = { throwId: number } & ({ rec: Recording } | { error: string });

// Runs the whole throw offline with the real engine and the real inputs (hand poses, aim, force, spin),
// recording one pose per body per step. The screen then replays a genuine roll whose result is already
// known, so it can be published the moment the dice stop. Rapier must already be initialised.
export function presimulate(
  dice: DieKind[], start: Pose[], launch: Launch,
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
    const polys = dice.map((d) => polyhedron(d));
    if (start.length !== polys.length) throw new Error(`presimulate needs ${polys.length} start poses, got ${start.length}`);
    const bodies = polys.map((poly, i) => {
      const [x, y, z, w] = start[i].q;
      const damp = poly.shape === 'livre' ? (poly.faces.length > 20 ? DAMPING.d100 : undefined) : DAMPING[poly.shape]; // many faces roll too long
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(...start[i].p).setRotation({ x, y, z, w }).setCcdEnabled(true)
        .setLinearDamping(damp?.linear ?? 0).setAngularDamping(damp?.angular ?? 0));
      // A thin hull rocks forever on its flat cap; the coin rolls as a rounded cylinder of the same size.
      const hull = poly.shape === 'coin' ? RAPIER.ColliderDesc.roundCylinder(0.08 - 0.01, poly.radius - 0.01, 0.01)
        : RAPIER.ColliderDesc.convexHull(new Float32Array(poly.points.flat()));
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
      // Coins resting on coins rock on their rims forever. A slow coin that lies (not stands on its rim)
      // stops turning, so friction holds it where it rests; it turns again if something knocks it.
      states.forEach((b, i) => {
        if (polys[i].shape !== 'coin') return;
        const [x, , z] = b.q, lying = Math.abs(1 - 2 * (x * x + z * z)) > 0.4; // |cap normal · up|
        const rest = b.speed < 1 && b.spin < 3 && lying;
        if (rest) bodies[i].setAngvel({ x: 0, y: 0, z: 0 }, false);
        bodies[i].lockRotations(rest, false);
      });
      const next = stepSettle(settle, { throwId: launch.throwId, phase: 'rolling', radii, bodies: states });
      settle = next.state;
      applySettle(bodies, next.action);
      if (next.action.type === 'recover') recovered = true;
      frames.push(bodyStates(bodies).map(({ p, q }) => ({ p, q })));
      if (next.action.type === 'reveal') {
        const raw = next.action.poses.map((pose, i) => readUp(polys[i], pose.q).value);
        return { frames, raw, results: toResults(dice, raw), timedOut: next.action.timedOut, escaped, recovered };
      }
    }
    throw new Error('settle never revealed'); // unreachable: stepSettle reveals at SETTLE.timeoutSteps
  } finally {
    world.free();
  }
}
