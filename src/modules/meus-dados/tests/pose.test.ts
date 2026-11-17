import { describe, it, expect } from 'vitest';
import { facesDeCima } from '../domain/pose.ts';
import { detectFree, idealSolid } from '../domain/importador.ts';
import { polyhedron } from '../../dados/index.ts';
import { asFile, prismTriangles, shardTriangles } from '../../../../tests/helpers/models.ts';

const up = (faces: { normal: number[] }[], rest: number, tops: number[]) =>
  tops.every((t) => faces[t].normal[0] * faces[rest].normal[0] + faces[t].normal[1] * faces[rest].normal[1] + faces[t].normal[2] * faces[rest].normal[2] < -0.5);

describe('facesDeCima', () => {
  it('a regular die: only the opposite face', () => {
    const { faces } = polyhedron('d6');
    for (let r = 0; r < faces.length; r++) {
      const tops = facesDeCima(faces, r);
      expect(tops).toHaveLength(1);
      expect(up(faces, r, tops)).toBe(true);
    }
  });
  it('a free-form die: one or two faces, always looking up, never the resting one', () => {
    for (const tri of [shardTriangles(5), prismTriangles(5, 1.4)]) {
      const { faces } = idealSolid('livre', detectFree(asFile(tri)).planes).poly;
      for (let r = 0; r < faces.length; r++) {
        const tops = facesDeCima(faces, r);
        expect(tops.length).toBeGreaterThanOrEqual(1);
        expect(tops).not.toContain(r);
      }
    }
  });
  it('a 5-sided prism resting on a side has an edge on top: two faces', () => {
    const { faces } = idealSolid('livre', detectFree(asFile(prismTriangles(5, 1.4))).planes).poly;
    const counts = faces.map((_, r) => facesDeCima(faces, r).length);
    expect(counts).toContain(2);
    expect(counts).toContain(1); // resting on a cap: the other cap
  });
  it('skips faces that are not results', () => {
    const faces = [{ normal: [0, -1, 0] as [number, number, number] }, { normal: [0, 1, 0] as [number, number, number], readable: false }, { normal: [1, 0, 0] as [number, number, number] }];
    expect(facesDeCima(faces, 0)).toEqual([2]);
  });
});
