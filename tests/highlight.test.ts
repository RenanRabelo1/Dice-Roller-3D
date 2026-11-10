import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { highlightAt, SHOW } from '../src/scene/highlight';

const start = new Vector3(1, 1, 1), face = new Vector3(0, 6, 4);

describe('highlightAt', () => {
  it('starts invisible on top of the die, small', () => {
    const h = highlightAt(0, 0, start, face, 0.5);
    expect(h.p.toArray()).toEqual(start.toArray());
    expect(h.opacity).toBe(0);
    expect(h.scale).toBeCloseTo(0.7);
  });
  it('has risen, fully visible, before the die flies', () => {
    const h = highlightAt(SHOW.delay - 1, 0, start, face, 0.5);
    expect(h.opacity).toBe(1);
    expect(h.scale).toBeCloseTo(1);
    expect(h.p.y).toBeGreaterThan(start.y + 0.5);
    expect(h.p.x).toBe(start.x);
  });
  it('lands on the face at its size once the flight ends, staggered per die', () => {
    const end = SHOW.delay + 2 * SHOW.stagger + SHOW.duration;
    const h = highlightAt(end, 2, start, face, 0.5);
    expect(h.p.distanceTo(face)).toBeLessThan(1e-9);
    expect(h.scale).toBeCloseTo(0.5);
    expect(highlightAt(SHOW.delay + 2 * SHOW.stagger + 0.1 * SHOW.duration, 2, start, face, 0.5).p.distanceTo(face)).toBeGreaterThan(0.1); // still on its way early in the flight
  });
  it('keeps glowing (pulsing within 0.4..1) after landing', () => {
    const after = SHOW.delay + SHOW.duration;
    const glows = Array.from({ length: 40 }, (_, k) => highlightAt(after + k * 50, 0, start, face, 0.5).glow);
    glows.forEach((g) => { expect(g).toBeGreaterThanOrEqual(0.4); expect(g).toBeLessThanOrEqual(1); });
    expect(Math.max(...glows) - Math.min(...glows)).toBeGreaterThan(0.3);
  });
});
