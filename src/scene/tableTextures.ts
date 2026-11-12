import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from 'three';
import type { FeltTexture } from './tableTheme';

// Felt textures: the two made by the app are greyscale canvases (they multiply the felt colour); the player's own
// image repeats. The felt is 14 x 9 and one tile covers `tile` units.
const generated: Partial<Record<'veludo' | 'couro', CanvasTexture>> = {};

function paint(kind: 'veludo' | 'couro'): CanvasTexture {
  const size = 256, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  let seed = kind === 'veludo' ? 7 : 11;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  g.fillStyle = kind === 'veludo' ? '#e6e6e6' : '#d2d2d2'; g.fillRect(0, 0, size, size);
  if (kind === 'veludo') {
    for (let i = 0; i < 9000; i++) { const v = 170 + rnd() * 85; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * size, rnd() * size, 2, 2); }
  } else {
    for (let i = 0; i < 700; i++) {
      const x = rnd() * size, y = rnd() * size, r = 3 + rnd() * 4;
      for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) { // wrapped, so tiles join
        const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grad.addColorStop(0, '#f2f2f2'); grad.addColorStop(0.75, '#c4c4c4'); grad.addColorStop(1, '#8c8c8c');
        g.fillStyle = grad; g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill();
      }
    }
  }
  return new CanvasTexture(canvas);
}

export function feltMap(texture: FeltTexture, image?: ImageBitmap): Texture | null {
  if (texture === 'liso') return null;
  let base: Texture;
  if (typeof texture === 'string') base = generated[texture] ??= paint(texture);
  else if (image) base = new CanvasTexture(image);
  else return null;
  const t = base.clone(); // own repeat per material
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  const tile = typeof texture === 'object' ? texture.tile : 2;
  t.repeat.set(14 / tile, 9 / tile);
  t.needsUpdate = true;
  return t;
}
