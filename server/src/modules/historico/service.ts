import { isCustom, omenKind, omenOf, tipoParaPresagio, total, valoresValidos, type OmenKind } from '../../../../src/modules/regras/index.ts';
import type { DieIn, RollIn } from './contracts.ts';

// What is kept of each die: an imported one with its solid and omen choice, a built-in one as it is.
const clean = ({ kind, value, base, omens }: DieIn): DieIn => (isCustom(kind) ? { kind, value, base, omens: tipoParaPresagio({ kind, base, omens }) === 'd20' } : { kind, value });

// What the server keeps of a throw is worked out from the dice themselves, with the game's own rules
// (shared with the front end), never taken from the client: the total (coins never add up) and the omen.
export function score(dice: DieIn[]): { dice: DieIn[]; total: number; omen: OmenKind | null } | { error: string } {
  // The values a die can show: its solid's 1..N, or the free-form range (the server does not know a free-form die's faces).
  const bad = dice.find((d) => { const r = valoresValidos(d); return !r || !Number.isInteger(d.value) || d.value < r[0] || d.value > r[1]; });
  if (bad) return { error: `O dado ${bad.kind} não tem a face ${bad.value}.` };
  // An imported d20 the player made count for omens is read as a d20; any other imported die never makes one.
  const omen = omenOf(dice.map(tipoParaPresagio), dice.map((d) => d.value));
  return { dice: dice.map(clean), total: total(dice), omen: omen && omenKind(omen) };
}

// The record to save for a posted throw: its score, and no force (null) when the client sent none.
export function record({ playerId, dice, force }: RollIn) {
  const scored = score(dice);
  return 'error' in scored ? scored : { playerId, ...scored, force: force ?? null };
}
