import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { polyhedron, type BuiltinKind } from '../src/dice/polyhedra';
import { readUp, toResults } from '../src/dice/read';
import type { Quat, Vec3 } from '../src/physics/world';

const toUp = (n: Vec3): Quat => new Quaternion().setFromUnitVectors(new Vector3(...n), new Vector3(0, 1, 0)).toArray() as Quat;
const tiltBy = (q: Quat, deg: number): Quat =>
  new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (deg * Math.PI) / 180).multiply(new Quaternion(...q)).toArray() as Quat;

describe('readUp', () => {
  it.each(['d6', 'd8', 'd10', 'd12', 'd20'] as BuiltinKind[])('%s reads every face turned up', (shape) => {
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
  it('toResults maps each die of a mixed selection (d10 0 is 10)', () => {
    expect(toResults(['d10', 'd10', 'd12', 'd100'], [0, 7, 12, 100])).toEqual([10, 7, 12, 100]);
    expect(toResults(['d6'], [3])).toEqual([3]);
  });
  it('custom dice count like their base die (Vampire d10s: 0 is 10; fire d6 as is)', () => {
    expect(toResults(['vtm', 'hunger', 'hunger', 'fire'], [0, 0, 1, 6])).toEqual([10, 10, 1, 6]);
  });
  it('a coin reads heads (1) face up and tails (2) face down, even leaning on its rim', () => {
    const coin = polyhedron('coin');
    expect(readUp(coin, [0, 0, 0, 1]).value).toBe(1);
    expect(readUp(coin, toUp([0, -1, 0])).value).toBe(2);
    expect(readUp(coin, tiltBy([0, 0, 0, 1], 80)).value).toBe(1);
    expect(toResults(['coin', 'coin'], [1, 2])).toEqual([1, 2]);
  });
});
