import { customDie, isCustom } from './custom';
import type { DieKind } from './polyhedra';

// An omen is the show a roll puts on before its result appears. A critical is a 20 on a d20, or a 1 on a
// d100 (Call of Cthulhu: low is good). A fumble is a 1 on a d20, or a 100 on a d100. One of each in the same
// throw is duality, however many of each there are. Only d20 and d100 count (and an imported d20 that opted in).
export interface Omen { crits: number[]; fumbles: number[] } // die indices
export type OmenKind = 'crit' | 'fumble' | 'duality';

// How long each show lasts (ms); the result waits for it.
export const OMEN_MS = { lightning: 1300, kraken: 5600, blood: 1700, duality: 2600 };
export const DUALITY_HIT = 1100; // when the two fish collide (and the screen shakes)

// A d20, or an imported d20-shaped die the player asked to count as one.
export const isD20 = (kind: DieKind): boolean => {
  if (!isCustom(kind)) return kind === 'd20';
  const die = customDie(kind);
  return die?.base === 'd20' && die.omens;
};

export function omenOf(dice: DieKind[], results: number[]): Omen | null {
  const pick = (d20: number, d100: number) =>
    results.flatMap((v, i) => ((isD20(dice[i]) && v === d20) || (dice[i] === 'd100' && v === d100) ? [i] : []));
  const crits = pick(20, 1), fumbles = pick(1, 100);
  return crits.length || fumbles.length ? { crits, fumbles } : null;
}

export const omenKind = (o: Omen): OmenKind => (o.crits.length && o.fumbles.length ? 'duality' : o.crits.length ? 'crit' : 'fumble');

export function omenMs(o: Omen, dice: DieKind[]): number {
  const kind = omenKind(o);
  if (kind === 'duality') return OMEN_MS.duality;
  if (kind === 'fumble') return OMEN_MS.blood;
  return o.crits.some((i) => dice[i] === 'd100') ? OMEN_MS.kraken : OMEN_MS.lightning;
}
