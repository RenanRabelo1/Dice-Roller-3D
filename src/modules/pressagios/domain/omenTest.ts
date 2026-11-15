import { MAX_DICE, type DieKind } from '../../regras/index.ts';
import { sortDice } from '../../dados/index.ts';
import { omenKinds, type OmenTest } from '../../arremesso/index.ts';

// Test buttons (dev only): the next throws land on faces that call the chosen omen, so its animation can be
// seen at will. The roll stays real physics; only its random spin is picked (see presimulateFor, and `plays` in arremesso).
export const OMEN_TESTS: { id: OmenTest; name: string; face: string }[] = [
  { id: 'lightning', name: 'Raio', face: 'd20 = 20' },
  { id: 'fire', name: 'Fogo', face: 'd20 = 1' },
  { id: 'kraken', name: 'Kraken', face: 'd100 = 1' },
  { id: 'storm', name: 'Tempestade', face: 'd100 = 100' },
  { id: 'duality', name: 'Dualidade', face: 'um crítico e uma falha' },
];

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
