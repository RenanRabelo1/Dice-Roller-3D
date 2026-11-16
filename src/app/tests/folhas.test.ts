import { describe, expect, it } from 'vitest';
import { folhaEm, folhaVista, larguraDaFolha, totalDeFolhas } from '../folhas.ts';

describe('folhas', () => {
  it('conta as folhas do caso medido (1470x560)', () => {
    expect(totalDeFolhas(2674, 1012, 96)).toBe(3);
  });
  it('uma folha quando cabe', () => {
    expect(totalDeFolhas(1012, 1012, 96)).toBe(1);
  });
  it('absorve o arredondamento de subpixel', () => {
    expect(totalDeFolhas(1012.4, 1012, 96)).toBe(1);
  });
  it('a folha de scroll: 0, uma e meia e o fim', () => {
    expect(larguraDaFolha(1012, 96)).toBe(1108);
    expect(folhaEm(0, 1012, 96)).toBe(0);
    expect(folhaEm(1108 * 1.5, 1012, 96)).toBe(2);
    expect(folhaEm(1108, 1012, 96)).toBe(1);
    expect(folhaEm(2216, 1012, 96)).toBe(2);
  });
  it('a ultima folha, mesmo parada antes do proprio deslocamento', () => {
    expect(folhaVista(0, 2674, 1012, 96)).toBe(1);
    expect(folhaVista(1108, 2674, 1012, 96)).toBe(2);
    expect(folhaVista(1662, 2674, 1012, 96)).toBe(3); // scrollWidth - clientWidth
    expect(folhaVista(288, 1300, 1012, 96)).toBe(2); // duas folhas, a segunda curta
    expect(folhaVista(0, 1012, 1012, 96)).toBe(1);
  });
});
