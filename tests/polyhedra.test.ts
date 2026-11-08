import { describe, it, expect } from 'vitest';
import { polyhedron, bodiesFor, RADIUS, type Shape } from '../src/dice/polyhedra';
import { MAX_RADIUS } from '../src/physics/world';

const SIDES: Record<Shape, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
const SUM: Partial<Record<Shape, number>> = { d6: 7, d8: 9, d10: 9, d12: 13, d20: 21 };
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i);

describe.each(Object.keys(SIDES) as Shape[])('%s', (shape) => {
  const p = polyhedron(shape);
  it('has one face per side and each logical value once', () => {
    expect(p.faces).toHaveLength(SIDES[shape]);
    const values = (shape === 'd4' ? p.tops.map((t) => t.value) : p.faces.map((f) => f.value)).sort((a, b) => a - b);
    expect(values).toEqual(shape === 'd10' ? range(0, 10) : range(1, SIDES[shape]));
  });
  it('has unit outward normals and the configured circumradius', () => {
    p.faces.forEach((f) => { expect(Math.hypot(...f.normal)).toBeCloseTo(1, 6); expect(dot(f.normal, f.center)).toBeGreaterThan(0); });
    expect(Math.max(...p.points.map((v) => Math.hypot(...v)))).toBeCloseTo(RADIUS[shape], 6);
  });
  it('places every label on the face whose number it shows', () => {
    p.labelList.forEach((l) => {
      const f = p.faces.find((g) => dot(g.normal, l.normal) > 0.9999)!;
      expect(Math.abs(dot([l.position[0] - f.center[0], l.position[1] - f.center[1], l.position[2] - f.center[2]], f.normal))).toBeLessThan(1e-6);
      if (shape !== 'd4') expect(l.value).toBe(f.value);
    });
  });
  if (SUM[shape]) it('opposite faces sum like a real die', () => {
    p.faces.forEach((f) => {
      const o = p.faces.find((g) => dot(g.normal, f.normal) < -0.9999)!;
      expect(f.value + o.value).toBe(SUM[shape]);
    });
  });
});

describe('labels', () => {
  it('d4 draws each number on three faces', () => {
    const count = (v: number) => polyhedron('d4').labelList.filter((l) => l.value === v).length;
    expect([1, 2, 3, 4].map(count)).toEqual([3, 3, 3, 3]);
  });
  it('marks 6 and 9 only where both exist', () => {
    const texts = (s: Shape) => polyhedron(s).labelList.map((l) => l.text);
    for (const s of ['d10', 'd12', 'd20'] as Shape[]) expect(texts(s)).toEqual(expect.arrayContaining(['6.', '9.']));
    expect(texts('d6')).toContain('6');
    expect(texts('d8')).toContain('6');
  });
  it('tens d10 shows 00–90 over digits 0–9', () => {
    const t = polyhedron('d10', 'tens');
    expect(t.labelList.map((l) => l.text).sort()).toEqual(['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']);
    expect(t.faces.map((f) => f.value).sort((a, b) => a - b)).toEqual(range(0, 10));
  });
  it('d6 numbering is the documented one', () => {
    const at = (n: number[]) => polyhedron('d6').faces.find((f) => dot(f.normal, n) > 0.9999)!.value;
    expect([at([0, 1, 0]), at([0, -1, 0]), at([0, 0, -1]), at([0, 0, 1]), at([1, 0, 0]), at([-1, 0, 0])]).toEqual([1, 6, 2, 5, 3, 4]);
  });
  it('RADIUS and MAX_RADIUS agree', () => expect(Math.max(...Object.values(RADIUS))).toBe(MAX_RADIUS));
  it('bodiesFor expands d100 into tens and units pairs', () => {
    expect(bodiesFor('d100', 3)).toEqual(Array(3).fill(null).flatMap(() => [{ shape: 'd10', labels: 'tens' }, { shape: 'd10', labels: 'plain' }]));
    expect(bodiesFor('d20', 4)).toHaveLength(4);
  });
});
