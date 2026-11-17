import { describe, expect, it } from 'vitest';
import { luzDaMesa, presetsSemLuz, tremorDaVela } from '../domain/luz.ts';
import { DEFAULT_THEME, type Background, type TableTheme } from '../domain/tableTheme.ts';

const com = (background: Background): TableTheme => ({ ...DEFAULT_THEME, background });
const blob = new Blob(['x']);

describe('luzDaMesa', () => {
  it.each([
    [{ kind: 'color', color: '#112233' }, '#ff9a4a', 6, true],
    [{ kind: 'preset', preset: 'taverna' }, '#ff9a4a', 7, true],
    [{ kind: 'preset', preset: 'poquer' }, '#ffe2b0', 5, false],
    [{ kind: 'preset', preset: 'cosmos' }, '#8fa8ff', 3, false],
    [{ kind: 'image', image: blob, blur: 0, dim: 0 }, '#ffb070', 5, true],
    [{ kind: 'panorama', image: blob, format: 'ldr', rotation: 0, intensity: 1, blur: 0, reflect: true }, '#ffd2a0', 2, false],
  ] as [Background, string, number, boolean][])('%j', (bg, cor, intensidade, tremor) => {
    expect(luzDaMesa(com(bg))).toEqual({ cor, intensidade, tremor });
  });

  it('every preset has a row', () => expect(presetsSemLuz()).toEqual([]));
});

describe('tremorDaVela', () => {
  it('stays between 0.7 and 1', () => {
    for (let ms = 0; ms < 200_000; ms += 37) {
      const v = tremorDaVela(ms);
      expect(v).toBeGreaterThanOrEqual(0.7);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
