import type { DieKind, Omen } from '../../regras/index.ts';
import type { Pose } from '../../../shared/math.ts';
import type { MovimentoNoPresagio } from '../contracts.ts';
import { krakenAt, krakenDieAt, krakenIndices, stormAt, stormDieAt, stormIndices } from './krakenMotion.ts';

// The dice the omen carries itself instead of the ordinary flight: the d100 the kraken grabs, and the one the storm drifts.
export const indicesComPercurso = (omen: Omen | null, dice: DieKind[]) =>
  ({ kraken: krakenIndices(omen, dice), tempestade: stormIndices(omen, dice) });

// Where die `i` is `ms` into the omen, between its landing pose `de` and its result pose `para`, and how much of its
// number shows on its face. Null when the omen does not move it.
export function movimentoNoPresagio(i: number, ms: number, de: Pose, para: Pose, kraken: number[], tempestade: number[]): MovimentoNoPresagio | null {
  if (kraken.includes(i)) return { pose: krakenDieAt(ms, de, para), revela: krakenAt(ms).reveal };
  if (tempestade.includes(i)) return { pose: stormDieAt(ms, de, para), revela: stormAt(ms).reveal };
  return null;
}
