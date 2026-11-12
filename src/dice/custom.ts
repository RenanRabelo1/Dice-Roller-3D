import { Color } from 'three';
import type { Vec3 } from '../physics/world';
import { isCustom, omenD20s, type CustomBase, type CustomKind } from './kinds';
import type { Polyhedron, Shape } from './polyhedra';

export { isCustom };
export type { CustomBase, CustomKind };
export type StdBase = Exclude<CustomBase, 'livre'>; // the d4–d20 bases

// Dice the player imported: a model file plus the polyhedron rebuilt from its face planes. Kept in memory here
// (hydrated from IndexedDB by customStore.ts); polyhedra.ts and the worker read the polyhedra through this registry.
export interface CustomDie {
  version: 1;
  id: string;
  createdAt: number;
  name: string; slug: string; // "Caveira", "caveira"
  base: CustomBase;
  omens: boolean; // counts as a d20 for criticals (d20 base only)
  file: { format: 'stl' | 'glb'; name: string; bytes: ArrayBuffer };
  fit: { center: Vec3; scale: number }; // model point p sits at (p - center) * scale
  poly: Polyhedron; // the ideal solid, numbered; collider, faces and reading
  printed: boolean; // the model carries its own numerals: do not draw ours
  color: string | null; // gem colour for STL (no colours of its own)
  ink?: Ink; // paint in the engraved numerals (only if `printed`); missing = 'auto'
  finish?: Finish; // STL surface; missing = 'gema'
}

export type Ink = 'auto' | 'ouro' | 'escura' | 'branca' | 'nenhuma';
export type Finish = 'gema' | 'fosco';
export const INK_COLORS = { ouro: '#D4A93F', escura: '#1B1A16', branca: '#F2EEE4' } as const;

// The paint colour of a die's engraved numerals, or null when it has none (no engraving, or the player chose none).
// Automatic: dark ink on a light gem, gold on a dark one.
export function inkColorOf(die: Pick<CustomDie, 'printed' | 'ink'>, gem: string): string | null {
  const ink = die.ink ?? 'auto';
  if (!die.printed || ink === 'nenhuma') return null;
  if (ink !== 'auto') return INK_COLORS[ink];
  const c = new Color(gem); // linear sRGB
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b > 0.5 ? INK_COLORS.escura : INK_COLORS.ouro;
}
export const finishOf = (die: CustomDie): Finish => die.finish ?? 'gema';

const dice = new Map<CustomKind, CustomDie>();
const polys = new Map<CustomKind, Polyhedron>();

export const customKind = (id: string): CustomKind => `custom:${id}`;
export const customList = (): CustomDie[] => [...dice.values()];
export const customDie = (kind: CustomKind): CustomDie | undefined => dice.get(kind);
export const customPoly = (kind: CustomKind): Polyhedron | undefined => polys.get(kind);
export const customOrder = (kind: CustomKind): number => [...dice.keys()].indexOf(kind);
export const customBase = (kind: CustomKind): Shape | undefined => polys.get(kind)?.shape;

export function registerCustom(die: CustomDie): void {
  dice.set(customKind(die.id), die);
  polys.set(customKind(die.id), die.poly);
  if (die.base === 'd20' && die.omens) omenD20s.add(customKind(die.id)); else omenD20s.delete(customKind(die.id));
}
// The worker only needs the solid.
export const registerPoly = (kind: CustomKind, poly: Polyhedron): void => { polys.set(kind, poly); };
export function unregisterCustom(kind: CustomKind): void { dice.delete(kind); polys.delete(kind); omenD20s.delete(kind); }
