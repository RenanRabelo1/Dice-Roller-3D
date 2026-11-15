import { useEffect, useMemo } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, Mesh, type BufferAttribute, type MeshStandardMaterial, type Object3D } from 'three';

// Colour of every vertex of a model with engraved numerals: `outside` away from them, `ink` on them.
// `mask` has one entry per triangle, and triangle t owns vertices 3t..3t+2 (the model is non-indexed).
function paintInto(attr: BufferAttribute, mask: Uint8Array, outside: string, ink: string) {
  const out = new Color(outside), inside = new Color(ink), a = attr.array as Float32Array;
  mask.forEach((m, t) => { const c = m ? inside : out; for (let v = 0; v < 3; v++) c.toArray(a, (t * 3 + v) * 3); });
  attr.needsUpdate = true;
}

// An STL with painted numerals: its own colour attribute (sharing the model's positions and normals), rewritten when the
// ink or the gem colour changes. Null when there is nothing to paint.
export function usePainted(source: BufferGeometry | undefined, outside: string, ink: string | null) {
  const mask = source?.userData.ink as Uint8Array | undefined, inked = !!ink;
  const geometry = useMemo(() => {
    if (!source || !mask || !inked) return null;
    const g = new BufferGeometry();
    for (const name of ['position', 'normal']) { const a = source.getAttribute(name); if (a) g.setAttribute(name, a); }
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(mask.length * 9), 3));
    g.userData.ink = mask; // the same mask (tests read it)
    return g;
  }, [source, mask, inked]); // the colours are filled by the effect below
  useEffect(() => { if (geometry && mask && ink) paintInto(geometry.getAttribute('color') as BufferAttribute, mask, outside, ink); }, [geometry, mask, outside, ink]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry;
}

// A GLB with painted numerals: white outside them (the material's own colour shows), the ink inside, as a colour attribute
// on the geometry (the clones share it). A model that already has vertex colours of its own is left alone.
export function paintGlb(root: Object3D, ink: string | null) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry as BufferGeometry, mask = g.userData.ink as Uint8Array | undefined, own = g.getAttribute('color');
    const paint = !!ink && !!mask && (!own || !!g.userData.painted);
    if (paint) {
      if (!own) { g.setAttribute('color', new Float32BufferAttribute(new Float32Array(mask.length * 9), 3)); g.userData.painted = true; }
      paintInto(g.getAttribute('color') as BufferAttribute, mask, '#ffffff', ink);
    }
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if ((m as MeshStandardMaterial).vertexColors !== paint) { (m as MeshStandardMaterial).vertexColors = paint; m.needsUpdate = true; }
    }
  });
}
