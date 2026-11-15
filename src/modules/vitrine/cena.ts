// Scene door of `vitrine` (ADR 0010): the React hook, the showcase's scene and the result panel. Everything pure is in index.ts.
export { useVitrine } from './ui/useVitrine.tsx';
// The showcase in the scene (the flight, the rolled numbers in `result-highlights`, the engraving's glow): the shell
// mounts it inside <Physics>, right after arremesso's <MaoDoArremesso/>.
export { Vitrine } from './scene/Vitrine.tsx';
// The result panel (`<output data-testid="result">`): the Controls mount it in .feedback, before the force bar.
export { PainelDoResultado } from './ui/PainelDoResultado.tsx';
