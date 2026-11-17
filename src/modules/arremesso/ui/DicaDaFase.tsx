import { useFalha } from '../../../shared/plataforma/index.ts';
import { useArremesso } from './useArremesso.tsx';

// The help text of each phase, or the warning that the physics failed (the dice went back to the hand).
export function DicaDaFase() {
  const phase = useArremesso((s) => s.gesture.phase);
  const failed = useFalha() === 'physics';
  const texto = failed ? 'A física não respondeu; os dados voltaram para a mão. Tente jogar de novo.' : phase === 'hand' ? 'Mire com o mouse e segure para carregar a força. Solte para jogar. No teclado: setas miram, Espaço carrega e solta.'
    : phase === 'settled' ? 'Clique na mesa para pegar os dados de novo.'
      : phase === 'charging' ? 'Solte para jogar.' : phase === 'rolling' ? 'Os dados estão rolando…' : 'Recolhendo os dados…';
  // The key restarts the CSS fade each time the text changes.
  return <p key={texto}>{texto}</p>;
}
