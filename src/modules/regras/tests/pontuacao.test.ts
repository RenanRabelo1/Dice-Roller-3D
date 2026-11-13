import { describe, expect, it } from 'vitest';
import { tipoParaPresagio, total, valoresValidos } from '../index.ts';

describe('valoresValidos', () => {
  it('goes from 1 to the sides of each built-in base', () => {
    expect(valoresValidos({ kind: 'd4' })).toEqual([1, 4]);
    expect(valoresValidos({ kind: 'd10' })).toEqual([1, 10]);
    expect(valoresValidos({ kind: 'd100' })).toEqual([1, 100]);
    expect(valoresValidos({ kind: 'vtm' })).toEqual([1, 10]);
    expect(valoresValidos({ kind: 'fire' })).toEqual([1, 6]);
    expect(valoresValidos({ kind: 'coin' })).toEqual([1, 2]);
  });

  it('uses the base of an imported die', () => {
    expect(valoresValidos({ kind: 'custom:a', base: 'd12' })).toEqual([1, 12]);
    expect(valoresValidos({ kind: 'custom:a', base: 'd10' })).toEqual([1, 10]);
  });

  it('gives the free-form range to a free-form die', () => {
    expect(valoresValidos({ kind: 'custom:a', base: 'livre' })).toEqual([-99, 999]);
  });

  it('rejects an imported die without a base, and an unknown kind', () => {
    expect(valoresValidos({ kind: 'custom:a' })).toBeNull();
    expect(valoresValidos({ kind: 'd3' as never })).toBeNull();
  });
});

describe('total', () => {
  it('adds the values and leaves coins out', () => {
    expect(total([{ kind: 'd6', value: 4 }, { kind: 'coin', value: 2 }, { kind: 'custom:a', value: -3 }, { kind: 'coin', value: 1 }])).toBe(1);
    expect(total([{ kind: 'coin', value: 2 }])).toBe(0);
    expect(total([])).toBe(0);
  });
});

describe('tipoParaPresagio', () => {
  it('reads an imported d20 as a d20 only when it opted in', () => {
    expect(tipoParaPresagio({ kind: 'custom:a', base: 'd20', omens: true })).toBe('d20');
    expect(tipoParaPresagio({ kind: 'custom:a', base: 'd20', omens: false })).toBe('custom:a');
    expect(tipoParaPresagio({ kind: 'custom:a', base: 'd20' })).toBe('custom:a');
  });

  it('never counts another imported base or a free-form die', () => {
    expect(tipoParaPresagio({ kind: 'custom:a', base: 'd12', omens: true })).toBe('custom:a');
    expect(tipoParaPresagio({ kind: 'custom:a', base: 'livre', omens: true })).toBe('custom:a');
  });

  it('keeps a built-in kind as it is', () => {
    expect(tipoParaPresagio({ kind: 'd20' })).toBe('d20');
    expect(tipoParaPresagio({ kind: 'd100', omens: true })).toBe('d100');
  });
});
