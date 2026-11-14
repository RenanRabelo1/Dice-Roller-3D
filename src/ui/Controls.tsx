import { useOmenPlaying } from '../store';
import { BarraDeForca, DicaDaFase, ModoDeRolagem, useArremesso } from '../modules/arremesso/cena';
import { resultText } from '../dice/notation';
import { BotoesDeDados, Chat, ResumoDaMao } from '../modules/selecao/cena';
// Importacao mounts the wizard on demand: the importer (and the model loaders) only load when the player opens it.
import { Importacao, MeusDados } from '../modules/meus-dados/cena';
import { PainelDaMesa } from '../modules/mesa/cena';

export function Controls() {
  const phase = useArremesso((s) => s.gesture.phase), results = useArremesso((s) => s.results), thrown = useArremesso((s) => s.dice); // thrown: the dice behind `results`
  const waiting = useOmenPlaying(); // the result shows once its omen has played (or the dice are picked up)
  const text = results && !waiting && resultText(thrown, results);
  return (
    <>
      <header className="controls panel">
        <h1>Rolador de dados</h1>
        <BotoesDeDados />
        <MeusDados />
        <ResumoDaMao />
        <Chat />
        <PainelDaMesa />
        <Importacao />
      </header>
      <footer className="status panel">
        <ModoDeRolagem />
        <div className="feedback">
          <output data-testid="result" aria-live="polite">
            {text && <><strong>{text.total}</strong>{text.detail && <span>{text.detail}</span>}</>}
          </output>
          {phase === 'charging' && <BarraDeForca />}
        </div>
        <DicaDaFase />
      </footer>
    </>
  );
}
