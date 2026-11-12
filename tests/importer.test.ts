import { describe, it, expect } from 'vitest';
import { BoxGeometry, IcosahedronGeometry } from 'three';
import type { StdBase } from '../src/dice/custom';
import { askOrder, checkValues, detectFree, detectPlanes, idealSolid, ImportError, importModel, LIMITS, looksNumbered, readModel, renumbered, suggestOpposite } from '../src/dice/importer';
import { RADIUS, polyhedron } from '../src/dice/polyhedra';
import type { Vec3 } from '../src/physics/world';
import { asFile, glb, hullTriangles, modelTriangles, planesSolid, prismTriangles, stl, triacontahedronNormals } from './helpers/models';

const BASES: StdBase[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
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

describe('free-form dice (detectFree)', () => {
  const faces = (tris: Vec3[]) => detectFree(asFile(tris)).planes.length;
  it.each([[3, 5], [5, 7], [7, 9]])('a prism of %i sides has %i faces to rest on', (sides, count) => {
    expect(faces(prismTriangles(sides, 1.4))).toBe(count);
  });
  it('finds the 30 faces of a rhombic triacontahedron', () => {
    expect(faces(planesSolid(triacontahedronNormals()))).toBe(30);
  });
  it('the standard detector refuses a prism, with the code the wizard looks for', () => {
    try { detectPlanes(asFile(prismTriangles(3, 1.4))); expect.unreachable(); } catch (e) { expect((e as ImportError).code).toBe('nao-padrao'); }
  });
  it('leaves out a small facet cut from a corner', () => {
    const cube: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const found = detectFree(asFile(planesSolid([...cube, [1 / 2.77, 1 / 2.77, 1 / 2.77]])));
    expect(found.planes).toHaveLength(6);
    expect(found.dropped).toBe(1);
  });
  it('drops faces the die could not rest on', () => {
    // A cube with a far point pulled out beyond one edge: the long slopes are small or tip the die over.
    const cube: Vec3[] = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) cube.push([a, b, c]);
    const found = detectFree(asFile(hullTriangles([...cube, [3, 3, 0]])));
    expect(found.dropped).toBeGreaterThan(0);
    expect(found.planes.length).toBeGreaterThanOrEqual(3);
  });
  it('refuses 2 and 61 planes', () => {
    expect(() => detectFree(asFile(planesSolid([[1, 0, 0], [-1, 0, 0]])))).toThrow(ImportError);
    const many: Vec3[] = Array.from({ length: 61 }, (_, i) => { const y = 1 - (2 * (i + 0.5)) / 61, r = Math.sqrt(1 - y * y); return [Math.cos(2.4 * i) * r, y, Math.sin(2.4 * i) * r]; });
    expect(() => detectFree(asFile(planesSolid(many)))).toThrow(/3 a 60/);
  });
  it('rebuilds the solid centred on its centre of mass, circumradius 0.85, with the numeral sized to the smallest face', () => {
    const { planes } = detectFree(asFile(prismTriangles(5, 1.4)));
    const { poly } = idealSolid('livre', planes);
    expect(Math.max(...poly.points.map((p) => Math.hypot(...p)))).toBeCloseTo(0.85, 5);
    expect(poly.faces).toHaveLength(7);
    expect(poly.readsDown).toBe(true);
    expect(poly.font).toBeGreaterThan(0);
    const mid = [0, 1, 2].map((k) => poly.points.reduce((s, p) => s + p[k], 0) / poly.points.length);
    expect(Math.hypot(...mid)).toBeLessThan(0.2);
  });
  it('puts the volume centroid (not the vertex mean) at the origin', () => {
    const cube: Vec3[] = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) cube.push([a, b, c]);
    const lopsided = hullTriangles([...cube, [2.2, 1, 0.5]]);
    const { poly } = idealSolid('livre', detectFree(asFile(lopsided)).planes);
    let vol = 0;
    const sum = [0, 0, 0];
    for (let i = 0; i < poly.triangles.length; i += 9) {
      const [a, b, c] = [0, 3, 6].map((k) => poly.triangles.slice(i + k, i + k + 3));
      const v = (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
      vol += v;
      for (let k = 0; k < 3; k++) sum[k] += (v * (a[k] + b[k] + c[k])) / 4;
    }
    sum.forEach((x) => expect(x / vol).toBeCloseTo(0, 5));
  });
  it('imports through importModel in free mode', async () => {
    const out = await importModel(stl(asFile(prismTriangles(5, 1.4))), 'stl', 'livre');
    expect(out.base).toBe('livre');
    expect(out.poly.faces).toHaveLength(7);
  });
});
