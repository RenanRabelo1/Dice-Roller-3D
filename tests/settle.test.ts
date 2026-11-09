import { describe, it, expect } from 'vitest';
import { initSettle, stepSettle, type BodyState } from '../src/throw/settle';
import { recoveryPoint, SETTLE, type Quat, type Vec3 } from '../src/physics/world';

const Q: Quat = [0, 0, 0, 1];
const body = (moving: boolean, p: Vec3 = [0, 0.5, 0], q = Q): BodyState => ({ p, q, speed: moving ? 1 : 0, spin: moving ? 1 : 0 });
type Step = ReturnType<typeof stepSettle>;
const step = (s: Step['state'], bodies: BodyState[], over: object = {}) =>
  stepSettle(s, { throwId: 1, phase: 'rolling', radii: bodies.map(() => 0.7), bodies, ...over });
const run = (s: Step['state'], bodies: BodyState[], n: number) => {
  let r: Step = { state: s, action: { type: 'wait' } };
  for (let i = 0; i < n; i++) r = step(r.state, bodies);
  return r;
};

describe('settle', () => {
  it(`reveals once every body stays still for ${SETTLE.calmSteps} steps`, () => {
    const still = [body(false), body(false)];
    expect(run(initSettle(1, 2), still, SETTLE.calmSteps - 1).action.type).toBe('wait');
    const r = run(initSettle(1, 2), still, SETTLE.calmSteps);
    expect(r.action).toEqual({ type: 'reveal', timedOut: false, poses: still.map(({ p, q }) => ({ p, q })) });
    expect(step(r.state, still).action.type).toBe('wait'); // reveals only once
  });
  it('any movement restarts the calm count', () => {
    let r = run(initSettle(1, 2), [body(false), body(false)], SETTLE.calmSteps - 1);
    r = step(r.state, [body(false), body(true)]);
    expect(r.state.calm).toBe(0);
    expect(run(r.state, [body(false), body(false)], SETTLE.calmSteps - 1).action.type).toBe('wait');
  });
  it('an empty or incomplete list never reveals', () => {
    expect(run(initSettle(1, 2), [], SETTLE.calmSteps).action.type).toBe('wait');
    expect(run(initSettle(1, 2), [body(false)], SETTLE.calmSteps).action.type).toBe('wait');
  });
  it('ignores another throwId or a phase other than rolling', () => {
    expect(step(initSettle(1, 1), [body(false)], { throwId: 2 }).state.steps).toBe(0);
    expect(step(initSettle(1, 1), [body(false)], { phase: 'settled' }).state.steps).toBe(0);
  });
  it('recovers a body that left the tray', () => {
    const r = step(initSettle(1, 2), [body(true, [20, 1, 0]), body(false)]);
    expect(r.action).toEqual({ type: 'recover', moves: [{ index: 0, p: recoveryPoint(0, 2) }] });
  });
  it(`caps the roll at ${SETTLE.timeoutSteps} steps even while moving, placing escaped bodies inside`, () => {
    let s = initSettle(1, 2);
    for (let i = 1; i < SETTLE.timeoutSteps; i++) s = step(s, [body(true), body(true)]).state;
    const r = step(s, [body(true, [20, 1, 0]), body(true)]);
    expect(r.action).toEqual({ type: 'reveal', timedOut: true, poses: [{ p: recoveryPoint(0, 2), q: Q }, { p: [0, 0.5, 0], q: Q }] });
  });
});
