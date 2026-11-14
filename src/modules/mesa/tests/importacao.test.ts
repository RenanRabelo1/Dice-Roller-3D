// The imported table becomes a theme (what the panel did inline in importFile until OS-0037).
import { describe, it, expect } from 'vitest';
import { temaDaMesaImportada } from '../index.ts';
import type { Background, ThemeExtras } from '../domain/tableTheme.ts';

const foto = new Blob(['foto']), atual: Background = { kind: 'preset', preset: 'cosmos' };
const bytes = new ArrayBuffer(8), colors = { felt: '#112233', wood: '#445566' };
const extras = (background: ThemeExtras['background'], name = 'Taverna'): ThemeExtras => ({
  version: 1, name, background, felt: { color: '#000000', texture: 'couro', tile: 2 }, wood: { color: '#000000' },
});
const tema = (read: { extras?: ThemeExtras | null; backdrop?: Blob | null; defaultPanorama?: boolean }, fileName = 'mesa.glb') =>
  temaDaMesaImportada({ read: { extras: null, backdrop: null, defaultPanorama: false, ...read }, fileName, bytes, atual, id: 'm-1', createdAt: 7, colors });

describe('temaDaMesaImportada', () => {
  it('monta o tema com o id, a data, as cores do modelo e o arquivo', () => {
    expect(tema({ extras: extras({ kind: 'color', color: '#ABCDEF' }) })).toEqual({
      version: 1, id: 'm-1', name: 'Taverna', createdAt: 7, background: { kind: 'color', color: '#ABCDEF' },
      felt: { color: '#112233', texture: 'liso' }, wood: { color: '#445566' }, model: { name: 'mesa.glb', bytes },
    });
  });
  it('extras com fundo image: a foto do arquivo com o desfoque e o escurecer; sem foto, o fundo atual', () => {
    expect(tema({ extras: extras({ kind: 'image', blur: 4, dim: 30 }), backdrop: foto }).background).toEqual({ kind: 'image', image: foto, blur: 4, dim: 30 });
    expect(tema({ extras: extras({ kind: 'image', blur: 4, dim: 30 }) }).background).toBe(atual);
  });
  it('extras com fundo panorama: com o plano vira ldr com os ajustes do arquivo; sem o plano, o fundo atual', () => {
    const pano = { kind: 'panorama', format: 'hdr', rotation: 90, intensity: 1.2, blur: 0.1, reflect: false } as const;
    expect(tema({ extras: extras(pano), backdrop: foto }).background).toEqual({ ...pano, image: foto, format: 'ldr' });
    expect(tema({ extras: extras(pano) }).background).toBe(atual);
  });
  it('extras com fundo color (ou tema pronto): o do arquivo', () => {
    expect(tema({ extras: extras({ kind: 'color', color: '#010203' }), backdrop: foto }).background).toEqual({ kind: 'color', color: '#010203' });
    expect(tema({ extras: extras({ kind: 'preset', preset: 'poquer' }) }).background).toEqual({ kind: 'preset', preset: 'poquer' });
  });
  it('sem extras, com defaultPanorama e o plano: o 360° com os ajustes padrão', () => {
    expect(tema({ defaultPanorama: true, backdrop: foto }).background)
      .toEqual({ kind: 'panorama', image: foto, format: 'ldr', rotation: 0, intensity: 1, blur: 0, reflect: true });
    expect(tema({ defaultPanorama: true }).background).toBe(atual);
  });
  it('sem nada: mantém o fundo atual', () => {
    expect(tema({}).background).toBe(atual);
    expect(tema({ backdrop: foto }).background).toBe(atual);
  });
  it('o nome tem até 40 caracteres', () => {
    expect(tema({ extras: extras({ kind: 'color', color: '#010203' }, 'a'.repeat(50)) }).name).toBe('a'.repeat(40));
    expect(tema({}, `${'b'.repeat(45)}.glb`).name).toBe('b'.repeat(40));
  });
  it('sem extras, o nome vem do arquivo, sem o .glb', () => {
    expect(tema({}, 'Minha Mesa.GLB').name).toBe('Minha Mesa');
    expect(tema({}, 'Minha Mesa.GLB').model).toEqual({ name: 'Minha Mesa.GLB', bytes });
  });
});
