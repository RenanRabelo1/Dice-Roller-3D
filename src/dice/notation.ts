import { KINDS, MAX_DICE, sortDice, type DieKind } from './polyhedra';

const SIDES = ['100', '20', '12', '10', '8', '6', '4']; // longest first, so "d100" wins over "d10" + "0"

// "2d10 + 1d12" style notation for a selection.
export const formatDice = (dice: DieKind[]): string =>
  KINDS.filter((k) => dice.includes(k)).map((k) => `${dice.filter((d) => d === k).length}${k}`).join(' + ');

// Reads "2d10 + d100" or the compact "2d10d100d4" (spaces, "+" and case are ignored).
// When compact text is ambiguous ("2d102d4"), it backtracks to the reading where every die is real (2d10 + 2d4).
export function parseDice(text: string): { dice: DieKind[] } | { error: string } {
  const s = text.toLowerCase().replace(/[\s+]/g, '');
  if (!s) return { error: 'Escreva os dados, por exemplo 2d10 + d100.' };
  const read = (at: number): DieKind[] | null => {
    if (at === s.length) return [];
    const m = /^(\d*)d/.exec(s.slice(at));
    if (!m) return null;
    const count = m[1] ? Number(m[1]) : 1;
    if (count < 1) return null;
    const from = at + m[0].length;
    for (const sides of SIDES) {
      if (!s.startsWith(sides, from)) continue;
      const rest = read(from + sides.length);
      if (rest) return [...Array<DieKind>(count).fill(`d${sides}` as DieKind), ...rest];
    }
    return null;
  };
  const dice = read(0);
  if (!dice) return { error: `Não entendi "${text.trim()}". Use dados d4, d6, d8, d10, d12, d20 ou d100, como 2d10 + d100.` };
  if (dice.length > MAX_DICE) return { error: `São ${dice.length} dados; o máximo por arremesso é ${MAX_DICE}.` };
  return { dice: sortDice(dice) };
}
