import type { DieKind, Omen, OmenKind, PresagioVampiro } from '../contracts.ts';

// A critical is a 20 on a d20, or a 1 on a d100 (Call of Cthulhu: low is good). A fumble is a 1 on a d20, or a
// 100 on a d100. One of each in the same throw is duality. A d20 is only the literal 'd20': callers normalise
// imported dice with tipoParaPresagio first.
export function omenOf(kinds: readonly DieKind[], results: readonly number[]): Omen | null {
  const pick = (d20: number, d100: number) =>
    results.flatMap((v, i) => ((kinds[i] === 'd20' && v === d20) || (kinds[i] === 'd100' && v === d100) ? [i] : []));
  const crits = pick(20, 1), fumbles = pick(1, 100);
  return crits.length || fumbles.length ? { crits, fumbles } : null;
}

export const omenKind = (o: Omen): OmenKind => (o.crits.length && o.fumbles.length ? 'duality' : o.crits.length ? 'crit' : 'fumble');

export function presagioVampiro(kinds: readonly DieKind[], results: readonly number[]): PresagioVampiro | null {
  if (omenOf(kinds, results)) return null;

  const bestial = results.findIndex((value, i) => kinds[i] === 'hunger' && value === 10);
  if (bestial !== -1) return { tipo: 'critico-bestial', dados: [bestial] };

  const crits = results.flatMap((value, i) => kinds[i] === 'vtm' && value === 10 ? [i] : []);
  if (crits.length >= 2) return { tipo: 'par-de-criticos', dados: crits.slice(0, 2) };

  const failure = results.findIndex((value, i) => kinds[i] === 'hunger' && value === 1);
  return failure === -1 ? null : { tipo: 'falha-bestial', dados: [failure] };
}
