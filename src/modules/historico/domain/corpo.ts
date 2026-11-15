// The body of each die sent to the history API: the throw's kinds joined with its results, read through the dados door.
import { customDie } from '../../dados/index.ts';
import type { DieIn } from '../api.ts';
import { isCustom, type DieKind } from '../../regras/index.ts';

// An imported die also says which solid it is and whether it counts as a d20, so the server can check and score it.
export const corpoDosDados = (dice: DieKind[], results: number[]): DieIn[] => dice.map((kind, i) => {
  const die = isCustom(kind) ? customDie(kind) : undefined;
  return die ? { kind, value: results[i], base: die.base, omens: die.omens } : { kind, value: results[i] };
});
