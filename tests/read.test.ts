import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { polyhedron, type Shape } from '../src/dice/polyhedra';
import { readUp, combineD100, toResults } from '../src/dice/read';
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

describe('results', () => {
  it('combineD100 keeps raw digits', () => {
    expect([combineD100(0, 0), combineD100(9, 9), combineD100(0, 1), combineD100(5, 0)]).toEqual([100, 99, 1, 50]);
  });
  it('toResults maps per kind', () => {
    expect(toResults('d10', [0, 7])).toEqual([10, 7]);
    expect(toResults('d100', [0, 0, 9, 9])).toEqual([100, 99]);
    expect(toResults('d6', [3])).toEqual([3]);
  });
});
