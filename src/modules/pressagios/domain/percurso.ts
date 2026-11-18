import type { DieKind, Omen, PresagioVampiro } from '../../regras/index.ts';
import type { Pose, Vec3 } from '../../../shared/math.ts';
import type { MovimentoNoPresagio } from '../contracts.ts';
import { KRAKEN, krakenAt, krakenDieAt, krakenIndices, STORM, stormAt, stormDieAt, stormIndices } from './krakenMotion.ts';
import { vampiroDieAt } from './vampiroMotion.ts';

// The dice the omen carries itself instead of the ordinary flight: the d100 the kraken grabs, and the one the storm drifts.
export const indicesComPercurso = (omen: Omen | null, dice: DieKind[], vampiro: PresagioVampiro | null = null) =>
  ({ kraken: krakenIndices(omen, dice), tempestade: stormIndices(omen, dice), vampiro: omen ? null : vampiro });

// Where die `i` is `ms` into the omen, between its landing pose `de` and its result pose `para`, and how much of its
// number shows on its face; with when its shadow goes (the grab, or the storm's approach) and when the path ends.
// Null when the omen does not move it.
export function movimentoNoPresagio(i: number, ms: number, de: Pose, para: Pose, kraken: number[], tempestade: number[], vampiro: PresagioVampiro | null = null, camera?: Vec3): MovimentoNoPresagio | null {
  if (kraken.includes(i)) return { pose: krakenDieAt(ms, de, para), revela: krakenAt(ms).reveal, sombra: KRAKEN.grab, fim: KRAKEN.duration };
  if (tempestade.includes(i)) return { pose: stormDieAt(ms, de, para), revela: stormAt(ms).reveal, sombra: STORM.approach, fim: STORM.duration };
  if (vampiro) {
    const slot = vampiro.dados.indexOf(i);
    if (slot !== -1) return vampiroDieAt(vampiro.tipo, slot, ms, de, para, camera);
  }
  return null;
}
