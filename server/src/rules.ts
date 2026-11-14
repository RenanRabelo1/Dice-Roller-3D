import { isCustom, omenKind, omenOf, tipoParaPresagio, total, valoresValidos, type CustomBase, type DieKind, type OmenKind } from '../../src/modules/regras/index.ts';

// An imported die: "custom:" and the id the browser gave it.
export const CUSTOM = '^custom:[A-Za-z0-9_-]{1,64}$';
// An imported die (kind "custom:<id>") also says which solid it is and whether it counts as a d20 for omens.
export interface Die { kind: DieKind; value: number; base?: CustomBase; omens?: boolean }

// What is kept of each die: an imported one with its solid and omen choice, a built-in one as it is.
const clean = ({ kind, value, base, omens }: Die): Die => (isCustom(kind) ? { kind, value, base, omens: tipoParaPresagio({ kind, base, omens }) === 'd20' } : { kind, value });

// What the server keeps of a throw is worked out from the dice themselves, with the game's own rules
// (shared with the front end), never taken from the client: the total (coins never add up) and the omen.
export function score(dice: Die[]): { dice: Die[]; total: number; omen: OmenKind | null } | { error: string } {
  // The values a die can show: its solid's 1..N, or the free-form range (the server does not know a free-form die's faces).
  const bad = dice.find((d) => { const r = valoresValidos(d); return !r || !Number.isInteger(d.value) || d.value < r[0] || d.value > r[1]; });
  if (bad) return { error: `O dado ${bad.kind} não tem a face ${bad.value}.` };
  // An imported d20 the player made count for omens is read as a d20; any other imported die never makes one.
  const omen = omenOf(dice.map(tipoParaPresagio), dice.map((d) => d.value));
  return { dice: dice.map(clean), total: total(dice), omen: omen && omenKind(omen) };
}
