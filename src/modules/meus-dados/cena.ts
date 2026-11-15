// Scene door of `meus-dados` (ADR 0010): the React hooks and components. Everything pure is in index.ts.
import { createElement, lazy, Suspense } from 'react';
import { fecharImportacao } from './store.ts';
import { useAssistente } from './ui/useMeusDados.tsx';

export { useMeusDados } from './ui/useMeusDados.tsx';
export { MeusDados } from './ui/MeusDados.tsx';
// The wizard (and the importer and model loaders inside it) only loads when the player opens it (ADR 0007, ponto 11).
// The import() stays in this file: tests/arquitetura/leitor.test.ts proves the reader sees this edge (ADR 0009).
export const AssistenteDeImportacao = lazy(() => import('./ui/AssistenteDeImportacao.tsx').then((m) => ({ default: m.AssistenteDeImportacao })));

// The wizard, mounted on its first opening and kept mounted after it closes. Here, not in ui/, to keep the import() above.
export function Importacao() {
  const { importando, montado } = useAssistente();
  return montado ? createElement(Suspense, { fallback: null }, createElement(AssistenteDeImportacao, { open: importando, onClose: fecharImportacao })) : null;
}
