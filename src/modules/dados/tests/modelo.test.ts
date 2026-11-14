import { afterEach, describe, expect, it } from 'vitest';
import { carregarModelo, customKind, polyhedron, registerCustom, unregisterCustom, type CustomDie } from '../index.ts';

// A binary STL of loose triangles (normals left zero). Local, so the module's tests do not reach the legacy importer.
function stl(positions: Float32Array): ArrayBuffer {
  const n = positions.length / 9, buf = new ArrayBuffer(84 + 50 * n), view = new DataView(buf);
  view.setUint32(80, n, true);
  for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) view.setFloat32(84 + 50 * t + 12 + k * 4, positions[t * 9 + k], true);
  return buf;
}

// An imported d6 whose file is the app's own d6 as an STL.
const die = (): CustomDie => ({
  version: 1, id: 'm-d6', createdAt: 0, name: 'm-d6', slug: 'm-d6', base: 'd6', omens: false,
  file: { format: 'stl', name: 'm-d6.stl', bytes: stl(Float32Array.from(polyhedron('d6').triangles)) }, fit: { center: [0, 0, 0], scale: 1 },
  poly: polyhedron('d6'), printed: false, color: null,
});
afterEach(() => unregisterCustom(customKind('m-d6')));

describe('carregarModelo', () => {
  it('reads the file once while the kind is registered', async () => {
    const d = die();
    registerCustom(d);
    expect(await carregarModelo(d)).toBe(await carregarModelo(d));
  });
  it('reads the file again after the kind is removed (the cache is freed)', async () => {
    const d = die();
    registerCustom(d);
    const first = await carregarModelo(d);
    unregisterCustom(customKind(d.id));
    registerCustom(d);
    expect(await carregarModelo(d)).not.toBe(first);
  });
});
