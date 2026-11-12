import { BASE, isCustom, FREE_VALUES, KINDS, SIDES, type CustomBase, type DieKind, type Shape } from '../../src/dice/kinds.ts';
import { omenKind, omenOf, type OmenKind } from '../../src/dice/omen.ts';

// An imported die: "custom:" and the id the browser gave it.
export const CUSTOM = '^custom:[A-Za-z0-9_-]{1,64}$';
// An imported die (kind "custom:<id>") also says which solid it is and whether it counts as a d20 for omens.
export interface Die { kind: DieKind; value: number; base?: CustomBase; omens?: boolean }

const shapeOf = (d: Die): Exclude<Shape, 'livre'> | undefined =>
  isCustom(d.kind) ? (d.base === 'livre' ? undefined : d.base) : (KINDS as string[]).includes(d.kind) ? BASE[d.kind as keyof typeof BASE] : undefined;
// The values a die can show: its solid's 1..N, or the free-form range (the server does not know a free-form die's faces).
const range = (d: Die): [number, number] | undefined => {
  if (isCustom(d.kind) && d.base === 'livre') return [FREE_VALUES.min, FREE_VALUES.max];
  const shape = shapeOf(d);
  return shape && [1, SIDES[shape]];
};
// What is kept of each die: an imported one with its solid and omen choice, a built-in one as it is.
const clean = ({ kind, value, base, omens }: Die): Die => (isCustom(kind) ? { kind, value, base, omens: base === 'd20' && omens === true } : { kind, value });

// What the server keeps of a throw is worked out from the dice themselves, with the game's own rules
// (shared with the front end), never taken from the client: the total (coins never add up) and the omen.
export function score(dice: Die[]): { dice: Die[]; total: number; omen: OmenKind | null } | { error: string } {
  const bad = dice.find((d) => { const r = range(d); return !r || !Number.isInteger(d.value) || d.value < r[0] || d.value > r[1]; });
  if (bad) return { error: `O dado ${bad.kind} não tem a face ${bad.value}.` };
  // An imported d20 the player made count for omens is read as a d20; any other imported die never makes one.
  const omen = omenOf(dice.map((d) => (isCustom(d.kind) && d.base === 'd20' && d.omens ? 'd20' : d.kind)), dice.map((d) => d.value));
  return { dice: dice.map(clean), total: dice.reduce((sum, d) => (d.kind === 'coin' ? sum : sum + d.value), 0), omen: omen && omenKind(omen) };
}
