import { BarraDeForca, DicaDaFase, ModoDeRolagem, useArremesso } from '../modules/arremesso/cena.ts';
import { PainelDoResultado } from '../modules/vitrine/cena.ts';
import { BotoesDeDados, Chat, ResumoDaMao } from '../modules/selecao/cena.ts';
// Importacao mounts the wizard on demand: the importer (and the model loaders) only load when the player opens it.
import { Importacao, MeusDados } from '../modules/meus-dados/cena.ts';
import { PainelDaMesa } from '../modules/mesa/cena.ts';

export function Painel() {
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
