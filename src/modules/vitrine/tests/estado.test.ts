import { describe, it, expect, afterEach } from 'vitest';
import { setShowcased, vitrine, vitrineConcluida } from '../index.ts';

afterEach(() => setShowcased(0));

describe('vitrineConcluida', () => {
  it('começa sem nenhum arremesso mostrado', () => {
    expect(vitrine().showcased).toBe(0);
    expect(vitrineConcluida(1)).toBe(false);
  });

  it('é verdadeira só para o throwId que terminou o voo', () => {
    setShowcased(3);
    expect(vitrine().showcased).toBe(3);
    expect(vitrineConcluida(3)).toBe(true);
    expect(vitrineConcluida(2)).toBe(false);
    expect(vitrineConcluida(4)).toBe(false);
  });
});
