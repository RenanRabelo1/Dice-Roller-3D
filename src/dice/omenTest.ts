import { MAX_DICE, omenKind, omenOf, type DieKind } from '../modules/regras/index.ts';
import { isD20 } from './omen';
import { sortDice } from '../modules/dados/index.ts';

// Test buttons (dev only): the next throws land on faces that call the chosen omen, so its animation can be
// seen at will. The roll stays real physics; only its random spin is picked (see presimulateFor).
export type OmenTest = 'lightning' | 'fire' | 'kraken' | 'storm' | 'duality';
export const OMEN_TESTS: { id: OmenTest; name: string; face: string }[] = [
  { id: 'lightning', name: 'Raio', face: 'd20 = 20' },
  { id: 'fire', name: 'Fogo', face: 'd20 = 1' },
  { id: 'kraken', name: 'Kraken', face: 'd100 = 1' },
  { id: 'storm', name: 'Tempestade', face: 'd100 = 100' },
  { id: 'duality', name: 'Dualidade', face: 'um crítico e uma falha' },
];

// The selection as the omen rules read it: an imported d20 that counts for omens is a d20. The worker has no
// registry of imported dice, so it gets this instead.
export const omenKinds = (dice: DieKind[]): DieKind[] => dice.map((k) => (isD20(k) ? 'd20' : k));

// Whether a throw with these results plays that omen (with `kinds` from omenKinds).
export function plays(test: OmenTest, kinds: DieKind[], results: number[]): boolean {
  const o = omenOf(kinds, results);
  if (!o) return false;
  const kind = omenKind(o), has = (list: number[], die: DieKind) => list.some((i) => kinds[i] === die);
  switch (test) {
    case 'lightning': return kind === 'crit' && has(o.crits, 'd20');
    case 'fire': return kind === 'fumble' && has(o.fumbles, 'd20');
    case 'kraken': return kind === 'crit' && has(o.crits, 'd100');
    case 'storm': return kind === 'fumble' && has(o.fumbles, 'd100');
    case 'duality': return kind === 'duality';
  }
}

// The selection with the dice the test needs added if missing: a d20 (lightning, fire), a d100 (kraken, storm),
// or two dice that can call an omen (duality). A hand with no room left gets just the dice the test needs.
export function withDiceFor(test: OmenTest, dice: DieKind[]): DieKind[] {
  const kinds = omenKinds(dice);
  const missing: DieKind[] = test === 'kraken' || test === 'storm' ? (kinds.includes('d100') ? [] : ['d100'])
    : test === 'duality' ? Array<DieKind>(Math.max(0, 2 - kinds.filter((k) => k === 'd20' || k === 'd100').length)).fill('d20')
      : kinds.includes('d20') ? [] : ['d20'];
  if (!missing.length) return dice;
  if (dice.length + missing.length > MAX_DICE) return withDiceFor(test, []);
  return sortDice([...dice, ...missing]);
}
