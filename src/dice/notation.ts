import { allKinds, nomeDoTipo } from '../modules/dados/index';
import { total as sumOf, type DieKind } from '../modules/regras/index.ts';

// ponte até a OS-0025: the notation lives in selecao.
export { formatDice, parseDice, slugOf, slugProblem } from '../modules/selecao/index';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The result panel: the total sums the dice (coins never add up; a coins-only throw shows its faces),
// and with more than one die the detail lists each kind's values.
export function resultText(dice: DieKind[], results: number[]): { total: string; detail: string } {
  const face = (v: number) => (v === 1 ? 'Cara' : 'Coroa');
  const coins = results.filter((_, i) => dice[i] === 'coin');
  const heads = coins.filter((v) => v === 1).length, tails = coins.length - heads;
  const total = coins.length < results.length ? String(sumOf(results.map((value, i) => ({ kind: dice[i], value }))))
    : coins.length === 1 ? face(coins[0])
      : [heads && plural(heads, 'cara'), tails && plural(tails, 'coroa')].filter(Boolean).join(', ');
  const detail = results.length < 2 ? '' : allKinds().filter((k) => dice.includes(k)).map((k) => {
    const values = results.filter((_, i) => dice[i] === k);
    return `${nomeDoTipo(k)}: ${k === 'coin' ? values.map(face).join(', ') : values.join(' + ')}`;
  }).join(' · ');
  return { total, detail };
}
