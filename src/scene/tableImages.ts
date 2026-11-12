import { CanvasTexture, DataTexture, DataUtils, EquirectangularReflectionMapping, FloatType, HalfFloatType, RGBAFormat, SRGBColorSpace, Texture } from 'three';
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

// The browser's first image decode in a page can freeze the main thread for a second or more (measured with a 2048 px
// PNG); decoding a 1-pixel PNG at startup pays that once, when nobody is throwing.
const ONE_PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
export function warmImageDecoder() {
  if (typeof createImageBitmap !== 'function') return;
  const bytes = Uint8Array.from(atob(ONE_PIXEL), (c) => c.charCodeAt(0));
  createImageBitmap(new Blob([bytes], { type: 'image/png' })).then((b) => b.close(), () => {});
}

// --- 360° panorama ---------------------------------------------------------------------------------------------------
let softwareGl = false; // Stage sets this when the renderer is SwiftShader: half-size panoramas keep the first frame affordable
export const markSoftwareGl = () => { softwareGl = true; };

export async function preparePanorama(file: Blob, name: string): Promise<{ image: Blob; format: 'ldr' | 'hdr' }> {
  if (/\.hdr$/i.test(name) || file.type === 'image/vnd.radiance') {
    if (file.size > LIMITS.panoramaHdrBytes) throw new TableError(`O arquivo .hdr passa de ${LIMITS.panoramaHdrBytes / 1024 / 1024} MB.`);
    return { image: file, format: 'hdr' };
  }
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(name)) throw new TableError('Use .hdr, .jpg, .png ou .webp.');
  return { image: await reduceImage(file, LIMITS.panoramaPx, LIMITS.panoramaBytes), format: 'ldr' };
}

const BAD_RATIO = 'A foto 360° precisa ter proporção 2:1 (ex.: 4096 × 2048).';
const panoramas = new WeakMap<Blob, Promise<Texture>>();

// The equirectangular texture of a panorama background (cached per blob). Throws TableError when it is not 2:1.
export function panoramaTexture(bg: { image: Blob; format: 'ldr' | 'hdr' }): Promise<Texture> {
  let p = panoramas.get(bg.image);
  if (!p) { p = loadPanorama(bg); panoramas.set(bg.image, p); p.catch(() => panoramas.delete(bg.image)); }
  return p;
}

async function loadPanorama(bg: { image: Blob; format: 'ldr' | 'hdr' }): Promise<Texture> {
  const maxPx = softwareGl ? LIMITS.panoramaPx / 2 : LIMITS.panoramaPx;
  let tex: Texture, w: number, h: number;
  if (bg.format === 'ldr') {
    const bitmap = await createImageBitmap(bg.image);
    w = bitmap.width; h = bitmap.height;
    if (!isTwoToOne(w, h)) { bitmap.close(); throw new TableError(BAD_RATIO); }
    const k = Math.min(1, maxPx / w);
    if (k < 1) { // only the software-renderer cap lands here: stored panoramas are already <= 4096
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height);
      tex = new CanvasTexture(c);
    } else tex = new Texture(bitmap);
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
  } else {
    const { HDRLoader } = await import('three/examples/jsm/loaders/HDRLoader.js'); // dynamic: keeps the first load light
    const loader = new HDRLoader(); loader.setDataType(FloatType);
    const hdr = loader.parse(await bg.image.arrayBuffer());
    w = hdr.width!; h = hdr.height!;
    if (!isTwoToOne(w, h)) throw new TableError(BAD_RATIO);
    let data = hdr.data as Float32Array;
    while (w > maxPx) { // average 2x2 blocks until it fits
      const nw = w >> 1, nh = h >> 1, out = new Float32Array(nw * nh * 4);
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) for (let c = 0; c < 4; c++) {
        const i = ((2 * y) * w + 2 * x) * 4 + c;
        out[(y * nw + x) * 4 + c] = (data[i] + data[i + 4] + data[i + w * 4] + data[i + w * 4 + 4]) / 4;
      }
      data = out; w = nw; h = nh;
    }
    const half = new Uint16Array(data.length);
    for (let i = 0; i < data.length; i++) half[i] = DataUtils.toHalfFloat(data[i]); // half floats filter on every GPU
    tex = new DataTexture(half, w, h, RGBAFormat, HalfFloatType);
    tex.needsUpdate = true;
  }
  tex.mapping = EquirectangularReflectionMapping;
  return tex;
}
const isTwoToOne = (w: number, h: number) => w / h >= 1.9 && w / h <= 2.1;

// The panorama as a plain 8-bit picture for the .glb (glTF has no HDR): an LDR one as it is, an HDR one tone-mapped (c / (1 + c), then gamma).
export async function panoramaPicture(bg: { image: Blob; format: 'ldr' | 'hdr' }): Promise<ImageBitmap | HTMLCanvasElement> {
  if (bg.format === 'ldr') return createImageBitmap(bg.image);
  const tex = await panoramaTexture(bg), { data, width, height } = tex.image as { data: Uint16Array; width: number; height: number };
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const g = canvas.getContext('2d')!, out = g.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < 3; c++) { const v = Math.max(0, DataUtils.fromHalfFloat(data[i * 4 + c]!)); out.data[i * 4 + c] = Math.round(255 * (v / (1 + v)) ** (1 / 2.2)); }
    out.data[i * 4 + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return canvas;
}
