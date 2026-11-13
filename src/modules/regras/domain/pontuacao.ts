import type { DieInput, DieKind, Shape } from '../contracts.ts';
import { BASE, FREE_VALUES, isCustom, KINDS, SIDES } from './catalogo.ts';

const shapeOf = (d: DieInput): Exclude<Shape, 'livre'> | undefined =>
  isCustom(d.kind) ? (d.base === 'livre' ? undefined : d.base) : (KINDS as string[]).includes(d.kind) ? BASE[d.kind as keyof typeof BASE] : undefined;

// The values a die can show: its solid's 1..N, or the free-form range; null for an imported die without a base.
export const valoresValidos = (d: DieInput): [number, number] | null => {
  if (isCustom(d.kind) && d.base === 'livre') return [FREE_VALUES.min, FREE_VALUES.max];
  const shape = shapeOf(d);
  return shape ? [1, SIDES[shape]] : null;
};

// Coins never add up (1 heads, 2 tails).
export const total = (dice: readonly (DieInput & { value: number })[]): number =>
  dice.reduce((sum, d) => (d.kind === 'coin' ? sum : sum + d.value), 0);

// An imported d20 the player made count for omens is read as a d20; any other imported die never makes one.
export const tipoParaPresagio = (d: DieInput): DieKind => (isCustom(d.kind) && d.base === 'd20' && d.omens === true ? 'd20' : d.kind);
