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
  { id: 'par-de-criticos', name: 'Par de críticos', face: 'd10 Vampiro = 10 ×2' },
  { id: 'critico-bestial', name: 'Crítico bestial', face: 'd10 Fome = 10' },
  { id: 'falha-bestial', name: 'Falha bestial', face: 'd10 Fome = 1' },
];

// Add the dice the test needs. A hand with no room left gets just the required dice.
export function withDiceFor(test: OmenTest, dice: DieKind[]): DieKind[] {
  const kinds = omenKinds(dice);
  const missing = (kind: DieKind, count: number, existing = kinds.filter((k) => k === kind).length) =>
    Array<DieKind>(Math.max(0, count - existing)).fill(kind);
  const needed = (() => {
    switch (test) {
      case 'kraken': case 'storm': return missing('d100', 1);
      case 'duality': return missing('d20', 2, kinds.filter((k) => k === 'd20' || k === 'd100').length);
      case 'par-de-criticos': return missing('vtm', 2);
      case 'critico-bestial': case 'falha-bestial': return missing('hunger', 1);
      default: return missing('d20', 1);
    }
  })();
  if (!needed.length) return dice;
  if (dice.length + needed.length > MAX_DICE) return withDiceFor(test, []);
  return sortDice([...dice, ...needed]);
}
