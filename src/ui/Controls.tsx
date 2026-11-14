import { BarraDeForca, DicaDaFase, ModoDeRolagem, useArremesso } from '../modules/arremesso/cena';
import { PainelDoResultado } from '../modules/vitrine/cena';
import { BotoesDeDados, Chat, ResumoDaMao } from '../modules/selecao/cena';
// Importacao mounts the wizard on demand: the importer (and the model loaders) only load when the player opens it.
import { Importacao, MeusDados } from '../modules/meus-dados/cena';
import { PainelDaMesa } from '../modules/mesa/cena';

export function Controls() {
  const phase = useArremesso((s) => s.gesture.phase);
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
          <PainelDoResultado />
          {phase === 'charging' && <BarraDeForca />}
        </div>
        <DicaDaFase />
      </footer>
    </>
  );
}
