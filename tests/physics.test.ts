import { afterEach, beforeAll, describe, it, expect } from 'vitest';
import RAPIER, { RigidBodyType } from '@dimforge/rapier3d-compat';
import { KINDS, type DieKind } from '../src/dice/polyhedra';
import { clampTarget, launchVelocity, rng, spin } from '../src/throw/aim';
import { applyLaunch, applyPoses, applySettle, bodyStates, toKinematic } from '../src/physics/apply';
import { isOutside, MAX_RADIUS, NUDGE, type Quat, type Vec3 } from '../src/physics/world';
import { initRapier, simulate } from './helpers/sim';

const MAX: Record<DieKind, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100 };
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
  const poses: { p: Vec3; q: Quat }[] = [
    { p: [-1, 3, 2], q: [0, 0.6, 0, 0.8] },
    { p: [2, 4, -1], q: [0.6, 0, 0, 0.8] },
  ];

  it('applies fixture poses to fixed bodies and wakes them with zero velocity', () => {
    const bodies = setup();
    bodies.forEach((b) => b.setBodyType(RigidBodyType.Fixed, false));
    applyPoses(bodies, poses);
    bodies.forEach((b, i) => {
      expect(b.bodyType()).toBe(RigidBodyType.Dynamic);
      expect(b.isSleeping()).toBe(false);
      expectVector(b.translation(), poses[i].p);
      const q = b.rotation();
      [q.x, q.y, q.z, q.w].forEach((n, k) => expect(n).toBeCloseTo(poses[i].q[k], 5));
      expectVector(b.linvel(), [0, 0, 0]);
      expectVector(b.angvel(), [0, 0, 0]);
    });
    bodies[0].sleep();
    expect(bodyStates(bodies).map((b) => b.asleep)).toEqual([true, false]);
  });

  it('clears motion for the hand, then launches with the current pose and per-die spin', () => {
    const bodies = setup();
    applyPoses(bodies, poses);
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
    applyPoses(bodies, poses);
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

  it('nudges sleeping bodies with mass-scaled impulses and freezes published poses', () => {
    const bodies = setup();
    bodies.forEach((b) => b.sleep());
    applySettle(bodies, { type: 'nudge', indices: [1] });
    expect(bodies[0].isSleeping()).toBe(true);
    expectVector(bodies[0].linvel(), [0, 0, 0]);
    expect(bodies[1].isSleeping()).toBe(false);
    expectVector(bodies[1].linvel(), [0, NUDGE.up, 0]);
    const angularSpeed = NUDGE.torque * bodies[1].mass() / bodies[1].principalInertia().x;
    expectVector(bodies[1].angvel(), [angularSpeed, 0, angularSpeed]);
    applySettle(bodies, { type: 'publish', raw: [1, 2], poses, timedOut: false });
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
  it.each([0, 1])('force %s: no escape, publishes by step 480, all inside', async (force) => {
    const r = await simulate({ kind, count: 10, force, target: [0, 0, -1], seed: 7 });
    expect(r.escaped).toBe(false); expect(r.recovered).toBe(false);
    expect(r.steps).toBeLessThanOrEqual(480);
    expect(r.bodies).toBe(kind === 'd100' ? 20 : 10);
    expect(r.results).toHaveLength(10);
    r.results.forEach((v) => { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(MAX[kind]); });
    r.final.forEach((p) => expect(isOutside(p, MAX_RADIUS)).toBe(false));
  }, T);
});

describe('edges', () => {
  it('corner throw at max force stays inside', async () => {
    const r = await simulate({ kind: 'd20', count: 10, force: 1, target: clampTarget([99, 0, -99]), seed: 3 });
    expect(r.escaped).toBe(false); expect(r.recovered).toBe(false);
  }, T);
  it('a forced escape is recovered and still publishes inside', async () => {
    const r = await simulate({ kind: 'd6', count: 2, force: 0.5, target: [0, 0, 0], seed: 1,
      perturb: (s, b) => { if (s === 30) b[0].setTranslation({ x: 20, y: 1, z: 0 }, true); } });
    expect(r.recovered).toBe(true); expect(r.results).toHaveLength(2);
    r.final.forEach((p) => expect(isOutside(p, MAX_RADIUS)).toBe(false));
  }, T);
  it('a body kept awake times out at step 480 and is frozen', async () => {
    const r = await simulate({ kind: 'd6', count: 2, force: 0.5, target: [0, 0, 0], seed: 1,
      perturb: (_s, b) => b[0].applyImpulse({ x: 0, y: 0.5, z: 0 }, true) });
    expect(r.steps).toBe(480); expect(r.fixed).toBe(true); expect(r.results).toHaveLength(2);
  }, T);
});

describe('distribution diagnostic (seeded, repeatable)', () => {
  const chi2 = async (kind: DieKind, sides: number, n: number) => {
    const counts = new Array(sides).fill(0);
    for (let seed = 1; seed <= n; seed++) {
      const r = rng(seed);
      const res = await simulate({ kind, count: 1, force: r(), target: clampTarget([(r() * 2 - 1) * 7, 0, (r() * 2 - 1) * 4.5]), seed });
      counts[res.results[0] - 1]++;
    }
    const e = n / sides;
    return counts.reduce((acc, c) => acc + (c - e) ** 2 / e, 0);
  };
  it('d6 over 600 throws: χ² < 20.515 (df 5, p 0.001)', async () => expect(await chi2('d6', 6, 600)).toBeLessThan(20.515), 600_000);
  it('d20 over 1000 throws: χ² < 43.820 (df 19, p 0.001)', async () => expect(await chi2('d20', 20, 1000)).toBeLessThan(43.82), 600_000);
});
