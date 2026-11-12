import { customDie, customKind, customList, isCustom, type CustomDie } from './custom';
import { allKinds, baseOf, MAX_DICE, sortDice, type DieKind } from './polyhedra';

// What may follow the "d": longest first, so "d100" wins over "d10" + "0" and "d10vampiro" over "d10v".
const AFTER_D: [string, DieKind][] = [
  ['10vampiro', 'vtm'], ['10fome', 'hunger'], ['6fogo', 'fire'], ['10v', 'vtm'],
  ['100', 'd100'], ['20', 'd20'], ['12', 'd12'], ['10', 'd10'], ['8', 'd8'], ['6', 'd6'], ['4', 'd4'],
];
const FIREBALL = 'boladefogo'; // "bola de fogo": the spell's 8d6

const CUSTOM: Partial<Record<DieKind, string>> = { vtm: 'd10 Vampiro', hunger: 'd10 Fome', fire: 'd6 Fogo', coin: 'Moeda' };
export const dieName = (kind: DieKind): string => {
  if (isCustom(kind)) return baseOf(kind) === 'livre' ? customDie(kind)?.name ?? '?' : `${baseOf(kind)} ${customDie(kind)?.name ?? '?'}`; // "d20 Caveira", a free-form die only "Caveira"
  return CUSTOM[kind] ?? kind;
};

// The nickname an imported die answers to in the chat ("2d20caveira"): letters and digits, starting with a letter,
// and clear of the words the chat already reads.
const RESERVED = ['v', 'vampiro', 'fome', 'fogo', 'moeda', 'moedas', 'boladefogo'];
export function slugProblem(slug: string, others: CustomDie[] = customList()): string | null {
  if (!/^[a-z][a-z0-9]{0,15}$/.test(slug)) return 'O apelido usa só letras minúsculas e números sem acento, começa com letra e tem até 16 caracteres.';
  if (/^d\d/.test(slug) || RESERVED.includes(slug)) return 'Esse apelido já é uma palavra do chat. Escolha outro.';
  return others.some((d) => d.slug === slug) ? 'Já existe um dado com esse apelido.' : null;
}
// A name made into a nickname: "Caveira Rúnica" → "caveirarunica".
export const slugOf = (name: string): string => name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^[^a-z]+/, "").slice(0, 16);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "2d10 + 1d12" style notation for a selection (coins in words: "2 moedas").
export const formatDice = (dice: DieKind[]): string =>
  allKinds().filter((k) => dice.includes(k)).map((k) => {
    const n = dice.filter((d) => d === k).length;
    return k === 'coin' ? plural(n, 'moeda') : baseOf(k) === 'livre' ? `${n} ${dieName(k)}` : `${n}${dieName(k)}`;
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
  const detail = results.length < 2 ? '' : allKinds().filter((k) => dice.includes(k)).map((k) => {
    const values = results.filter((_, i) => dice[i] === k);
    return `${dieName(k)}: ${k === 'coin' ? values.map(face).join(', ') : values.join(' + ')}`;
  }).join(' · ');
  return { total, detail };
}

// Reads "2d10 + d100" or the compact "2d10d100d4" (spaces, "+" and case are ignored).
// Custom dice take a word after the die ("2d10v", "2d10vampiro", "2d10fome", "8d6fogo"); "bola de fogo" is 8d6fogo;
// coins are "moeda" / "2 moedas"; imported dice answer to their nickname ("2d20caveira").
// When compact text is ambiguous ("2d102d4"), it backtracks to the reading where every die is real (2d10 + 2d4).
export function parseDice(text: string, customs: CustomDie[] = customList()): { dice: DieKind[] } | { error: string } {
  const standard = customs.filter((d) => d.poly.shape !== 'livre');
  // A free-form die has no d-number: it answers to its nickname alone, like the coin ("caveira", "2caveira").
  const named = customs.filter((d) => d.poly.shape === 'livre').map((d): [string, DieKind] => [d.slug, customKind(d.id)]).sort((a, b) => b[0].length - a[0].length);
  const words = [...standard.map((d): [string, DieKind] => [`${d.poly.shape.slice(1)}${d.slug}`, customKind(d.id)]), ...AFTER_D].sort((a, b) => b[0].length - a[0].length);
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
    const lead = /^\d*/.exec(s.slice(at))![0];
    for (const [word, kind] of named) {
      if (!s.startsWith(word, at + lead.length)) continue;
      const n = lead ? Number(lead) : 1, rest = n >= 1 ? read(at + lead.length + word.length) : null;
      if (rest) return [...Array<DieKind>(n).fill(kind), ...rest];
    }
    const m = /^(\d*)d/.exec(s.slice(at));
    if (!m) return null;
    const count = m[1] ? Number(m[1]) : 1;
    if (count < 1) return null;
    const from = at + m[0].length;
    for (const [word, kind] of words) {
      if (!s.startsWith(word, from)) continue;
      const rest = read(from + word.length);
      if (rest) return [...Array<DieKind>(count).fill(kind), ...rest];
    }
    return null;
  };
  const dice = read(0);
  if (!dice) return { error: `Não entendi "${text.trim()}". Use dados d4, d6, d8, d10, d12, d20 ou d100, como 2d10 + d100. Também valem 2d10v (Vampiro), 2d10fome, 8d6fogo, bola de fogo e moeda${customs.length ? ` e seus dados importados (${customs.map((d) => (d.poly.shape === 'livre' ? `2${d.slug}` : `2d${d.poly.shape.slice(1)}${d.slug}`)).join(', ')})` : ''}.` };
  if (dice.length > MAX_DICE) return { error: `São ${dice.length} dados; o máximo por arremesso é ${MAX_DICE}.` };
  return { dice: sortDice(dice) };
}
