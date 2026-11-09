import { RigidBodyType } from '@dimforge/rapier3d-compat';
import type { RigidBody } from '@dimforge/rapier3d-compat';
import { launchVelocity, spin } from '../throw/aim';
import type { BodyState, SettleAction } from '../throw/settle';
import type { Quat, Vec3 } from './world';

// The single place that changes Rapier body types, velocities and poses (scene and Node tests alike).

export interface Launch { throwId: number; seed: number; target: Vec3; force: number; handCenter: Vec3; handOmega: Vec3; results: number[] }

const v = ([x, y, z]: Vec3) => ({ x, y, z });
const ZERO = { x: 0, y: 0, z: 0 };

function still(b: RigidBody) {
  b.setLinvel(ZERO, true);
  b.setAngvel(ZERO, true);
}

function pose(b: RigidBody, p: Vec3, q: Quat) {
  b.setTranslation(v(p), true);
  b.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
}

export function bodyStates(bodies: RigidBody[]): BodyState[] {
  return bodies.map((b) => {
    const t = b.translation();
    const r = b.rotation();
    const l = b.linvel(), w = b.angvel();
    return { p: [t.x, t.y, t.z], q: [r.x, r.y, r.z, r.w], speed: Math.hypot(l.x, l.y, l.z), spin: Math.hypot(w.x, w.y, w.z) };
  });
}

export function applyLaunch(bodies: RigidBody[], launch: Launch): void {
  const vel = v(launchVelocity(launch.handCenter, launch.target, launch.force));
  const w = launch.handOmega;
  bodies.forEach((b, i) => {
    const s = spin(launch.seed, i);
    b.setBodyType(RigidBodyType.Dynamic, true); // keeps the current pose
    b.setLinvel(vel, true);
    b.setAngvel({ x: w[0] + s[0], y: w[1] + s[1], z: w[2] + s[2] }, true);
  });
}

export function toKinematic(bodies: RigidBody[]): void {
  bodies.forEach((b) => {
    still(b);
    b.setBodyType(RigidBodyType.KinematicPositionBased, true);
  });
}

export function applySettle(bodies: RigidBody[], action: SettleAction): void {
  switch (action.type) {
    case 'wait':
      return;
    case 'recover':
      for (const { index, p } of action.moves) {
        const b = bodies[index];
        b.setTranslation(v(p), true);
        still(b);
        b.wakeUp();
      }
      return;
    case 'reveal':
      bodies.forEach((b, i) => {
        still(b);
        pose(b, action.poses[i].p, action.poses[i].q);
        b.setBodyType(RigidBodyType.Fixed, false);
      });
  }
}
