import { describe, it, expect } from 'vitest';
import { clampTarget, charge, launchVelocity, spin, rng } from '../src/throw/aim';

const len = (v: number[]) => Math.hypot(...v);

describe('aim', () => {
  it('charge is a 0→1→0 triangle wave with a 1400 ms cycle', () => {
    expect([0, 350, 700, 1050, 1400, 2100].map(charge)).toEqual([0, 0.5, 1, 0.5, 0, 1]);
    for (let t = 0; t < 5000; t += 37) { expect(charge(t)).toBeGreaterThanOrEqual(0); expect(charge(t)).toBeLessThanOrEqual(1); }
  });
  it('clampTarget keeps the target inside the tray at floor level', () => {
    expect(clampTarget([100, 5, -100]).map((v) => +v.toFixed(6))).toEqual([6.1, 0, -3.6]);
    expect(clampTarget([1, 2, 3])).toEqual([1, 0, 3]);
  });
  it('launchVelocity aims at the target, rises and grows with force', () => {
    const from: [number, number, number] = [0, 3, 3], to: [number, number, number] = [2, 0, -2];
    const v0 = launchVelocity(from, to, 0), v1 = launchVelocity(from, to, 1), vh = launchVelocity(from, to, 0.5);
    expect(len([v0[0], v0[2]])).toBeCloseTo(6); expect(len([v1[0], v1[2]])).toBeCloseTo(22);
    expect(len(v1)).toBeGreaterThan(len(vh)); expect(len(vh)).toBeGreaterThan(len(v0));
    expect(v1[0] / v1[2]).toBeCloseTo(2 / -5); expect(v1[2]).toBeLessThan(0);
    expect(v1[1]).toBeCloseTo(0.35 * 22);
    expect(launchVelocity([0, 3, 0], [0, 0, 0], 0)).toEqual([0, 0.35 * 6, -6]);
  });
  it('spin is deterministic per seed and index, distinct across indices, bounded', () => {
    expect(spin(42, 0)).toEqual(spin(42, 0));
    expect(spin(42, 0)).not.toEqual(spin(42, 1));
    for (let s = 0; s < 50; s++) for (let i = 0; i < 20; i++) { const m = len(spin(s, i)); expect(m).toBeGreaterThanOrEqual(10); expect(m).toBeLessThanOrEqual(25); }
  });
  it('rng is deterministic', () => expect(rng(1)()).toBe(rng(1)()));
});
