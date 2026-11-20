import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../../shared/math.ts';
import { dobrarBraco, pesoDoBote } from '../domain/ikDoBraco.ts';

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const ombro: Vec3 = [1, 2, 3], L1 = 1.8, L2 = 1.7, polo: Vec3 = [2, 2.75, 3];

describe('dobrarBraco', () => {
  it('puts the wrist on a target within reach, with the bone lengths intact', () => {
    const alvo: Vec3 = [2.5, 0.8, 5];
    const r = dobrarBraco(ombro, alvo, L1, L2, polo);
    expect(r.alcancou).toBe(true);
    expect(dist(r.punho, alvo)).toBeLessThan(1e-6);
    expect(dist(r.cotovelo, ombro)).toBeCloseTo(L1, 6);
    expect(dist(r.punho, r.cotovelo)).toBeCloseTo(L2, 6);
  });

  it('stops short of the target, in its direction, when out of reach', () => {
    const alvo: Vec3 = [1, 2, 30];
    const r = dobrarBraco(ombro, alvo, L1, L2, polo);
    expect(r.alcancou).toBe(false);
    expect(dist(r.punho, ombro)).toBeLessThanOrEqual(L1 + L2);
    expect(dist(r.punho, ombro)).toBeCloseTo(0.999 * (L1 + L2), 6);
    expect(r.punho[0]).toBeCloseTo(1, 6);
    expect(r.punho[1]).toBeCloseTo(2, 6);
    expect(r.punho[2]).toBeGreaterThan(3);
    expect(dist(r.cotovelo, ombro)).toBeCloseTo(L1, 6);
    expect(dist(r.punho, r.cotovelo)).toBeCloseTo(L2, 6);
  });

  it('bends the elbow toward the pole', () => {
    const r = dobrarBraco(ombro, [1, 2, 5], L1, L2, [1, 5, 3]);
    expect(r.cotovelo[1]).toBeGreaterThan(2);
    const baixo = dobrarBraco(ombro, [1, 2, 5], L1, L2, [1, -5, 3]);
    expect(baixo.cotovelo[1]).toBeLessThan(2);
  });
});

describe('pesoDoBote', () => {
  it('is 0 before the window, 1 inside the hold and 0 after it, always within 0..1', () => {
    expect(pesoDoBote(0)).toBe(0);
    expect(pesoDoBote(2950)).toBe(0);
    for (const t of [3300, 3450, 3600]) expect(pesoDoBote(t)).toBe(1);
    expect(pesoDoBote(3850)).toBe(0);
    expect(pesoDoBote(5600)).toBe(0);
    for (let t = -100; t <= 6000; t += 25) { const p = pesoDoBote(t); expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); }
  });
});
