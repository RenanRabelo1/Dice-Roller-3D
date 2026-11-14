import { omenKind, omenOf, type DieKind } from '../../regras/index.ts';
import type { OmenTest } from '../contracts.ts';

// Whether a throw with these results plays that omen (with `kinds` from omenKinds). The biased pre-simulation of
// the dev test buttons keeps looking until it does (see presimulateFor).
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
