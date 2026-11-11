import type { Vec3 } from '../physics/world';
import type { Polyhedron, Shape } from './polyhedra';

// Dice the player imported: a model file plus the polyhedron rebuilt from its face planes. Kept in memory here
// (hydrated from IndexedDB by customStore.ts); polyhedra.ts and the worker read the polyhedra through this registry.
export type CustomKind = `custom:${string}`;
export type CustomBase = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
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
}

const dice = new Map<CustomKind, CustomDie>();
const polys = new Map<CustomKind, Polyhedron>();

export const isCustom = (kind: string): kind is CustomKind => kind.startsWith('custom:');
export const customKind = (id: string): CustomKind => `custom:${id}`;
export const customList = (): CustomDie[] => [...dice.values()];
export const customDie = (kind: CustomKind): CustomDie | undefined => dice.get(kind);
export const customPoly = (kind: CustomKind): Polyhedron | undefined => polys.get(kind);
export const customOrder = (kind: CustomKind): number => [...dice.keys()].indexOf(kind);
export const customBase = (kind: CustomKind): Shape | undefined => polys.get(kind)?.shape;

export function registerCustom(die: CustomDie): void {
  dice.set(customKind(die.id), die);
  polys.set(customKind(die.id), die.poly);
}
// The worker only needs the solid.
export const registerPoly = (kind: CustomKind, poly: Polyhedron): void => { polys.set(kind, poly); };
export function unregisterCustom(kind: CustomKind): void { dice.delete(kind); polys.delete(kind); }
