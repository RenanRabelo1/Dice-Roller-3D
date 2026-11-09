import { afterEach, beforeAll, describe, it, expect } from 'vitest';
import RAPIER, { RigidBodyType } from '@dimforge/rapier3d-compat';
import { KINDS } from '../src/dice/polyhedra';
import { clampTarget, launchVelocity, spin } from '../src/throw/aim';
import { applyLaunch, applySettle, bodyStates, toKinematic } from '../src/physics/apply';
import { isOutside, MAX_RADIUS, SETTLE, type Quat, type Vec3 } from '../src/physics/world';
import { initRapier, simulate } from './helpers/sim';

const T = 180_000;

describe('Rapier body adapters', () => {
  let world: RAPIER.World;
  beforeAll(initRapier);
  afterEach(() => world?.free());

  const setup = () => {
    world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    return [0.5, 0.75].map((radius, i) => {
      const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(i * 3, 2, 0));
      world.createCollider(RAPIER.ColliderDesc.ball(radius).setDensity(i + 1), b);
      return b;
    });
  };
  const expectVector = (actual: { x: number; y: number; z: number }, expected: Vec3) => {
    [actual.x, actual.y, actual.z].forEach((n, i) => expect(n).toBeCloseTo(expected[i], 5));
  };
  const place = (bodies: RAPIER.RigidBody[]) => bodies.forEach((b, i) => {
    const [x, y, z] = poses[i].p, [qx, qy, qz, qw] = poses[i].q;
    b.setTranslation({ x, y, z }, true); b.setRotation({ x: qx, y: qy, z: qz, w: qw }, true);
  });
  const poses: { p: Vec3; q: Quat }[] = [
    { p: [-1, 3, 2], q: [0, 0.6, 0, 0.8] },
    { p: [2, 4, -1], q: [0.6, 0, 0, 0.8] },
  ];

  it('bodyStates reports pose, speed and spin', () => {
    const bodies = setup();
    place(bodies);
    bodies[0].setLinvel({ x: 3, y: 0, z: 4 }, true); bodies[0].setAngvel({ x: 0, y: 2, z: 0 }, true);
    const [a, b] = bodyStates(bodies);
    expectVector({ x: a.p[0], y: a.p[1], z: a.p[2] }, poses[0].p);
    expect(a.speed).toBeCloseTo(5, 5); expect(a.spin).toBeCloseTo(2, 5);
    expect(b.speed).toBe(0); expect(b.spin).toBe(0);
  });

  it('clears motion for the hand, then launches with the current pose and per-die spin', () => {
    const bodies = setup();
    place(bodies);
    bodies.forEach((b) => { b.setLinvel({ x: 1, y: 2, z: 3 }, true); b.setAngvel({ x: 3, y: 2, z: 1 }, true); });
    const before = bodyStates(bodies).map(({ p, q }) => ({ p, q }));
    toKinematic(bodies);
    bodies.forEach((b) => {
      expect(b.bodyType()).toBe(RigidBodyType.KinematicPositionBased);
      expectVector(b.linvel(), [0, 0, 0]);
      expectVector(b.angvel(), [0, 0, 0]);
    });
    const launch = { throwId: 2, seed: 17, target: [2, 0, -3] as Vec3, force: 0.7, handCenter: [1, 3, 2] as Vec3, handOmega: [2, -3, 4] as Vec3 };
    applyLaunch(bodies, launch);
    expect(bodyStates(bodies).map(({ p, q }) => ({ p, q }))).toEqual(before);
    bodies.forEach((b, i) => {
      expect(b.bodyType()).toBe(RigidBodyType.Dynamic);
      expectVector(b.linvel(), launchVelocity(launch.handCenter, launch.target, launch.force));
      expectVector(b.angvel(), spin(launch.seed, i).map((n, k) => n + launch.handOmega[k]) as Vec3);
    });
  });

  it('recovers only selected bodies while preserving their rotation', () => {
    const bodies = setup();
    place(bodies);
    bodies.forEach((b) => { b.setLinvel({ x: 1, y: 2, z: 3 }, true); b.setAngvel({ x: 3, y: 2, z: 1 }, true); });
    const before = bodyStates(bodies);
    applySettle(bodies, { type: 'wait' });
    expect(bodyStates(bodies)).toEqual(before);
    applySettle(bodies, { type: 'recover', moves: [{ index: 1, p: [0, 1.2, 0] }] });
    expect(bodyStates(bodies)[0]).toEqual(before[0]);
    expectVector(bodies[0].linvel(), [1, 2, 3]);
    expectVector(bodies[0].angvel(), [3, 2, 1]);
    expect(bodyStates(bodies)[1].q).toEqual(before[1].q);
    expectVector(bodies[1].translation(), [0, 1.2, 0]);
    expectVector(bodies[1].linvel(), [0, 0, 0]);
    expectVector(bodies[1].angvel(), [0, 0, 0]);
    expect(bodies[1].isSleeping()).toBe(false);
  });

  it('reveal freezes bodies at the given poses', () => {
    const bodies = setup();
    bodies.forEach((b) => b.setLinvel({ x: 1, y: 2, z: 3 }, true));
    applySettle(bodies, { type: 'reveal', poses, timedOut: false });
    bodies.forEach((b, i) => {
      expect(b.bodyType()).toBe(RigidBodyType.Fixed);
      expectVector(b.translation(), poses[i].p);
      expectVector(b.linvel(), [0, 0, 0]);
      expectVector(b.angvel(), [0, 0, 0]);
    });
    const frozen = bodyStates(bodies);
    world.step();
    expect(bodyStates(bodies)).toEqual(frozen);
  });
});

