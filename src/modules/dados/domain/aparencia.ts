import type { Object3D } from 'three';
import { isCustom, type BuiltinKind, type DieKind, type Shape } from '../../regras/index.ts';
import type { CustomDie } from '../contracts.ts';
import { baseOf, customDie } from './catalogo.ts';

// How a kind shows: its gem colour, its numerals (font, size, colour), its display name and the player's model.
// Pure, no React: index.ts exposes it (ADR 0010).

// The player's model, parsed from the saved file. modelo.ts pulls the GLB/STL loaders, so it stays a separate chunk
// (ADR 0007, point 11): this import() is the only way in.
export const carregarModelo = (die: CustomDie): Promise<Object3D> => import('./modelo.ts').then((m) => m.modelObject(die));

// The scene's specified gem palette.
export const GEM: Record<BuiltinKind, string> = {
  d4: '#1F9D63', d6: '#C0182E', d8: '#1F4FB8', d10: '#E0A21B',
  d12: '#8B4FC9', d20: '#E8F1F8', d100: '#7FD3D8',
  vtm: '#231C20', hunger: '#8E0F1C', coin: '#C8962C',
};
// An imported die wears the colour the player picked (STL), or the gem colour of its base.
export const gemColor = (kind: DieKind): string => (isCustom(kind) ? customDie(kind)?.color ?? GEM[baseOf(kind) === 'livre' ? 'd20' : (baseOf(kind) as BuiltinKind)] : GEM[kind]);

export const FONT_URL = '/fonts/bricolage-grotesque-800.woff';
// Sized to each face: d4/d6 were right; the rest were crowding their faces.
export const FONT: Record<Shape, number> = { d4: 0.33, d6: 0.48, d8: 0.32, d10: 0.28, d12: 0.29, d20: 0.28, d100: 0.13, coin: 0.27, livre: 0.3 };
export const SYMBOL = 1.35; // height of a face symbol, in numeral font sizes

// Light gems (topaz, crystal, citrine) get dark numerals; dark gems keep gold.
export type NumeralInk = { color: string; outline?: string };
const DARK: NumeralInk = { color: '#1B1A16' }; // no outline: at this size a dark outline turns into noise
const INK: Partial<Record<string, NumeralInk>> = {
  d10: DARK, d20: DARK, d100: DARK,
  vtm: { color: '#C8102E' }, hunger: { color: '#0E0A0B' },
  coin: { color: '#4A2F06' }, // struck into the gold
};
const GOLD: NumeralInk = { color: '#D4A93F', outline: '#140E10' };
// The ink of the numerals we draw on a die of `kind`, whose solid has `shape`.
export const numeralInk = (kind: DieKind, shape: Shape): NumeralInk => INK[kind] ?? INK[shape] ?? GOLD;

const CUSTOM: Partial<Record<DieKind, string>> = { vtm: 'd10 Vampiro', hunger: 'd10 Fome', coin: 'Moeda' };
export const nomeDoTipo = (kind: DieKind): string => {
  if (isCustom(kind)) return baseOf(kind) === 'livre' ? customDie(kind)?.name ?? '?' : `${baseOf(kind)} ${customDie(kind)?.name ?? '?'}`; // "d20 Caveira", a free-form die only "Caveira"
  return CUSTOM[kind] ?? kind;
};
