// Pure door of `mesa` (ADR 0010): the table's look and the saved tables. No React here: `useMesa` is in cena.ts.
// The store loads the repository statically, so its defineStore runs before the database opens (armadilhas.md).
import { Box3, Mesh, Vector3, type Color, type Object3D } from 'three';
import type { MesaInspecionada } from './contracts.ts';
import { mesa } from './store.ts';

export type { Background, MesaImportada, MesaInspecionada, PresetName, TableState, TableTheme } from './contracts.ts';
// `setColors` is not here: its only writer is MesaNaCena (the colours the table really shows), read through coresDaMesa.
export { apply, copy, coresDaMesa, edit, mesa, remove, reset } from './store.ts';
// The shell calls this on mount: the saved tables and the active one (the store's `load`).
export { load as carregar } from './store.ts';
export { clampBlur, clampDim, clampIntensity, clampPanoramaBlur, clampRotation, clampTile, DEFAULT_THEME, fileSafe, LIMITS, PRESETS } from './domain/tableTheme.ts';
export { panoramaPicture, panoramaTexture, preparePanorama, reduceImage, TableError, warmImageDecoder } from './domain/tableImages.ts';
export { colorsOf, disposeTable } from './domain/tableBuild.ts';
export { temaDaMesaImportada } from './domain/importacao.ts';
// The kraken's break (`pressagios`) hides the floor through this; MesaNaCena gives it the floor in the scene.
export { ocultarPiso } from './scene/piso.ts';
// The file reader and writer bring GLTFLoader/GLTFExporter: they load on demand, never with this door (ADR 0007, ponto 11).
export const carregarArquivoDeMesa = () => import('./domain/tableFile.ts');

// The active table as the test hook reads it (`window.__dice.table()`). The shell gives the scene and the shader count
// (it has `gl.info`).
export function inspecao(scene: Object3D, programas: number): MesaInspecionada {
  const t = mesa().theme, mesh = (name: string) => scene.getObjectByName(name), hex = (o?: Object3D) => {
    const m = o instanceof Mesh ? (Array.isArray(o.material) ? o.material[0] : o.material) as { color?: Color; map?: unknown } : null;
    return m?.color ? { color: `#${m.color.getHexString()}`, textured: !!m.map && !(m.map as { userData?: { placeholder?: boolean } }).userData?.placeholder } : null;
  };
  const guide = mesh('guia-area-de-jogo'), box = guide ? new Box3().setFromObject(guide, true) : null;
  const felt = hex(mesh('feltro') ?? undefined), wood = hex(mesh('base') ?? mesh('madeira') ?? undefined);
  return {
    reflect: t.background.kind === 'panorama' ? t.background.reflect : null, programs: programas,
    id: t.id, name: t.name, background: t.background.kind, backgroundColor: t.background.kind === 'color' ? t.background.color : null,
    felt: felt?.color ?? null, feltTextured: felt?.textured ?? false, wood: wood?.color ?? null, model: !!t.model,
    guide: box ? { size: box.getSize(new Vector3()).toArray(), center: box.getCenter(new Vector3()).toArray() } : null,
    saved: mesa().tables.length,
    imported: (scene.getObjectByName('mesa') ?? scene.getObjectByName('tray-surface'))?.userData.imported === true,
  };
}