describe.each(KINDS)('%s × 10', (kind) => {
  it.each([0, 1])('force %s: stops before the cap, no escape, all inside, one result per die', async (force) => {
    const r = await simulate({ kind, count: 10, force, target: [0, 0, -1], seed: 7 });
    expect(r.escaped).toBe(false); expect(r.recovered).toBe(false);
    expect(r.timedOut).toBe(false); // the dice really stop: the reveal does not wait for the cap
    expect(r.bodies).toBe(kind === 'd100' ? 20 : 10);
    expect(r.results).toHaveLength(10);
    r.results.forEach((v) => { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(Number(kind.slice(1))); });
    expect(r.frames.every((f) => f.length === r.bodies)).toBe(true);
    r.final.forEach((p) => expect(isOutside(p, MAX_RADIUS)).toBe(false));
  }, T);
});

describe('edges', () => {
  it('corner throw at max force stays inside', async () => {
    const r = await simulate({ kind: 'd20', count: 10, force: 1, target: clampTarget([99, 0, -99]), seed: 3 });
    expect(r.escaped).toBe(false); expect(r.recovered).toBe(false);
  }, T);
  it('a forced escape is recovered and still reveals inside', async () => {
    const r = await simulate({ kind: 'd6', count: 2, force: 0.5, target: [0, 0, 0], seed: 1,
      perturb: (s, b) => { if (s === 30) b[0].setTranslation({ x: 20, y: 1, z: 0 }, true); } });
    expect(r.recovered).toBe(true);
    r.final.forEach((p) => expect(isOutside(p, MAX_RADIUS)).toBe(false));
  }, T);
  it('a body kept moving is revealed at the cap and frozen', async () => {
    const r = await simulate({ kind: 'd6', count: 2, force: 0.5, target: [0, 0, 0], seed: 1,
      perturb: (_s, b) => b[0].applyImpulse({ x: 0, y: 0.5, z: 0 }, true) });
    expect(r.steps).toBe(SETTLE.timeoutSteps); expect(r.timedOut).toBe(true);
  }, T);
});

describe('replay', () => {
  it('is deterministic: the same throw records the same roll and result', async () => {
    const o = { kind: 'd20' as const, count: 3, force: 0.6, target: [1, 0, -2] as Vec3, seed: 11 };
    const [a, b] = [await simulate(o), await simulate(o)];
    expect(b.results).toEqual(a.results);
    expect(b.frames.at(-1)).toEqual(a.frames.at(-1));
  }, T);
});
