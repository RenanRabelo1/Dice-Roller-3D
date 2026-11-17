// Pure door of `vitrine` (ADR 0010): the showcase's state and its pure rules (the poses of the flight, the floating
// number, the engraving's glow, the panel's text). No React here: the hook, <Vitrine/> and <PainelDoResultado/> are in cena.ts.
// Only what someone outside uses today is re-exported.
import type { Material, Mesh, Object3D } from 'three';
import type { VitrineInspecionada } from './contracts.ts';

export type { BrilhoInspecionado, DestaqueInspecionado, EstadoDaVitrine, TextoDoPainel, VitrineInspecionada } from './contracts.ts';
export { setShowcased, vitrine, vitrineConcluida } from './store.ts';
export { CAPTION, showcasePoses, type View } from './domain/showcase.ts';
export { highlightAt, HL_SIZE, SHOW, type Highlight } from './domain/highlight.ts';
export { glowMesh, MESMA_FACE, UP_INK, upInk } from './domain/inkGlow.ts';
export { resultText } from './domain/painel.ts';

// The showcase as the test hook sees it in the scene. The names `result-highlights` and `ink-glow-i` (set by <Vitrine/>)
// live only in this module. A child with no text is a symbol (troika's Text is not imported here, to stay pure).
export function inspecao(cena: Object3D): VitrineInspecionada {
  return {
    highlights: () => (cena.getObjectByName('result-highlights')?.children ?? []).map((o) => {
      const text = (o as { text?: unknown }).text;
      return { text: typeof text === 'string' ? text : null, visible: o.visible, position: o.position.toArray() };
    }),
    inkGlow: (index) => {
      const glow = cena.getObjectByName(`ink-glow-${index}`) as Mesh | undefined;
      return glow ? { visible: glow.visible, triangles: glow.geometry.getAttribute('position').count / 3, opacity: (glow.material as Material).opacity } : null;
    },
  };
}
