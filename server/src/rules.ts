import { BASE, KINDS, SIDES, type DieKind } from '../../src/dice/kinds.ts';
import { omenKind, omenOf, type OmenKind } from '../../src/dice/omen.ts';

export interface Die { kind: DieKind; value: number }

// What the server keeps of a throw is worked out from the dice themselves, with the game's own rules
// (shared with the front end), never taken from the client: the total (coins never add up) and the omen.
export function score(dice: Die[]): { total: number; omen: OmenKind | null } | { error: string } {
  const bad = dice.find((d) => !KINDS.includes(d.kind) || !Number.isInteger(d.value) || d.value < 1 || d.value > SIDES[BASE[d.kind]]);
  if (bad) return { error: `O dado ${bad.kind} não tem a face ${bad.value}.` };
  const omen = omenOf(dice.map((d) => d.kind), dice.map((d) => d.value));
  return { total: dice.reduce((sum, d) => (d.kind === 'coin' ? sum : sum + d.value), 0), omen: omen && omenKind(omen) };
}
