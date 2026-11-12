// The look of the table and the backdrop. Pure data + validation: nothing here touches physics or results.
export type FeltTexture = 'liso' | 'veludo' | 'couro' | { image: Blob; tile: number };
export type PresetName = 'taverna' | 'poquer' | 'cosmos';
export type Background =
  | { kind: 'color'; color: string }
  | { kind: 'preset'; preset: PresetName }
  | { kind: 'image'; image: Blob; blur: number; dim: number }
  | { kind: 'panorama'; image: Blob; format: PanoramaFormat; rotation: number; intensity: number; blur: number; reflect: boolean };
export type PanoramaFormat = 'ldr' | 'hdr';
export interface TableTheme {
  version: 1;
  id: string; name: string; createdAt: number;
  background: Background;
  felt: { color: string; texture: FeltTexture };
  wood: { color: string };
  model: { name: string; bytes: ArrayBuffer } | null; // an imported .glb table (the look comes from the file)
}

export const DEFAULT_ID = 'padrao';
export const DEFAULT_THEME: TableTheme = {
  version: 1, id: DEFAULT_ID, name: 'Mesa padrão', createdAt: 0,
  background: { kind: 'color', color: '#140E10' },
  felt: { color: '#3A0F1A', texture: 'liso' }, wood: { color: '#3B2416' }, model: null,
};

// Ready-made backdrops are CSS gradients: no image files in the repository.
export const PRESETS: Record<PresetName, { label: string; css: string }> = {
  taverna: { label: 'Taverna', css: 'radial-gradient(ellipse at 50% 30%, #6B3F1D 0%, #3A2010 45%, #150A05 100%)' },
  poquer: { label: 'Pôquer', css: 'radial-gradient(ellipse at 50% 40%, #1F7A4A 0%, #0F4A2C 55%, #04180D 100%)' },
  cosmos: { label: 'Cosmos', css: 'radial-gradient(ellipse at 30% 25%, #2B2A6B 0%, #120F33 50%, #04030F 100%), #04030F' },
};

export const LIMITS = {
  photoBytes: 15 * 1024 * 1024, photoPx: 4096, texturePx: 2048,
  tableBytes: 20 * 1024 * 1024, tableTriangles: 100_000, blur: 20, dim: 60, tile: [0.5, 8] as const,
  panoramaBytes: 15 * 1024 * 1024, panoramaHdrBytes: 25 * 1024 * 1024, panoramaPx: 4096,
  intensity: [0.3, 1.5] as const, panoramaBlur: 0.4,
};

export const isHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
export const clampBlur = (v: number) => clamp(v, 0, LIMITS.blur);
export const clampDim = (v: number) => clamp(v, 0, LIMITS.dim);
export const clampRotation = (v: number) => Math.round(clamp(v, 0, 359));
export const clampIntensity = (v: number) => clamp(v, LIMITS.intensity[0], LIMITS.intensity[1]);
export const clampPanoramaBlur = (v: number) => clamp(v, 0, LIMITS.panoramaBlur);
export const clampTile = (v: number) => clamp(v, LIMITS.tile[0], LIMITS.tile[1]);

// null when the theme is usable, else a pt-BR reason.
export function checkTheme(t: TableTheme): string | null {
  if (t.version !== 1) return 'Mesa de uma versão que este app não conhece.';
  if (!isHex(t.felt.color) || !isHex(t.wood.color)) return 'Cor inválida.';
  const b = t.background;
  if (b.kind === 'color' && !isHex(b.color)) return 'Cor de fundo inválida.';
  if (b.kind === 'preset' && !(b.preset in PRESETS)) return 'Tema de fundo desconhecido.';
  if (b.kind === 'image' && (b.blur !== clampBlur(b.blur) || b.dim !== clampDim(b.dim))) return 'Desfoque ou escurecer fora dos limites.';
  if (b.kind === 'panorama') {
    const ok = (b.format === 'ldr' || b.format === 'hdr') && typeof b.reflect === 'boolean'
      && b.rotation === clampRotation(b.rotation) && b.intensity === clampIntensity(b.intensity) && b.blur === clampPanoramaBlur(b.blur);
    if (!ok) return 'Ajustes do fundo 360° fora dos limites.';
  }
  if (typeof t.felt.texture === 'object' && t.felt.texture.tile !== clampTile(t.felt.texture.tile)) return 'Tamanho da textura fora dos limites.';
  return null;
}

// The part of a theme that rides in the .glb's `extras` (images travel as the file's own textures).
export interface ThemeExtras {
  version: 1; name: string;
  background: { kind: 'color'; color: string } | { kind: 'preset'; preset: PresetName } | { kind: 'image'; blur: number; dim: number }
    | { kind: 'panorama'; format: PanoramaFormat; rotation: number; intensity: number; blur: number; reflect: boolean };
  felt: { color: string; texture: 'liso' | 'veludo' | 'couro' | 'imagem'; tile: number };
  wood: { color: string };
}
export const EXTRAS_KEY = 'diceRollerTable';

export function extrasOf(t: TableTheme): ThemeExtras {
  const b = t.background, tx = t.felt.texture;
  return {
    version: 1, name: t.name,
    background: b.kind === 'image' ? { kind: 'image', blur: b.blur, dim: b.dim }
      : b.kind === 'panorama' ? { kind: 'panorama', format: b.format, rotation: b.rotation, intensity: b.intensity, blur: b.blur, reflect: b.reflect }
      : b,
    felt: { color: t.felt.color, texture: typeof tx === 'object' ? 'imagem' : tx, tile: typeof tx === 'object' ? tx.tile : 2 },
    wood: { color: t.wood.color },
  };
}

// Reads extras back with every field checked; anything off yields null and the caller warns "theme missing".
export function readExtras(x: unknown): ThemeExtras | null {
  const e = x as Partial<ThemeExtras> | null | undefined;
  if (!e || typeof e !== 'object' || e.version !== 1 || typeof e.name !== 'string') return null;
  const b = e.background, f = e.felt;
  if (!b || !f || !e.wood || !isHex(e.wood.color) || !isHex(f.color)) return null;
  if (!['liso', 'veludo', 'couro', 'imagem'].includes(f.texture)) return null;
  const background = b.kind === 'color' ? (isHex(b.color) ? b : null)
    : b.kind === 'preset' ? (b.preset in PRESETS ? b : null)
    : b.kind === 'image' ? { kind: 'image' as const, blur: clampBlur(b.blur), dim: clampDim(b.dim) }
    : b.kind === 'panorama' ? { kind: 'panorama' as const, format: b.format === 'hdr' ? 'hdr' as const : 'ldr' as const, rotation: clampRotation(b.rotation), intensity: clampIntensity(b.intensity), blur: clampPanoramaBlur(b.blur), reflect: b.reflect !== false } : null;
  if (!background) return null;
  return { version: 1, name: e.name.slice(0, 40), background, felt: { color: f.color, texture: f.texture, tile: clampTile(f.tile) }, wood: { color: e.wood.color } };
}

export const fileSafe = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mesa';
