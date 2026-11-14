import { describe, expect, it } from 'vitest';
import { omenKind, omenOf, tipoParaPresagio } from '../index.ts';

describe('omenOf', () => {
  it('finds a critical on a d20 (20) and on a d100 (1)', () => {
    expect(omenOf(['d20', 'd6'], [20, 6])).toEqual({ crits: [0], fumbles: [] });
    expect(omenOf(['d6', 'd100'], [1, 1])).toEqual({ crits: [1], fumbles: [] });
  });

  it('finds a fumble on a d20 (1) and on a d100 (100)', () => {
    expect(omenOf(['d20'], [1])).toEqual({ crits: [], fumbles: [0] });
    expect(omenOf(['d100'], [100])).toEqual({ crits: [], fumbles: [0] });
  });

  it('gives nothing for other values and other dice', () => {
    expect(omenOf(['d20', 'd100', 'd12', 'd10'], [10, 50, 12, 1])).toBeNull();
  });

  it('recognises a d20 only by the literal kind', () => {
    expect(omenOf(['custom:a'], [20])).toBeNull();
  });

  it('counts an imported d20 once its kind is normalised', () => {
    const dice = [{ kind: 'custom:a', base: 'd20', omens: true, value: 20 }, { kind: 'custom:b', base: 'd20', value: 1 }] as const;
    expect(omenOf(dice.map(tipoParaPresagio), dice.map((d) => d.value))).toEqual({ crits: [0], fumbles: [] });
  });

  it('finds a fumble and duality on an imported d20 once its kind is normalised', () => {
    const fumble = [{ kind: 'custom:a', base: 'd20', omens: true, value: 1 }, { kind: 'custom:b', base: 'd20', value: 1 }] as const;
    expect(omenOf(fumble.map(tipoParaPresagio), fumble.map((d) => d.value))).toEqual({ crits: [], fumbles: [0] });
    const duality = [{ kind: 'custom:a', base: 'd20', omens: true, value: 20 }, { kind: 'd20', value: 1 }] as const;
    const o = omenOf(duality.map(tipoParaPresagio), duality.map((d) => d.value))!;
    expect(o).toEqual({ crits: [0], fumbles: [1] });
    expect(omenKind(o)).toBe('duality');
  });
});

describe('omenKind', () => {
  it('names crit, fumble and duality on d20 and d100', () => {
    expect(omenKind(omenOf(['d20'], [20])!)).toBe('crit');
    expect(omenKind(omenOf(['d100'], [100])!)).toBe('fumble');
    expect(omenKind(omenOf(['d20', 'd20'], [20, 1])!)).toBe('duality');
    expect(omenKind(omenOf(['d100', 'd100'], [1, 100])!)).toBe('duality');
    expect(omenKind(omenOf(['d20', 'd100', 'd20'], [20, 100, 20])!)).toBe('duality');
  });
});
