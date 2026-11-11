import { describe, it, expect } from 'vitest';
import { polyhedron, sortDice, RADIUS, KINDS, type Shape } from '../src/dice/polyhedra';
import { MAX_RADIUS } from '../src/physics/world';

const SIDES: Record<Shape, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100, coin: 2 };
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
  it('d100 is one solid of 100 near-equal faces numbered 1-100', () => {
    const p = polyhedron('d100');
    const inradius = p.faces.map((f) => Math.hypot(...f.center));
    expect(Math.min(...inradius) / Math.max(...inradius)).toBeGreaterThan(0.97); // every face about equally far from the centre
    expect(p.labelList.map((l) => l.text)).toEqual(expect.arrayContaining(['1', '6.', '9.', '50', '100']));
  });
  it('d6 numbering is the documented one', () => {
    const at = (n: number[]) => polyhedron('d6').faces.find((f) => dot(f.normal, n) > 0.9999)!.value;
    expect([at([0, 1, 0]), at([0, -1, 0]), at([0, 0, -1]), at([0, 0, 1]), at([1, 0, 0]), at([-1, 0, 0])]).toEqual([1, 6, 2, 5, 3, 4]);
  });
  it('RADIUS and MAX_RADIUS agree', () => expect(Math.max(...Object.values(RADIUS))).toBe(MAX_RADIUS));
  it('sortDice keeps a mixed selection in d4-d100 order', () => {
    expect(sortDice(['d100', 'd12', 'd4', 'd12', 'd10'])).toEqual(['d4', 'd10', 'd12', 'd12', 'd100']);
  });
});

describe('custom dice', () => {
  // Symbol drawn on the face of each d10 digit, 1…9 then 0 (the 10).
  const symbols = (kind: 'vtm' | 'hunger') => [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((v) => polyhedron(kind).labelList.find((l) => l.value === v)!.symbol);
  it('the Vampire d10 is a d10 body: same faces and values, one label per face', () => {
    for (const kind of ['vtm', 'hunger'] as const) {
      const p = polyhedron(kind), base = polyhedron('d10');
      expect(p.shape).toBe('d10');
      expect(p.faces).toBe(base.faces);
      expect(p.points).toBe(base.points);
      expect(p.labelList.map((l) => [l.value, l.position, l.normal])).toEqual(base.labelList.map((l) => [l.value, l.position, l.normal]));
    }
  });
  it('normal Vampire die: 1-5 blank, 6-9 ankh, 10 critical', () => {
    expect(symbols('vtm')).toEqual([...Array(5).fill(undefined), 'ankh', 'ankh', 'ankh', 'ankh', 'crit']);
  });
  it('Hunger die: 1 skull, 2-5 blank, 6-9 ankh, 10 fangs', () => {
    expect(symbols('hunger')).toEqual(['skull', ...Array(4).fill(undefined), 'ankh', 'ankh', 'ankh', 'ankh', 'fangs']);
  });
  it('Vampire faces carry no digits, standard faces no symbols', () => {
    expect(polyhedron('vtm').labelList.every((l) => l.text === '')).toBe(true);
    expect(polyhedron('d10').labelList.every((l) => l.symbol === undefined && l.text !== '')).toBe(true);
  });
  it('the Fireball d6 is the d6 itself, numbers and all', () => {
    const p = polyhedron('fire'), base = polyhedron('d6');
    expect(p.shape).toBe('d6');
    expect(p.faces).toBe(base.faces);
    expect(p.labelList).toEqual(base.labelList);
  });
  it('custom dice come after the standard ones, in the UI and in a sorted hand', () => {
    expect(KINDS).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'vtm', 'hunger', 'fire', 'coin']);
    expect(sortDice(['fire', 'hunger', 'd100', 'vtm', 'd4'])).toEqual(['d4', 'd100', 'vtm', 'hunger', 'fire']);
  });
});

describe('coin', () => {
  const p = polyhedron('coin');
  it('is a thin disc whose only readable faces are heads (up) and tails (down)', () => {
    expect(p.faces.map((f) => [f.normal, f.value])).toEqual([[[0, 1, 0], 1], [[0, -1, 0], 2]]);
    const ys = p.points.map((v) => v[1]), rim = Math.max(...p.points.map((v) => Math.hypot(v[0], v[2])));
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.25 * rim);
    expect(p.points.length).toBeGreaterThanOrEqual(48); // round enough to read as a coin
  });
  it('has face and crown drawings, with text reserved for the raised result', () => {
    expect(p.labelList.map((l) => [l.value, l.symbol, l.text])).toEqual([[1, 'heads', 'Cara'], [2, 'crown', 'Coroa']]);
  });
  it('sorts after the dice', () => expect(sortDice(['coin', 'd20', 'fire'])).toEqual(['d20', 'fire', 'coin']));
});
