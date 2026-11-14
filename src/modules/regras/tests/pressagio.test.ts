import { describe, expect, it } from 'vitest';
import { omenKind, omenOf, tipoParaPresagio, type DieKind } from '../index.ts';

const d20 = (n: number) => Array<DieKind>(n).fill('d20');

describe('omenOf', () => {
  it.each([
    ['one 20 in 5d20 is a critical', d20(5), [3, 20, 7, 9, 11], { crits: [1], fumbles: [] }, 'crit'],
    ['one 1 in 5d20 is a fumble', d20(5), [3, 1, 7, 9, 11], { crits: [], fumbles: [1] }, 'fumble'],
    ['a 20 and a 1 is duality', d20(5), [20, 1, 7, 9, 11], { crits: [0], fumbles: [1] }, 'duality'],
    ['two fumbles and a critical is still duality', d20(3), [1, 20, 1], { crits: [1], fumbles: [0, 2] }, 'duality'],
    ['d100 1 is the Cthulhu critical', ['d100'], [1], { crits: [0], fumbles: [] }, 'crit'],
    ['critical on both a d20 and a d100', ['d20', 'd100'], [20, 1], { crits: [0, 1], fumbles: [] }, 'crit'],
    ['fumble on both', ['d20', 'd100'], [1, 100], { crits: [], fumbles: [0, 1] }, 'fumble'],
    ['one of each across d20 and d100', ['d20', 'd100'], [20, 100], { crits: [0], fumbles: [1] }, 'duality'],
  ] as [string, DieKind[], number[], object, string][])('%s', (_, dice, results, omen, kind) => {
    const o = omenOf(dice, results)!;
    expect(o).toEqual(omen);
    expect(omenKind(o)).toBe(kind);
  });

  it('only d20 and d100 count: other dice, Vampire d10s and coins never trigger one', () => {
    expect(omenOf(['d4', 'd6', 'd10', 'd12', 'vtm', 'hunger', 'fire', 'coin'], [1, 1, 10, 12, 10, 1, 6, 1])).toBeNull();
    expect(omenOf(d20(3), [2, 19, 10])).toBeNull();
    expect(omenOf(['d100'], [50])).toBeNull();
  });

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
