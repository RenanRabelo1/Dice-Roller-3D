import { formatDice } from '../domain/notacao.ts';
import { useSelecao } from './useSelecao.tsx';

// The hand in words ("2d10 + 1d10 Vampiro"), read aloud when it changes.
export function ResumoDaMao() {
  return <p className="pool" aria-live="polite">{formatDice(useSelecao())}</p>;
}
