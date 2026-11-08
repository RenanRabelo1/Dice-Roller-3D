import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { polyhedron } from '../src/dice/polyhedra';
import { initSettle, stepSettle, type BodyState } from '../src/throw/settle';
import { recoveryPoint, type Quat, type Vec3 } from '../src/physics/world';

const d6 = polyhedron('d6');
const flat = (v: number): Quat => {
  const f = d6.faces.find((x) => x.value === v)!;
  return new Quaternion().setFromUnitVectors(new Vector3(...f.normal), new Vector3(0, 1, 0)).toArray() as Quat;
};
const cocked = (v: number): Quat => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.44).multiply(new Quaternion(...flat(v))).toArray() as Quat;
const body = (asleep: boolean, v = 1, p: Vec3 = [0, 0.5, 0], q = flat(v)): BodyState => ({ asleep, p, q });
const step = (s: ReturnType<typeof initSettle>, bodies: BodyState[], over: object = {}) =>
  stepSettle(s, { throwId: 1, phase: 'rolling', polys: bodies.map(() => d6), bodies, ...over });

describe('settle', () => {
  it('A sleeps → A wakes → B sleeps does not publish', () => {
    let s = initSettle(1, 2);
    for (const bs of [[body(true), body(false)], [body(false), body(false)], [body(false), body(true)]]) {
      const r = step(s, bs); expect(r.action.type).toBe('wait'); s = r.state;
    }
  });
  it('publishes all values together once, when everyone is asleep now', () => {
    const r = step(initSettle(1, 2), [body(true, 3), body(true, 5)]);
    expect(r.action).toMatchObject({ type: 'publish', raw: [3, 5], timedOut: false });
    expect(step(r.state, [body(true, 3), body(true, 5)]).action.type).toBe('wait');
  });
  it('an empty or incomplete list never publishes', () => {
    expect(step(initSettle(1, 2), []).action.type).toBe('wait');
    expect(step(initSettle(1, 2), [body(true)]).action.type).toBe('wait');
  });
  it('ignores another throwId or a phase other than rolling', () => {
    expect(step(initSettle(1, 1), [body(true)], { throwId: 2 }).action.type).toBe('wait');
    expect(step(initSettle(1, 1), [body(true)], { phase: 'settled' }).state.steps).toBe(0);
  });
  it('nudges a cocked die up to three times, then accepts the closest face', () => {
    let s = initSettle(1, 1);
    for (let n = 1; n <= 3; n++) { const r = step(s, [body(true, 2, [0, 0.5, 0], cocked(2))]); expect(r.action).toEqual({ type: 'nudge', indices: [0] }); s = r.state; expect(s.attempts[0]).toBe(n); }
    expect(step(s, [body(true, 2, [0, 0.5, 0], cocked(2))]).action).toMatchObject({ type: 'publish', raw: [2] });
  });
  it('recovers a body that left the tray before waiting on others', () => {
    const r = step(initSettle(1, 2), [body(false, 1, [20, 1, 0]), body(false)]);
    expect(r.action).toEqual({ type: 'recover', moves: [{ index: 0, p: recoveryPoint(0, 2) }] });
    expect(r.state.attempts[0]).toBe(1);
  });
  it('times out at step 480 even with awake bodies, keeping orientation', () => {
    let s = initSettle(1, 2);
    for (let i = 1; i < 480; i++) s = step(s, [body(false, 4), body(false, 2)]).state;
    const r = step(s, [body(false, 4, [20, 1, 0]), body(false, 2)]);
    expect(r.action).toMatchObject({ type: 'publish', raw: [4, 2], timedOut: true });
    if (r.action.type === 'publish') { expect(r.action.poses[0].p).toEqual(recoveryPoint(0, 2)); expect(r.action.poses[0].q).toEqual(flat(4)); }
  });
  it('recovery does not reset the deadline', () => {
    let s = step(initSettle(1, 1), [body(false, 1, [20, 1, 0])]).state;
    for (let i = 2; i < 480; i++) s = step(s, [body(false)]).state;
    expect(step(s, [body(false)]).action.type).toBe('publish');
  });
});
