// ponte até a fase 6: historico assina arremesso.resultadoPublicado
// Lives in the shell because it reads the legacy registry of imported dice, which an extracted module may not import.
import { customDie } from '../dice/custom';
import type { DieIn } from '../modules/historico/index.ts';
import { isCustom, type DieKind } from '../modules/regras/index.ts';

// An imported die also says which solid it is and whether it counts as a d20, so the server can check and score it.
export const corpoDosDados = (dice: DieKind[], results: number[]): DieIn[] => dice.map((kind, i) => {
  const die = isCustom(kind) ? customDie(kind) : undefined;
  return die ? { kind, value: results[i], base: die.base, omens: die.omens } : { kind, value: results[i] };
});
