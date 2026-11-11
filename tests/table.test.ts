import { describe, it, expect } from 'vitest';
import { Box3, BoxGeometry, Color, DirectionalLight, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three';
import { shard, shardWood } from '../src/scene/Kraken';
import { defaultTable, GUIDE, SURFACE } from '../src/scene/tableBuild';
import { cleanTable, fitTable, readTable } from '../src/scene/tableFile';
import { checkTheme, clampBlur, DEFAULT_THEME, EXTRAS_KEY, extrasOf, fileSafe, readExtras, type TableTheme } from '../src/scene/tableTheme';
import { glb } from './helpers/models';

const theme = (patch: Partial<TableTheme> = {}): TableTheme => ({ ...DEFAULT_THEME, ...patch });
const named = (g: Group, name: string) => g.getObjectByName(name)!;
const boxOf = (o: Group | Mesh) => { o.updateMatrixWorld(true); return new Box3().setFromObject(o, true); };

describe('table theme', () => {
  it('the default theme is the table of today', () => {
    expect(DEFAULT_THEME.background).toEqual({ kind: 'color', color: '#140E10' });
    expect(DEFAULT_THEME.felt).toEqual({ color: '#3A0F1A', texture: 'liso' });
    expect(DEFAULT_THEME.wood.color).toBe('#3B2416');
    expect(checkTheme(DEFAULT_THEME)).toBeNull();
    const t = defaultTable(DEFAULT_THEME, null, null);
    expect(boxOf(named(t as Group, 'base') as Mesh).getSize(new Vector3()).toArray()).toEqual([15, expect.closeTo(0.42), 10]);
    expect(boxOf(named(t, 'feltro') as Mesh).max.y).toBeCloseTo(0, 6); // the felt's top is where the dice rest
    expect(named(t, 'moldura').children).toHaveLength(4);
  });
  it('rejects bad colours, versions and limits', () => {
    expect(checkTheme(theme({ wood: { color: 'red' } }))).toMatch(/Cor/);
    expect(checkTheme({ ...DEFAULT_THEME, version: 2 as 1 })).toMatch(/versão/);
    expect(checkTheme(theme({ background: { kind: 'image', image: new Blob(), blur: 99, dim: 0 } }))).toMatch(/limites/);
    expect(clampBlur(99)).toBe(20);
  });
  it('reads back what it wrote, and nothing it cannot trust', () => {
    const t = theme({ name: 'Taverna', background: { kind: 'preset', preset: 'cosmos' }, felt: { color: '#112233', texture: 'couro' } });
    const x = readExtras(JSON.parse(JSON.stringify(extrasOf(t))));
    expect(x).toMatchObject({ name: 'Taverna', background: { kind: 'preset', preset: 'cosmos' }, felt: { color: '#112233', texture: 'couro' } });
    expect(readExtras({ ...extrasOf(t), version: 9 })).toBeNull();
    expect(readExtras({ ...extrasOf(t), wood: { color: 'nope' } })).toBeNull();
    expect(readExtras(null)).toBeNull();
    expect(fileSafe('Mesa do Zé!')).toBe('mesa-do-ze');
  });
});

describe('fitting an imported table', () => {
  // A file as an editor might hand it over: scaled, turned and moved by `edit`.
  const file = (edit: (root: Group) => void, drop: string[] = []) => {
    const mesa = defaultTable(DEFAULT_THEME, null, null);
    mesa.getObjectByName(SURFACE)!.name = 'piso';
    for (const n of drop) mesa.getObjectByName(n)?.removeFromParent();
    const root = new Group(); root.add(mesa); edit(root);
    return root;
  };
  const expectFitted = (g: Group, guide = 'guia-area-de-jogo') => {
    const b = boxOf(named(g, guide) as Mesh);
    expect(b.getSize(new Vector3()).toArray()).toEqual(GUIDE.size.map((v) => expect.closeTo(v, 4)));
    expect(b.getCenter(new Vector3()).toArray()).toEqual(GUIDE.center.map((v) => expect.closeTo(v, 4)));
  };

  it('keeps a table that is already right, and calls its floor tray-surface', () => {
    const { group, warnings } = fitTable(file(() => {}));
    expectFitted(group);
    expect(warnings).toEqual([]);
    expect(group.getObjectByName(SURFACE)).toBeTruthy();
    expect(named(group, 'guia-area-de-jogo').visible).toBe(false);
  });
  it('undoes a 100x scale, a Z-up export and a move, using the guide', () => {
    const { group, warnings } = fitTable(file((r) => { r.scale.setScalar(100); r.rotation.x = Math.PI / 2; r.position.set(300, -40, 1200); }));
    expectFitted(group);
    expect(warnings).toEqual([]);
    expect(boxOf(named(group, SURFACE) as Group).max.y).toBeCloseTo(0, 4); // the felt is back at the dice's level
    const rest = fitTable(file((r) => { r.rotation.x = -Math.PI / 2; r.scale.setScalar(0.01); }));
    expectFitted(rest.group);
  });
  it('without a guide, fits the floor: 15 x 10 with its top at y = 0', () => {
    const { group } = fitTable(file((r) => { r.scale.setScalar(100); r.position.set(5, 80, -9); }, ['guia-area-de-jogo']));
    const piso = boxOf(named(group, SURFACE) as Group);
    expect(piso.getSize(new Vector3()).x).toBeCloseTo(15, 4);
    expect(piso.getSize(new Vector3()).z).toBeCloseTo(10, 4);
    expect(piso.max.y).toBeCloseTo(0, 4);
    expect(piso.getCenter(new Vector3()).x).toBeCloseTo(0, 4);
  });
  it('is an error with neither guide nor floor', () => {
    expect(() => fitTable(file(() => {}, ['guia-area-de-jogo', 'piso']))).toThrow(/guia/);
  });
  it('accepts Blender-style names (piso.001, Guia-Area-De-Jogo)', () => {
    const root = file(() => {});
    root.getObjectByName('piso')!.name = 'Piso.001';
    root.getObjectByName('guia-area-de-jogo')!.name = 'Guia-Area-De-Jogo';
    expectFitted(fitTable(root).group, 'Guia-Area-De-Jogo');
  });

  it('warns about a frame inside the play area', () => {
    const { warnings } = fitTable(file((r) => {
      const pillar = new Mesh(new BoxGeometry(1, 2, 1), new MeshBasicMaterial());
      pillar.position.set(1, 1, 0); r.getObjectByName('moldura')!.add(pillar);
    }));
    expect(warnings).toEqual([expect.stringMatching(/entra na área de jogo/)]);
  });
  it('warns about a floor off the dice level, a low frame, a missing frame and a missing floor', () => {
    expect(fitTable(file((r) => { r.getObjectByName('piso')!.position.y = 0.5; })).warnings.join()).toMatch(/topo do piso/);
    const low = file((r) => r.getObjectByName('moldura')!.scale.y = 0.4);
    expect(fitTable(low).warnings.join()).toMatch(/mais baixa/);
    expect(fitTable(file(() => {}, ['moldura'])).warnings.join()).toMatch(/Não achei a moldura/);
    const none = fitTable(file(() => {}, ['piso']));
    expect(none.warnings.join()).toMatch(/Não achei o piso/);
    expect(none.group.name).toBe(SURFACE); // the whole model goes when the table breaks
  });
});

describe('cleaning and reading', () => {
  it('removes lights and cameras', () => {
    const root = file1();
    root.add(new DirectionalLight(), new PerspectiveCamera());
    root.children[0].add(new DirectionalLight());
    expect(cleanTable(root)).toBe(3);
    let rest = 0;
    root.traverse((o) => { if ((o as { isLight?: boolean }).isLight || (o as { isCamera?: boolean }).isCamera) rest++; });
    expect(rest).toBe(0);
  });
  it('refuses a file that is not a table, and one that is too big', async () => {
    const soup = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    await expect(readTable(glb(soup))).rejects.toThrow(/guia/); // a mesh, but no guide and no floor
    await expect(readTable(new ArrayBuffer(10))).rejects.toThrow(/ler esse arquivo/);
    await expect(readTable(new ArrayBuffer(21 * 1024 * 1024))).rejects.toThrow(/20 MB/);
  });
  it('keeps the theme out of the way: extras live on the root', () => {
    expect(defaultTable(DEFAULT_THEME, null, null).userData[EXTRAS_KEY]).toMatchObject({ version: 1, name: 'Mesa padrão' });
  });
});
const file1 = () => { const g = new Group(); g.add(defaultTable(DEFAULT_THEME, null, null)); return g; };

describe('kraken shards', () => {
  const rgb = (g: { getAttribute(n: string): { getX(i: number): number; getY(i: number): number; getZ(i: number): number } }, i: number) => {
    const c = g.getAttribute('color');
    return new Color(c.getX(i), c.getY(i), c.getZ(i)).getHexString();
  };
  const cell: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  it('are felt on top and wood below, in the colours given', () => {
    const g = shard(cell, 0.5, 0.5, new Color('#112233'), new Color('#445566'));
    expect(rgb(g, 0)).toBe('112233');
    expect(rgb(g, 3)).toBe('445566');
  });
  it('keep today\'s colours on the default table', () => {
    expect(rgb(shard(cell, 0.5, 0.5), 0)).toBe('3a0f1a');
    expect(shardWood('#3B2416').getHexString()).toBe('815435');
    expect(shardWood('#ffffff').getHexString()).toBeTruthy();
  });
});
