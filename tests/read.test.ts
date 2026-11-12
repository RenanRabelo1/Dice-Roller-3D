import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { polyhedron, type BuiltinKind } from '../src/dice/polyhedra';
import { readUp, toResults } from '../src/dice/read';
import type { Quat, Vec3 } from '../src/physics/world';
import { detectFree, idealSolid, renumbered, withReadable } from '../src/dice/importer';
import { asFile, freeDieOf, prismTriangles, shardTriangles } from './helpers/models';

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

describe('readUp on a free-form die', () => {
  it('reads the face it rests on (pointing down), for every face', () => {
    const die = freeDieOf(prismTriangles(3, 1.4), 'Prisma', 'prisma', [7, 8, 9, 10, 11]);
    const p = die.poly;
    expect(p.faces).toHaveLength(5);
    p.faces.forEach((f) => {
      const down = new Quaternion().setFromUnitVectors(new Vector3(...f.normal), new Vector3(0, -1, 0)).toArray() as Quat;
      const r = readUp(p, down);
      expect(r.value).toBe(f.value);
      expect(r.tilt).toBeLessThan(1e-4);
    });
    expect(p.faces.map((f) => f.value).sort((a, b) => a - b)).toEqual([7, 8, 9, 10, 11]);
  });
  it('does not turn 0 into 10 and keeps repeated values', () => {
    expect(toResults(['d6'], [0])).toEqual([0]);
  });
});

describe('readUp on a shard resting on a tip facet', () => {
  it('reads one of the long faces, never a tip', () => {
    const r = detectFree(asFile(shardTriangles(5))), { poly } = idealSolid('livre', r.planes);
    const big = [...r.areas].map((a, i) => [a, i]).sort((a, b) => b[0] - a[0]).slice(0, 5).map(([, i]) => poly.faces[i].normal);
    const only = renumbered(withReadable(poly, big), { values: poly.faces.map((_, i) => i + 1) });
    const readable = new Set(only.faces.filter((f) => f.readable !== false).map((f) => f.value));
    const tip = only.faces.find((f) => f.readable === false)!;
    const q = new Quaternion().setFromUnitVectors(new Vector3(...tip.normal), new Vector3(0, -1, 0)).toArray() as Quat;
    expect(readable.has(readUp(only, q).value)).toBe(true);
  });
  it('a record without `readable` reads every face, as before', () => {
    const { poly } = idealSolid('livre', detectFree(asFile(prismTriangles(5, 1.4))).planes);
    const f = poly.faces[3], q = new Quaternion().setFromUnitVectors(new Vector3(...f.normal), new Vector3(0, -1, 0)).toArray() as Quat;
    expect(readUp(poly, q).value).toBe(f.value);
  });
});
