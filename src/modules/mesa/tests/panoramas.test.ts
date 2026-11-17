// The ready-made 360° backdrops (OS-0087): catalogue, the theme that keeps the id, .exr and the pixel cap per profile.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PANORAMAS, panoramaPronto } from '../domain/panoramas.ts';
import { checkTheme, DEFAULT_THEME, extrasOf, LIMITS, migrarTema, readExtras, type Background, type TableTheme } from '../domain/tableTheme.ts';
import { preparePanorama, tetoDoPanorama, TableError } from '../domain/tableImages.ts';

const estado = vi.hoisted(() => ({ leve: false, software: false }));
vi.mock('../../../shared/plataforma/index.ts', () => ({ perfilLeve: () => estado.leve, renderizadorPorSoftware: () => estado.software }));
beforeEach(() => { estado.leve = false; estado.software = false; });

const com = (background: Background): TableTheme => ({ ...DEFAULT_THEME, background });
const pronto = (o: object): Background => ({ kind: 'panorama', pronto: 'fireplace', format: 'ldr', rotation: 0, tilt: 0, intensity: 1, blur: 0, reflect: true, ...o });

describe('panoramas prontos', () => {
  it('o catálogo tem os quatro, com caminhos sob a base do Vite', () => {
    expect(PANORAMAS.map((p) => p.id)).toEqual(['monks_forest', 'fireplace', 'cobblestone_street_night', 'rogland_clear_night']);
    for (const p of PANORAMAS) { expect(p.arquivo).toMatch(new RegExp(`panoramas/${p.id}[.]jpg$`)); expect(p.mini).toMatch(new RegExp(`panoramas/${p.id}-mini[.]jpg$`)); }
    expect(panoramaPronto('nada')).toBeUndefined();
  });
  it('o tema padrão é a floresta e é válido', () => {
    expect(DEFAULT_THEME.background).toMatchObject({ kind: 'panorama', pronto: 'monks_forest', format: 'ldr' });
    expect(DEFAULT_THEME.background).not.toHaveProperty('image');
    expect(checkTheme(DEFAULT_THEME)).toBeNull();
  });
  it('valida: pronto conhecido passa; id desconhecido ou formato que não é ldr, não', () => {
    expect(checkTheme(com(pronto({})))).toBeNull();
    expect(checkTheme(com(pronto({ pronto: 'sumiu' })))).toMatch(/pronto/);
    expect(checkTheme(com(pronto({ format: 'hdr' })))).toMatch(/pronto/);
    expect(checkTheme(com(pronto({ pronto: undefined })))).toMatch(/360/); // sem foto e sem pronto
    expect(checkTheme(com(pronto({ pronto: undefined, image: new Blob(), format: 'exr' })))).toBeNull();
  });
  it('o extras do pronto vai como foto (sem o id) e lê de volta; id desconhecido no extras é largado', () => {
    expect(extrasOf(com(pronto({ rotation: 40 }))).background).toEqual({ kind: 'panorama', format: 'ldr', rotation: 40, tilt: 0, intensity: 1, blur: 0, reflect: true });
    const x = extrasOf(com(pronto({})));
    expect(readExtras({ ...x, background: { ...x.background, pronto: 'monks_forest' } })?.background).toMatchObject({ pronto: 'monks_forest' });
    expect(readExtras({ ...x, background: { ...x.background, pronto: 'sumiu' } })?.background).not.toHaveProperty('pronto');
    expect(readExtras({ ...x, background: { ...x.background, format: 'exr' } })?.background).toMatchObject({ format: 'exr' });
  });
  it('migração: mesa antiga fica como está; pronto que saiu do jogo cai no fundo padrão', () => {
    const antiga = com({ kind: 'panorama', image: new Blob(), format: 'hdr', rotation: 10, intensity: 1, blur: 0, reflect: true } as unknown as Background);
    expect(migrarTema(antiga).background).toMatchObject({ format: 'hdr', rotation: 10, tilt: 0 });
    expect(migrarTema(com({ kind: 'color', color: '#112233' })).background).toEqual({ kind: 'color', color: '#112233' });
    expect(migrarTema(com(pronto({ pronto: 'sumiu' }))).background).toEqual(DEFAULT_THEME.background);
    expect(migrarTema(com(pronto({}))).background).toMatchObject({ pronto: 'fireplace' });
  });
});

describe('.exr e o teto de pixels', () => {
  it('aceita .exr como o .hdr, até 40 MB', async () => {
    const exr = await preparePanorama(new Blob(['x']), 'ceu.EXR');
    expect(exr.format).toBe('exr');
    expect((await preparePanorama(new Blob(['x']), 'ceu.hdr')).format).toBe('hdr');
    const grande = { size: LIMITS.panoramaHdrBytes + 1, type: '' } as Blob;
    await expect(preparePanorama(grande, 'ceu.exr')).rejects.toBeInstanceOf(TableError);
    await expect(preparePanorama(new Blob(['x']), 'ceu.txt')).rejects.toThrow(/\.exr/);
  });
  it('8192 no perfil completo, 4096 no leve, 2048 no renderizador por software', () => {
    expect(tetoDoPanorama()).toBe(8192);
    estado.leve = true; expect(tetoDoPanorama()).toBe(4096);
    estado.software = true; expect(tetoDoPanorama()).toBe(2048);
    expect(LIMITS.panoramaBytes).toBe(20 * 1024 * 1024);
    expect(LIMITS.panoramaHdrBytes).toBe(40 * 1024 * 1024);
  });
});
