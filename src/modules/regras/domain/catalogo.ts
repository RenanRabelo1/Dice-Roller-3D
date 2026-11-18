import type { BuiltinKind, CustomBase, CustomKind, Shape } from '../contracts.ts';

// Canonical order of the built-in kinds (the UI's order).
export const KINDS: BuiltinKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'vtm', 'hunger', 'coin'];
// The physical die behind each kind; Vampire: The Masquerade d10s share the d10 solid.
export const BASE: Record<BuiltinKind, Exclude<Shape, 'livre'>> = {
  d4: 'd4', d6: 'd6', d8: 'd8', d10: 'd10', d12: 'd12', d20: 'd20', d100: 'd100', vtm: 'd10', hunger: 'd10', coin: 'coin',
};
// The solids an imported die can be recognised as; 'livre' is a free-form die (any faces).
export const CUSTOM_BASES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'livre'] as const satisfies readonly CustomBase[];
// Values a free-form die can carry.
export const FREE_VALUES = { min: -99, max: 999 } as const;
// Highest result of each shape (a d10 reads 1-10; a coin is 1 heads, 2 tails).
export const SIDES: Record<Exclude<Shape, 'livre'>, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100, coin: 2 };
// Most dice in one throw.
export const MAX_DICE = 10;

export const isCustom = (kind: string): kind is CustomKind => kind.startsWith('custom:');
