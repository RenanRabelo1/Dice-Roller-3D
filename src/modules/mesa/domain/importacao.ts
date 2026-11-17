// An imported table file, read, becomes a theme. Pure: the id and the date come in, so the same input gives the same theme.
import type { ImportedTable } from './tableFile.ts'; // only the type: the file reader stays on demand
import type { Background, TableTheme } from './tableTheme.ts';

interface MesaImportada {
  read: Pick<ImportedTable, 'extras' | 'backdrop' | 'defaultPanorama'>;
  fileName: string;
  bytes: ArrayBuffer;
  atual: Background; // the background kept when the file brings none
  id: string;
  createdAt: number;
  colors: { felt: string; wood: string }; // the model's own colours (colorsOf), or the default table's
}

// The background comes from the file's extras (with its picture, if any); a 360° plane without settings gets the defaults;
// anything missing keeps the current background. The name is the theme's, or the file's without `.glb`, up to 40 characters.
export function temaDaMesaImportada({ read, fileName, bytes, atual: bg, id, createdAt, colors }: MesaImportada): TableTheme {
  const x = read.extras;
  const background: Background = x ? (x.background.kind === 'image' ? (read.backdrop ? { kind: 'image', image: read.backdrop, blur: x.background.blur, dim: x.background.dim } : bg) : x.background.kind === 'panorama' ? (read.backdrop ? { ...x.background, pronto: undefined, image: read.backdrop, format: 'ldr' } : bg) : x.background) : read.defaultPanorama && read.backdrop ? { kind: 'panorama', image: read.backdrop, format: 'ldr', rotation: 0, tilt: 0, intensity: 1, blur: 0, reflect: true } : bg;
  return {
    version: 1, id, name: (x?.name ?? fileName.replace(/\.glb$/i, '')).slice(0, 40), createdAt,
    background, felt: { color: colors.felt, texture: 'liso' }, wood: { color: colors.wood }, model: { name: fileName, bytes },
  };
}
