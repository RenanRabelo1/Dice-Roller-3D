import { describe, it, expect } from 'vitest';
import { SYMBOLS, symbolGeometry } from '../src/dice/symbols';

describe.each(SYMBOLS)('%s', (name) => {
  const g = symbolGeometry(name);
  it('is a flat drawing that fills a 1-unit-tall box centred on the origin', () => {
    g.computeBoundingBox();
    const { min, max } = g.boundingBox!;
    expect(g.index!.count).toBeGreaterThan(0);
    expect([min.z, max.z]).toEqual([0, 0]);
    expect(max.y - min.y).toBeCloseTo(1, 1);
    expect(Math.abs(max.y + min.y)).toBeLessThan(0.05);
    expect(Math.abs(max.x + min.x)).toBeLessThan(1e-6); // every symbol is left-right symmetric
    expect(max.x - min.x).toBeLessThanOrEqual(1);
  });
  it('is built once and shared', () => expect(symbolGeometry(name)).toBe(g));
});
