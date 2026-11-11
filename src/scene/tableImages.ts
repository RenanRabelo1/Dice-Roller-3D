import { LIMITS } from './tableTheme';

// Browser-only image helpers (canvas / createImageBitmap). Photos and textures are re-encoded smaller before saving.
export class TableError extends Error {} // the message is shown to the player, in pt-BR

export async function reduceImage(file: Blob, maxPx: number, maxBytes = LIMITS.photoBytes): Promise<Blob> {
  if (file.size > maxBytes) throw new TableError(`A imagem passa de ${maxBytes / 1024 / 1024} MB.`);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new TableError('Não consegui ler essa imagem. Use PNG, JPG ou WebP.'); }
  const k = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * k)); canvas.height = Math.max(1, Math.round(bitmap.height * k));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.9));
  if (!out) throw new TableError('Não consegui preparar essa imagem.');
  return out;
}

// A texture's pixels as a WebP (the background photo inside an imported .glb).
export async function blobOfImage(image: CanvasImageSource & { width: number; height: number }): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.9)); // as small as the photo was before it went into the file
  if (!out) throw new TableError('Não consegui ler a foto do fundo do arquivo.');
  return out;
}

// True when no pixel is see-through: such an image can be stored as JPEG (the glTF exporter would otherwise write
// every texture as PNG, several times the size of the photo it came from).
export function isOpaque(image: CanvasImageSource & { width: number; height: number }): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(image, 0, 0);
  const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) return false;
  return true;
}
