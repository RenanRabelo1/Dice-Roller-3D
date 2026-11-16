import { useArremesso } from '../../arremesso/cena.ts';
import { usePresagio, usePresagioTocando } from '../../pressagios/cena.ts';
import { omenKind } from '../../regras/index.ts';
import { resultText } from '../domain/painel.ts';

// The result panel: the total and the detail, once there is a result and its omen has played (or the dice are picked up).
export function PainelDoResultado() {
  const results = useArremesso((s) => s.results), thrown = useArremesso((s) => s.dice); // thrown: the dice behind `results`
  const throwId = useArremesso((s) => s.throwId);
  const waiting = usePresagioTocando();
  const omen = usePresagio((s) => s.omen);
  const text = results && !waiting && resultText(thrown, results);
  return (
    // data-presagio: this throw's omen, for the shell's CSS (gold or ember); absent without text or omen.
    <output data-testid="result" aria-live="polite" data-presagio={text && omen?.throwId === throwId ? omenKind(omen) : undefined}>
      {text && <><strong>{text.total}</strong>{text.detail && <span>{text.detail}</span>}</>}
    </output>
  );
}
