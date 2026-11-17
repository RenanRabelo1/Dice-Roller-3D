import { PRESETS, type PresetName, type TableTheme } from './tableTheme.ts';

export interface LuzDaMesa { cor: string; intensidade: number; tremor: boolean }

const PADRAO: LuzDaMesa = { cor: '#ff9a4a', intensidade: 6, tremor: true };
const PRESET: Record<PresetName, LuzDaMesa> = {
  taverna: { cor: '#ff9a4a', intensidade: 7, tremor: true },
  poquer: { cor: '#ffe2b0', intensidade: 5, tremor: false },
  cosmos: { cor: '#8fa8ff', intensidade: 3, tremor: false },
};

/** The candle's light, decided by the table's background. Derived, never saved in the theme. */
export function luzDaMesa(tema: TableTheme): LuzDaMesa {
  const b = tema.background;
  if (b.kind === 'preset') return PRESET[b.preset] ?? PADRAO;
  if (b.kind === 'image') return { cor: '#ffb070', intensidade: 5, tremor: true };
  if (b.kind === 'panorama') return { cor: '#ffd2a0', intensidade: 2, tremor: false }; // the HDRI already lights the scene
  return PADRAO;
}

/** Deterministic flicker (no Math.random, so captures and E2E repeat), between 0.7 and 1. */
export const tremorDaVela = (ms: number) => 0.85 + 0.15 * Math.sin(ms / 130) * Math.sin(ms / 310);

export const presetsSemLuz = () => (Object.keys(PRESETS) as PresetName[]).filter((p) => !(p in PRESET));
