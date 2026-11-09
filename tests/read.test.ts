import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { polyhedron, type Shape } from '../src/dice/polyhedra';
import { readUp, rollResults, bodyValues, revealRotation } from '../src/dice/read';
import { rng } from '../src/throw/aim';
import type { Quat, Vec3 } from '../src/physics/world';

const toUp = (n: Vec3): Quat => new Quaternion().setFromUnitVectors(new Vector3(...n), new Vector3(0, 1, 0)).toArray() as Quat;
const tiltBy = (q: Quat, deg: number): Quat =>
  new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (deg * Math.PI) / 180).multiply(new Quaternion(...q)).toArray() as Quat;

describe('readUp', () => {
  it.each(['d6', 'd8', 'd10', 'd12', 'd20'] as Shape[])('%s reads every face turned up', (shape) => {
    const p = polyhedron(shape);
    p.faces.forEach((f) => { const r = readUp(p, toUp(f.normal)); expect(r.value).toBe(f.value); expect(r.tilt).toBeLessThan(1e-4); });
  });
  it('d4 reads the top vertex with zero tilt when resting on a face (not 70.53°)', () => {
    const p = polyhedron('d4');
    p.tops.forEach((t) => { const r = readUp(p, toUp(t.dir)); expect(r.value).toBe(t.value); expect(r.tilt).toBeLessThan(1e-4); });
  });
  it('reports the tilt of a cocked die', () => {
    const p = polyhedron('d20');
    expect(readUp(p, tiltBy(toUp(p.faces[0].normal), 20)).tilt).toBeCloseTo(20, 3);
    const d4 = polyhedron('d4');
    expect(readUp(d4, tiltBy(toUp(d4.tops[0].dir), 20)).tilt).toBeCloseTo(20, 3);
  });
});

describe('results decided at the throw', () => {
  it('rollResults gives one value per die inside the die range', () => {
    for (const [kind, sides] of [['d4', 4], ['d10', 10], ['d20', 20], ['d100', 100]] as const) {
      const r = rollResults(kind, 1000);
      expect(r).toHaveLength(1000);
      r.forEach((v) => { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(sides); });
      expect(new Set(r).size).toBe(sides); // 1000 draws cover every face
    }
  });
  it('bodyValues maps results to what each body shows', () => {
    expect(bodyValues('d6', [3, 6])).toEqual([3, 6]);
    expect(bodyValues('d10', [10, 7])).toEqual([0, 7]);
    expect(bodyValues('d100', [100, 99, 1, 50])).toEqual([0, 0, 9, 9, 0, 1, 5, 0]);
  });
});

describe('revealRotation', () => {
  const randomQuat = (r: () => number): Quat => {
    const [u, v, w] = [r(), r(), r()];
    return [Math.sqrt(1 - u) * Math.sin(2 * Math.PI * v), Math.sqrt(1 - u) * Math.cos(2 * Math.PI * v), Math.sqrt(u) * Math.sin(2 * Math.PI * w), Math.sqrt(u) * Math.cos(2 * Math.PI * w)];
  };
  const cases: [Shape, 'plain' | 'tens'][] = [['d4', 'plain'], ['d6', 'plain'], ['d8', 'plain'], ['d10', 'plain'], ['d10', 'tens'], ['d12', 'plain'], ['d20', 'plain']];
  it.each(cases)('%s (%s): puts every wanted value on top and maps the solid onto itself', (shape, labels) => {
    const poly = polyhedron(shape, labels);
    const values = (shape === 'd4' ? poly.tops : poly.faces).map((m) => m.value);
    const r = rng(42);
    for (let n = 0; n < 5; n++) {
      const q = randomQuat(r);
      for (const wanted of values) {
        const s = new Quaternion(...revealRotation(poly, q, wanted));
        expect(readUp(poly, new Quaternion(...q).multiply(s).toArray() as Quat).value).toBe(wanted);
        poly.points.forEach((p) => {
          const moved = new Vector3(...p).applyQuaternion(s);
          expect(Math.min(...poly.points.map((o) => moved.distanceTo(new Vector3(...o))))).toBeLessThan(1e-4);
        });
      }
    }
  });
});
