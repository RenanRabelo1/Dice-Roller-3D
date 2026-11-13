import { describe, expect, it } from 'vitest';
import { BASE, CUSTOM_BASES, FREE_VALUES, isCustom, KINDS, MAX_DICE, SIDES } from '../index.ts';

describe('catalog', () => {
  it('lists the built-in kinds in UI order', () => {
    expect(KINDS).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'vtm', 'hunger', 'fire', 'coin']);
  });

  it('maps each built-in kind to its physical die', () => {
    expect([BASE.vtm, BASE.hunger, BASE.fire, BASE.d100, BASE.coin]).toEqual(['d10', 'd10', 'd6', 'd100', 'coin']);
  });

  it('never imports a d100 or a coin', () => {
    expect(CUSTOM_BASES).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'livre']);
  });

  it('knows sides, free range and the dice limit', () => {
    expect([SIDES.d10, SIDES.d100, SIDES.coin]).toEqual([10, 100, 2]);
    expect(FREE_VALUES).toEqual({ min: -99, max: 999 });
    expect(MAX_DICE).toBe(10);
  });

  it('tells an imported kind apart', () => {
    expect(isCustom('custom:abc')).toBe(true);
    expect(isCustom('d20')).toBe(false);
  });
});
