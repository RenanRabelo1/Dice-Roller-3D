import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { readUp, toResults } from '../src/dice/read';
import type { Quat } from '../src/shared/math';
import { detectFree, idealSolid, renumbered, withReadable } from '../src/dice/importer';
import { asFile, freeDieOf, prismTriangles, shardTriangles } from './helpers/models';

// The part of the reading tests that needs the importer (free-form solids); the rest lives in src/modules/dados/tests/read.test.ts.

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
