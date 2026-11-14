// Pure door of `mesa` (ADR 0010): the table's look and the saved tables. No React here: `useMesa` is in cena.ts.
// The store loads the repository statically, so its defineStore runs before the database opens (armadilhas.md).
export type { Background, PresetName, TableState, TableTheme } from './contracts.ts';
export { apply, copy, edit, load, mesa, remove, reset, setColors } from './store.ts';
export { clampBlur, clampDim, clampIntensity, clampPanoramaBlur, clampRotation, clampTile, DEFAULT_THEME, fileSafe, LIMITS, PRESETS } from './domain/tableTheme.ts';
export { panoramaPicture, panoramaTexture, preparePanorama, reduceImage, TableError, warmImageDecoder } from './domain/tableImages.ts';
export { buildDefault, colorsOf, disposeTable, SURFACE } from './domain/tableBuild.ts';
// The file reader and writer bring GLTFLoader/GLTFExporter: they load on demand, never with this door (ADR 0007, ponto 11).
export const carregarArquivoDeMesa = () => import('./domain/tableFile.ts');
