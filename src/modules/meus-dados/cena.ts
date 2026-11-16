// Scene door of `meus-dados` (ADR 0010): the React hooks and components. Everything pure is in index.ts.
import { createElement, lazy, Suspense, useState } from 'react';

export { useMeusDados } from './ui/useMeusDados.tsx';
export { MeusDados } from './ui/MeusDados.tsx';
// The wizard (and the importer and model loaders inside it) only loads when the player opens it (ADR 0007, ponto 11).
// The import() stays in this file: tests/arquitetura/leitor.test.ts proves the reader sees this edge (ADR 0009).
export const AssistenteDeImportacao = lazy(() => import('./ui/AssistenteDeImportacao.tsx').then((m) => ({ default: m.AssistenteDeImportacao })));

// The "Importar dado" chapter, mounted on its first opening and kept mounted after it closes. Here, not in ui/, to keep the import() above.
export function Importacao({ aberto, onFechar, onSalvo }: { aberto: boolean; onFechar: () => void; onSalvo: () => void }) {
  const [montado, setMontado] = useState(aberto);
  if (aberto && !montado) setMontado(true);
  return montado ? createElement(Suspense, { fallback: null }, createElement(AssistenteDeImportacao, { open: aberto, onClose: onFechar, onSaved: onSalvo })) : null;
}
