import { describe, expect, it } from 'vitest';
import { polyhedron } from '../../dados/index.ts';
import type { PedidoDeMontagem } from '../contracts.ts';
import { montarDado, tintaPermitida } from '../index.ts';

const pedido = (patch: Partial<PedidoDeMontagem> = {}): PedidoDeMontagem => ({
  id: 'm-1', createdAt: 42, nome: 'Caveira', apelido: 'caveira',
  imp: { base: 'd20', fit: { center: [1, 2, 3], scale: 0.5 } },
  arquivo: { format: 'stl', name: 'caveira.stl', bytes: new ArrayBuffer(4) },
  printed: true, omens: true, color: '#123456', ink: 'ouro', surface: 'fosco', textured: false, poly: polyhedron('d20'),
  ...patch,
});

describe('montarDado', () => {
  it('monta o registro salvo com o que o assistente tem', () => {
    const p = pedido(), die = montarDado(p);
    expect(die).toEqual({
      version: 1, id: 'm-1', createdAt: 42, name: 'Caveira', slug: 'caveira', base: 'd20', omens: true,
      file: p.arquivo, fit: p.imp.fit, poly: p.poly, printed: true, color: '#123456', ink: 'ouro', finish: 'fosco',
    });
  });

  it('omens só em base d20', () => {
    expect(montarDado(pedido({ omens: true })).omens).toBe(true);
    expect(montarDado(pedido({ omens: false })).omens).toBe(false);
    expect(montarDado(pedido({ imp: { base: 'd6', fit: { center: [0, 0, 0], scale: 1 } }, poly: polyhedron('d6') })).omens).toBe(false);
    expect(montarDado(pedido({ imp: { base: 'livre', fit: { center: [0, 0, 0], scale: 1 } } })).omens).toBe(false);
  });

  it('cor só em STL', () => {
    expect(montarDado(pedido()).color).toBe('#123456');
    expect(montarDado(pedido({ arquivo: { format: 'glb', name: 'c.glb', bytes: new ArrayBuffer(4) } })).color).toBeNull();
  });

  it('tinta só se printed; com textura, só escura ou nenhuma', () => {
    expect('ink' in montarDado(pedido({ printed: false }))).toBe(false);
    expect(montarDado(pedido({ ink: 'branca' })).ink).toBe('branca');
    expect(montarDado(pedido({ textured: true, ink: 'ouro' })).ink).toBe('escura');
    expect(montarDado(pedido({ textured: true, ink: 'auto' })).ink).toBe('escura');
    expect(montarDado(pedido({ textured: true, ink: 'nenhuma' })).ink).toBe('nenhuma');
  });

  it('acabamento só em STL', () => {
    expect(montarDado(pedido()).finish).toBe('fosco');
    expect('finish' in montarDado(pedido({ arquivo: { format: 'glb', name: 'c.glb', bytes: new ArrayBuffer(4) } }))).toBe(false);
  });
});

describe('tintaPermitida', () => {
  it('sem textura, qualquer tinta; com textura, só escura ou nenhuma', () => {
    for (const ink of ['auto', 'ouro', 'escura', 'branca', 'nenhuma'] as const) expect(tintaPermitida(ink, false)).toBe(ink);
    expect(tintaPermitida('auto', true)).toBe('escura');
    expect(tintaPermitida('ouro', true)).toBe('escura');
    expect(tintaPermitida('branca', true)).toBe('escura');
    expect(tintaPermitida('escura', true)).toBe('escura');
    expect(tintaPermitida('nenhuma', true)).toBe('nenhuma');
  });
});
