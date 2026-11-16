import { describe, expect, it } from 'vitest';
import { intensidadeDaCarga, LUZ_DA_CARGA } from '../domain/luz.ts';

describe('luz da carga', () => {
  it('é 0 fora de charging', () => {
    for (const f of ['hand', 'rolling', 'settled', 'returning'] as const) expect(intensidadeDaCarga(f, 1, false)).toBe(0);
  });
  it('é 0 no software', () => expect(intensidadeDaCarga('charging', 1, true)).toBe(0));
  it('cresce com a força', () => {
    expect(intensidadeDaCarga('charging', 0, false)).toBe(LUZ_DA_CARGA.base);
    expect(intensidadeDaCarga('charging', 0.5, false)).toBeGreaterThan(intensidadeDaCarga('charging', 0.2, false));
  });
  it('prende a força entre 0 e 1', () => {
    expect(intensidadeDaCarga('charging', 5, false)).toBe(intensidadeDaCarga('charging', 1, false));
    expect(intensidadeDaCarga('charging', -3, false)).toBe(intensidadeDaCarga('charging', 0, false));
  });
});
