import { nomeDoTipo } from '../../dados/index.ts';
import { MAX_DICE, type DieKind } from '../../regras/index.ts';
import { formatDice } from '../domain/notacao.ts';
import { adicionar, remover } from '../store.ts';
import { useSelecao } from './useSelecao.tsx';

// "Adicionar" and, with that kind in the hand, "Remover", as a fragment: whoever uses it builds the `div.pick` around it.
export function BotaoDeDado({ kind }: { kind: DieKind }) {
  const dice = useSelecao();
  const n = dice.filter((d) => d === kind).length, name = nomeDoTipo(kind);
  return (
    <>
      <button aria-label={`Adicionar ${name}`} aria-pressed={n > 0} disabled={dice.length >= MAX_DICE}
        onClick={() => adicionar(kind)}>{n ? formatDice(dice.filter((d) => d === kind)) : name}</button>
      {n > 0 && <button className="remove" aria-label={`Remover ${name}`} disabled={dice.length === 1}
        onClick={() => remover(kind)}>−</button>}
    </>
  );
}
