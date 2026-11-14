// Types of `dados`: the solid of a die, its numbering and labels, and an imported die.
import type { Vec3 } from '../../shared/math.ts';
import type { CustomBase, Shape } from '../regras/index.ts';

export type SymbolName = 'ankh' | 'crit' | 'skull' | 'fangs' | 'heads' | 'crown';

export interface Face { normal: Vec3; center: Vec3; value: number; readable?: boolean } // readable: counts as a result (free-form dice; missing = true)
export interface Top { dir: Vec3; value: number }
export interface Label { text: string; value: number; position: Vec3; normal: Vec3; up: Vec3; symbol?: SymbolName }
export interface Polyhedron {
  shape: Shape;
  radius: number;
  points: Vec3[];
  triangles: number[];
  faces: Face[];
  tops: Top[];
  labelList: Label[];
  readsDown?: boolean; // free-form die: read from the face it rests on
  font?: number; // numeral size when the faces differ (free-form dice)
}

// `numbering` overrides the default values (per face; d4: per vertex) and turns each numeral in steps of 360°/sides.
export interface Numbering { values?: number[]; turns?: number[] }

export type StdBase = Exclude<CustomBase, 'livre'>; // the d4–d20 bases

// Dice the player imported: a model file plus the polyhedron rebuilt from its face planes. Kept in memory by the
// catalogue (hydrated from IndexedDB by customStore.ts); polyhedron(kind) and the worker read the polyhedra through it.
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
