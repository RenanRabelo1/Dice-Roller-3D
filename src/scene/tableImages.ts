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

// A texture's pixels as a PNG (the background photo inside an imported .glb).
export async function blobOfImage(image: CanvasImageSource & { width: number; height: number }): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!out) throw new TableError('Não consegui ler a foto do fundo do arquivo.');
  return out;
}
