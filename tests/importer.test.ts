import { describe, it, expect } from 'vitest';
import { BoxGeometry, IcosahedronGeometry } from 'three';
import type { CustomBase } from '../src/dice/custom';
import { askOrder, checkValues, detectPlanes, idealSolid, ImportError, importModel, LIMITS, looksNumbered, readModel, renumbered, suggestOpposite } from '../src/dice/importer';
import { RADIUS, polyhedron } from '../src/dice/polyhedra';
import { glb, modelTriangles, stl } from './helpers/models';

const BASES: CustomBase[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const FACES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const soup = (g: BoxGeometry | IcosahedronGeometry, scale = 1) => {
  const n = g.index ? g.toNonIndexed() : g;
  return Float32Array.from(n.getAttribute('position').array, (v) => v * scale);
};

describe.each(BASES)('importing a %s', (base) => {
  for (const bevel of [0, 0.12]) describe(bevel ? 'with chamfered corners' : 'with sharp corners', () => {
    const positions = modelTriangles(polyhedron(base), { bevel });
    it('recognises the shape', () => {
      expect(detectPlanes(positions).base).toBe(base);
    });
    it('rebuilds the solid at the stock size, centred, with the right faces', () => {
      const { poly, fit } = idealSolid(base, detectPlanes(positions).planes);
      expect(poly.faces).toHaveLength(FACES[base]);
      expect(Math.max(...poly.points.map((p) => Math.hypot(...p)))).toBeCloseTo(RADIUS[base], 4);
      expect(poly.points.reduce((s, p) => s + p[0], 0) / poly.points.length).toBeCloseTo(0, 4); // centred
      expect(fit.scale).toBeGreaterThan(0);
      if (base !== 'd4') poly.faces.forEach((f) => expect(poly.faces.some((g) => dot(g.normal, f.normal) < -0.999)).toBe(true));
      poly.faces.forEach((f) => expect(dot(f.normal, f.center)).toBeGreaterThan(0));
    });
  });
});

describe('what is not a die', () => {
  it('rejects a squashed box and a sphere', () => {
    expect(() => detectPlanes(soup(new BoxGeometry(2, 2, 0.3)))).toThrow(ImportError);
    expect(() => detectPlanes(soup(new IcosahedronGeometry(1, 6)))).toThrow(/Não reconheci/);
  });
  it('rejects a model over the triangle limit', async () => {
    const big = stl(soup(new IcosahedronGeometry(1, 60)));
    expect(big.byteLength).toBeLessThan(LIMITS.bytes);
    await expect(readModel(big, 'stl')).rejects.toThrow(/triângulos/);
  });
  it('rejects a file over the size limit and garbage', async () => {
    await expect(readModel(new ArrayBuffer(LIMITS.bytes + 1), 'stl')).rejects.toThrow(/MB/);
    await expect(readModel(new ArrayBuffer(10), 'glb')).rejects.toThrow(ImportError);
  });
});

describe('reading files', () => {
  const positions = modelTriangles(polyhedron('d20'));
  it('imports an STL', async () => {
    const m = await importModel(stl(positions), 'stl');
    expect(m.base).toBe('d20');
    expect(m.triangles).toBe(positions.length / 9);
  });
  it('imports a self-contained GLB', async () => {
    expect((await importModel(glb(positions), 'glb')).base).toBe('d20');
  });
  it('refuses a GLB that points at an outside file', async () => {
    await expect(readModel(glb(positions, 'https://example.com/die.bin'), 'glb')).rejects.toThrow(ImportError);
  });
});

describe('numbering', () => {
  it('accepts each value once and turns 10 into 0 on a d10', () => {
    expect(checkValues('d6', [1, 2, 3, 4, 5, 6])).toBeNull();
    expect(checkValues('d10', [10, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toBeNull();
    expect(checkValues('d6', [1, 2, 3, 4, 5, 5])).toMatch(/mais de uma vez/);
    expect(checkValues('d6', [1, 2, 3, 4, 5, 7])).toMatch(/vão de 1 a 6/);
    expect(checkValues('d6', [1, 2, 3])).toBe('Faltam números.');
  });
  it('suggests the opposite value, which stays editable (spindown layouts)', () => {
    expect(suggestOpposite('d20', 1)).toBe(20);
    expect(suggestOpposite('d4', 1)).toBeNull();
    const poly = polyhedron('d20'), order = askOrder(poly);
    expect(new Set(order).size).toBe(20);
    const values = poly.faces.map((_, i) => order.indexOf(i) + 1); // anything that is a permutation
    const custom = renumbered(poly, { values });
    expect(custom.faces.map((f) => f.value)).toEqual(values);
    expect(custom.labelList.map((l) => l.value).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
  it('turns a numeral in steps of 360° / sides', () => {
    const poly = polyhedron('d6'), turned = renumbered(poly, { turns: poly.faces.map(() => 1) });
    poly.labelList.forEach((l, i) => {
      expect(Math.abs(dot(l.up, turned.labelList[i].up))).toBeLessThan(1e-6); // a quarter turn on a square
      expect(dot(turned.labelList[i].up, l.normal)).toBeCloseTo(0, 6);
    });
  });
  it('renumbers a d4 by corner', () => {
    const d4 = renumbered(polyhedron('d4'), { values: [4, 3, 2, 1] });
    expect(d4.tops.map((t) => t.value)).toEqual([4, 3, 2, 1]);
    expect(d4.labelList).toHaveLength(12);
  });
});

describe('numerals cut into the faces', () => {
  for (const base of BASES) it(`${base}: told apart from smooth and from chamfered-smooth`, () => {
    const check = (o: { bevel?: number; engrave?: number }) => {
      const positions = modelTriangles(polyhedron(base), o);
      return looksNumbered(positions, idealSolid(base, detectPlanes(positions).planes));
    };
    expect(check({})).toBe(false);
    expect(check({ bevel: 0.1 })).toBe(false);
    expect(check({ engrave: 0.04 })).toBe(true);
    expect(check({ bevel: 0.1, engrave: 0.04 })).toBe(true);
  });
});
