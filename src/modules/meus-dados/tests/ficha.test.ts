import { describe, it, expect } from 'vitest';
import { camposDaFicha } from '../domain/ficha.ts';

const stl = { format: 'stl' as const, name: 'a.stl', bytes: new ArrayBuffer(0) };
const glb = { ...stl, format: 'glb' as const, name: 'a.glb' };

describe('camposDaFicha', () => {
  it('STL gravado de base d20: tudo', () => {
    expect(camposDaFicha({ printed: true, base: 'd20', file: stl })).toEqual(['nome', 'apelido', 'tinta', 'acabamento', 'gema', 'presagios']);
  });
  it('GLB sem gravação: só nome e apelido', () => {
    expect(camposDaFicha({ printed: false, base: 'd6', file: glb })).toEqual(['nome', 'apelido']);
  });
  it('GLB gravado de d20: tinta e presságios, sem gema', () => {
    expect(camposDaFicha({ printed: true, base: 'd20', file: glb })).toEqual(['nome', 'apelido', 'tinta', 'presagios']);
  });
  it('STL de forma livre: acabamento e gema, sem presságios', () => {
    expect(camposDaFicha({ printed: false, base: 'livre', file: stl })).toEqual(['nome', 'apelido', 'acabamento', 'gema']);
  });
});
