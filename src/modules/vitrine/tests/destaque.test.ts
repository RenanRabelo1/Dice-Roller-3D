import { describe, it, expect } from 'vitest';
import { intensidadeDoDestaque } from '../domain/destaque.ts';

describe('intensidadeDoDestaque', () => {
  it('0 no início, 5 no fim do voo, preso fora dele', () => {
    expect(intensidadeDoDestaque(0, 650, false)).toBe(0);
    expect(intensidadeDoDestaque(325, 650, false)).toBe(2.5);
    expect(intensidadeDoDestaque(650, 650, false)).toBe(5);
    expect(intensidadeDoDestaque(-100, 650, false)).toBe(0);
    expect(intensidadeDoDestaque(9999, 650, false)).toBe(5);
  });
  it('0 no renderizador por software', () => {
    expect(intensidadeDoDestaque(650, 650, true)).toBe(0);
  });
});
