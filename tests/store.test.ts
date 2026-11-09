import { describe, it, expect, beforeEach } from 'vitest';
import { useDice } from '../src/store';
import type { Vec3 } from '../src/physics/world';

const s = () => useDice.getState();
const P = { kind: 'pointer', id: 1 } as const;
beforeEach(() => useDice.setState(useDice.getInitialState(), true));

describe('store', () => {
  it('a selection change resets phase, results and launch and bumps throwId', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().setKind('d6');
    expect(s().gesture.phase).toBe('hand'); expect(s().throwId).toBe(1);
    expect(s().launch).toBeNull(); expect(s().results).toBeNull();
  });
  it('setCount clamps to 1..10', () => { s().setCount(0); expect(s().count).toBe(1); s().setCount(42); expect(s().count).toBe(10); });
  it('a release throws with one snapshot of seed, target, force and hand motion', () => {
    s().setAim([2, 0, -2]);
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    const eff = s().input({ type: 'release', source: P, at: 700 }, { center: [0, 3, 3], omega: [1, 0, 0] });
    expect(eff).toEqual({ type: 'throw', force: 1 });
    expect(s().launch).toMatchObject({ throwId: 1, target: [2, 0, -2], force: 1, handCenter: [0, 3, 3], handOmega: [1, 0, 0] });
    expect(typeof s().launch!.seed).toBe('number'); expect(s().gesture.phase).toBe('rolling');
  });
  it('publish only lands for the current throw while rolling', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 }, { center: [0, 3, 3], omega: [0, 0, 0] });
    s().publish(0, [5]); expect(s().results).toBeNull();
    s().publish(1, [5]); expect(s().results).toEqual([5]); expect(s().gesture.phase).toBe('settled');
    s().publish(1, [6]); expect(s().results).toEqual([5]);
  });
  it('copies the release inputs and keeps the launch stable as aim and force change', () => {
    const target: Vec3 = [2, 0, -2];
    const center: Vec3 = [0, 3, 3], omega: Vec3 = [1, 0, 0];
    s().setAim(target);
    s().setForce(0.2);
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 }, { center, omega });
    const launch = s().launch!;
    target[0] = 99; center[1] = 99; omega[0] = 99;
    s().aim[0] = 88;
    s().setAim([3, 0, -1]); s().setForce(0.5);
    expect(s().launch).toBe(launch);
    expect(launch).toMatchObject({ target: [2, 0, -2], force: 1, handCenter: [0, 3, 3], handOmega: [1, 0, 0] });
    expect(Number.isInteger(launch.seed)).toBe(true);
    expect(launch.seed).toBeGreaterThanOrEqual(0);
    expect(launch.seed).toBeLessThanOrEqual(0xffffffff);
  });
  it('selection invalidates active throws and stale publications and clears force', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 });
    s().setForce(0.8);
    s().setCount(2);
    s().publish(1, [5]);
    expect(s()).toMatchObject({ throwId: 2, count: 2, force: 0, gesture: { phase: 'hand' }, launch: null, results: null });
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 });
    s().publish(1, [5]);
    expect(s().results).toBeNull();
    s().publish(3, [6]);
    s().setKind('d6');
    expect(s()).toMatchObject({ throwId: 4, force: 0, results: null, gesture: { phase: 'hand' } });
  });
  it('retains copied results through return and clears them on the next throw', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 });
    const results = [5];
    s().publish(1, results); results[0] = 9;
    expect(s().input({ type: 'press', source: P, at: 0, repeat: false })).toEqual({ type: 'return' });
    expect(s().results).toEqual([5]);
    s().input({ type: 'returned' });
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 350 });
    expect(s()).toMatchObject({ throwId: 2, results: null, force: 0.5 });
    expect(s().launch).toMatchObject({ handCenter: [0, 3, 3], handOmega: [0, 0, 0] });
  });
});
