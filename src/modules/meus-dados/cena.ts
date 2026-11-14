// Scene door of `meus-dados` (ADR 0010): the React hooks and components. Everything pure is in index.ts.
import { lazy } from 'react';

export { useMeusDados } from './ui/useMeusDados.tsx';
export { InkChoice } from './ui/InkChoice.tsx';
// The wizard (and the importer and model loaders inside it) only loads when the player opens it (ADR 0007, ponto 11).
export const AssistenteDeImportacao = lazy(() => import('./ui/AssistenteDeImportacao.tsx').then((m) => ({ default: m.AssistenteDeImportacao })));
