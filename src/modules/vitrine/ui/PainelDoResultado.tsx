import { useArremesso } from '../../arremesso/cena.ts';
import { usePresagioTocando } from '../../pressagios/cena.ts';
import { resultText } from '../domain/painel.ts';

// The result panel: the total and the detail, once there is a result and its omen has played (or the dice are picked up).
export function PainelDoResultado() {
  const results = useArremesso((s) => s.results), thrown = useArremesso((s) => s.dice); // thrown: the dice behind `results`
  const waiting = usePresagioTocando();
  const text = results && !waiting && resultText(thrown, results);
  return (
    <output data-testid="result" aria-live="polite">
      {text && <><strong>{text.total}</strong>{text.detail && <span>{text.detail}</span>}</>}
    </output>
  );
}
