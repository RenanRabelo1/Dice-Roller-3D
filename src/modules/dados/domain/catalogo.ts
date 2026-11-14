import { BASE, isCustom, KINDS, tipoParaPresagio, type CustomKind, type DieKind, type Shape } from '../../regras/index.ts';
import type { CustomDie, Polyhedron } from '../contracts.ts';
import { build, SYMBOL } from './solidos.ts';

// The registry of imported dice (hydrated from IndexedDB by customStore.ts); the worker registers only the solids.
const dice = new Map<CustomKind, CustomDie>();
const polys = new Map<CustomKind, Polyhedron>();

export const customKind = (id: string): CustomKind => `custom:${id}`;
export const customList = (): CustomDie[] => [...dice.values()];
export const customDie = (kind: CustomKind): CustomDie | undefined => dice.get(kind);
const customPoly = (kind: CustomKind): Polyhedron | undefined => polys.get(kind);
const customOrder = (kind: CustomKind): number => [...dice.keys()].indexOf(kind);
const customBase = (kind: CustomKind): Shape | undefined => polys.get(kind)?.shape;

export function registerCustom(die: CustomDie): void {
  dice.set(customKind(die.id), die);
  polys.set(customKind(die.id), die.poly);
}
// The worker only needs the solid.
export const registerPoly = (kind: CustomKind, poly: Polyhedron): void => { polys.set(kind, poly); };
export function unregisterCustom(kind: CustomKind): void { dice.delete(kind); polys.delete(kind); }

const cache = new Map<DieKind, Polyhedron>();
export function polyhedron(kind: DieKind): Polyhedron {
  let p = cache.get(kind);
  if (!p) {
    if (isCustom(kind)) {
      p = customPoly(kind);
      if (!p) throw new Error(`unknown imported die ${kind}`);
      return p; // the registry owns it
    }
    const base = BASE[kind], symbol = SYMBOL[kind];
    p = base === kind ? build(base) : polyhedron(base);
    // One label per face even when blank, so the showcase still finds the rolled face by value.
    if (symbol) p = { ...p, labelList: p.labelList.map((l) => ({ ...l, text: '', symbol: symbol(l.value) })) };
    cache.set(kind, p);
  }
  return p;
}

// A mixed selection, one entry per die, kept in KINDS order (e.g. ['d10', 'd12', 'd12']).
// Imported dice come after the built-in ones, in the order they were created.
const rank = (k: DieKind) => (isCustom(k) ? KINDS.length + customOrder(k) : KINDS.indexOf(k));
export const sortDice = (dice: DieKind[]): DieKind[] => [...dice].sort((a, b) => rank(a) - rank(b));
// Every kind that can be in a selection, in display order.
export const allKinds = (): DieKind[] => [...KINDS, ...customList().map((d) => customKind(d.id))];
// The physical shape behind a kind (imported dice report the base they were recognised as).
export const baseOf = (kind: DieKind): Shape => (isCustom(kind) ? customBase(kind) ?? 'd20' : BASE[kind]);
// The solids of the imported dice in a selection, for the worker (which has no registry of its own).
export const customsOf = (dice: DieKind[]): Record<CustomKind, Polyhedron> =>
  Object.fromEntries(dice.filter(isCustom).map((k) => [k, polyhedron(k)])) as Record<CustomKind, Polyhedron>;
// The kind as the rules see it: an imported d20 the player made count for omens is a d20; anything else is itself.
export const paraRegras = (kind: DieKind): DieKind => tipoParaPresagio(isCustom(kind) ? { kind, ...customDie(kind) } : { kind });
