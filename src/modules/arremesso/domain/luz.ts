import type { Phase } from '../contracts.ts';

// The warm light over the aim while charging (HUD imersivo, part 2). Pure: the scene only reads it.
export const LUZ_DA_CARGA = { cor: '#ffb06a', base: 2, ganho: 10, altura: 1.5, alcance: 6 } as const;

// 0 outside `charging` and on the software renderer; the light stays mounted (the light count never changes).
export const intensidadeDaCarga = (fase: Phase, forca: number, software: boolean): number =>
  fase === 'charging' && !software ? LUZ_DA_CARGA.base + LUZ_DA_CARGA.ganho * Math.min(1, Math.max(0, forca)) : 0;
