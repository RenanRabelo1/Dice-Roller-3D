// Pure door of `vitrine` (ADR 0010): the showcase's state and its pure rules (the poses of the flight, the floating
// number, the engraving's glow, the panel's text). No React here: the hook and <PainelDoResultado/> are in cena.ts.
// Only what someone outside uses today is re-exported.
export type { EstadoDaVitrine, TextoDoPainel } from './contracts.ts';
export { setShowcased, vitrine, vitrineConcluida } from './store.ts';
export { CAPTION, showcasePoses, type View } from './domain/showcase.ts';
export { highlightAt, HL_SIZE, SHOW, type Highlight } from './domain/highlight.ts';
export { glowMesh, UP_INK, upInk } from './domain/inkGlow.ts';
export { resultText } from './domain/painel.ts';
