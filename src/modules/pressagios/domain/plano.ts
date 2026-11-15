import { omenKind, type DieKind, type Omen } from '../../regras/index.ts';
import type { PlanoDoPresagio } from '../contracts.ts';
import { isD20, omenMs } from './omen.ts';
import { krakenIndices, stormIndices } from './krakenMotion.ts';
import { fireIndices } from './fireMotion.ts';

// Which effect plays on which die, in one place: lightning on each d20 of a crit, the kraken on a d100 crit, the storm
// on a d100 fumble, fire on a d20 fumble; a duality plays only the fish. The 3D scene and the HTML layer read it.
export function planoDoPresagio(omen: Omen | null, dice: DieKind[]): PlanoDoPresagio {
  if (!omen) return { kind: null, raios: [], kraken: [], tempestade: [], fogo: [], ms: 0 };
  const kind = omenKind(omen);
  return {
    kind,
    raios: kind === 'crit' ? omen.crits.filter((i) => isD20(dice[i])) : [],
    kraken: krakenIndices(omen, dice),
    tempestade: stormIndices(omen, dice),
    fogo: fireIndices(omen, dice),
    ms: omenMs(omen, dice),
  };
}
