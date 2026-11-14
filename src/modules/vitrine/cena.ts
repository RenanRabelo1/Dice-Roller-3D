// Scene door of `vitrine` (ADR 0010): the React hook and the result panel. Everything pure is in index.ts.
export { useVitrine } from './ui/useVitrine.tsx';
// The result panel (`<output data-testid="result">`): the Controls mount it in .feedback, before the force bar.
export { PainelDoResultado } from './ui/PainelDoResultado.tsx';
