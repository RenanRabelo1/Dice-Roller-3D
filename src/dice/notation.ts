import { KINDS, MAX_DICE, sortDice, type DieKind } from './polyhedra';

// What may follow the "d": longest first, so "d100" wins over "d10" + "0" and "d10vampiro" over "d10v".
const AFTER_D: [string, DieKind][] = [
  ['10vampiro', 'vtm'], ['10fome', 'hunger'], ['6fogo', 'fire'], ['10v', 'vtm'],
  ['100', 'd100'], ['20', 'd20'], ['12', 'd12'], ['10', 'd10'], ['8', 'd8'], ['6', 'd6'], ['4', 'd4'],
];
const FIREBALL = 'boladefogo'; // "bola de fogo": the spell's 8d6

const CUSTOM: Partial<Record<DieKind, string>> = { vtm: 'd10 Vampiro', hunger: 'd10 Fome', fire: 'd6 Fogo', coin: 'Moeda' };
export const dieName = (kind: DieKind): string => CUSTOM[kind] ?? kind;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "2d10 + 1d12" style notation for a selection (coins in words: "2 moedas").
export const formatDice = (dice: DieKind[]): string =>
  KINDS.filter((k) => dice.includes(k)).map((k) => {
    const n = dice.filter((d) => d === k).length;
    return k === 'coin' ? plural(n, 'moeda') : `${n}${dieName(k)}`;
  }).join(' + ');

// The result panel: the total sums the dice (coins never add up; a coins-only throw shows its faces),
// and with more than one die the detail lists each kind's values.
export function resultText(dice: DieKind[], results: number[]): { total: string; detail: string } {
  const face = (v: number) => (v === 1 ? 'Cara' : 'Coroa');
  const coins = results.filter((_, i) => dice[i] === 'coin');
  const heads = coins.filter((v) => v === 1).length, tails = coins.length - heads;
  const total = coins.length < results.length ? String(results.reduce((s, v, i) => (dice[i] === 'coin' ? s : s + v), 0))
    : coins.length === 1 ? face(coins[0])
      : [heads && plural(heads, 'cara'), tails && plural(tails, 'coroa')].filter(Boolean).join(', ');
  const detail = results.length < 2 ? '' : KINDS.filter((k) => dice.includes(k)).map((k) => {
    const values = results.filter((_, i) => dice[i] === k);
    return `${dieName(k)}: ${k === 'coin' ? values.map(face).join(', ') : values.join(' + ')}`;
  }).join(' · ');
  return { total, detail };
}

// Reads "2d10 + d100" or the compact "2d10d100d4" (spaces, "+" and case are ignored).
// Custom dice take a word after the die ("2d10v", "2d10vampiro", "2d10fome", "8d6fogo"); "bola de fogo" is 8d6fogo;
// coins are "moeda" / "2 moedas".
// When compact text is ambiguous ("2d102d4"), it backtracks to the reading where every die is real (2d10 + 2d4).
export function parseDice(text: string): { dice: DieKind[] } | { error: string } {
  const s = text.toLowerCase().replace(/[\s+]/g, '');
  if (!s) return { error: 'Escreva os dados, por exemplo 2d10 + d100.' };
  const read = (at: number): DieKind[] | null => {
    if (at === s.length) return [];
    if (s.startsWith(FIREBALL, at)) {
      const rest = read(at + FIREBALL.length);
      return rest && [...Array<DieKind>(8).fill('fire'), ...rest];
    }
    const coin = /^(\d*)moedas?/.exec(s.slice(at));
    if (coin) {
      const n = coin[1] ? Number(coin[1]) : 1, rest = n >= 1 ? read(at + coin[0].length) : null;
      return rest && [...Array<DieKind>(n).fill('coin'), ...rest];
    }
    const m = /^(\d*)d/.exec(s.slice(at));
    if (!m) return null;
    const count = m[1] ? Number(m[1]) : 1;
    if (count < 1) return null;
    const from = at + m[0].length;
    for (const [word, kind] of AFTER_D) {
      if (!s.startsWith(word, from)) continue;
      const rest = read(from + word.length);
      if (rest) return [...Array<DieKind>(count).fill(kind), ...rest];
    }
    return null;
  };
  const dice = read(0);
  if (!dice) return { error: `Não entendi "${text.trim()}". Use dados d4, d6, d8, d10, d12, d20 ou d100, como 2d10 + d100. Também valem 2d10v (Vampiro), 2d10fome, 8d6fogo, bola de fogo e moeda.` };
  if (dice.length > MAX_DICE) return { error: `São ${dice.length} dados; o máximo por arremesso é ${MAX_DICE}.` };
  return { dice: sortDice(dice) };
}
