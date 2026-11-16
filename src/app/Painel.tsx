import { useRef, useState } from 'react';
import { BarraDeForca, DicaDaFase, ModoDeRolagem, useArremesso } from '../modules/arremesso/cena.ts';
import { PainelDoResultado } from '../modules/vitrine/cena.ts';
import { Chat, RodaDeDados } from '../modules/selecao/cena.ts';
// Importacao mounts the wizard on demand: the importer (and the model loaders) only load when the player opens it.
import { Importacao, MeusDados } from '../modules/meus-dados/cena.ts';
import { PainelDaMesa } from '../modules/mesa/cena.ts';

type Capitulo = 'chat' | 'mesa'; // OS-0054 adds 'meus' and 'importar'

export function Painel() {
  const phase = useArremesso((s) => s.gesture.phase);
  // The book: one open chapter at a time. Closing from Esc or × returns focus to its button; the shortcut does not.
  const [capitulo, setCapitulo] = useState<Capitulo | null>(null);
  const gatilhos = useRef<Partial<Record<Capitulo, HTMLButtonElement | null>>>({});
  const alternar = (c: Capitulo) => setCapitulo((a) => (a === c ? null : c));
  const fechar = (c: Capitulo) => { setCapitulo((a) => (a === c ? null : a)); gatilhos.current[c]?.focus(); };
  return (
    <>
      <header className="controls panel">
        <h1>Rolador de dados</h1>
        <MeusDados />
        <Importacao />
        <nav aria-label="Livro">
          <button ref={(el) => { gatilhos.current.mesa = el; }} className="chat-toggle" aria-expanded={capitulo === 'mesa'}
            aria-controls="table-panel" aria-keyshortcuts="M" onClick={() => alternar('mesa')}>Mesa <kbd>M</kbd></button>
          <button ref={(el) => { gatilhos.current.chat = el; }} className="chat-toggle" aria-expanded={capitulo === 'chat'}
            aria-controls="dice-chat" aria-keyshortcuts="C" onClick={() => alternar('chat')}>Chat <kbd>C</kbd></button>
        </nav>
      </header>
      <div className="livro" data-aberto={capitulo !== null}>
        <PainelDaMesa aberto={capitulo === 'mesa'} onAlternar={() => alternar('mesa')} onFechar={() => fechar('mesa')} />
        <Chat aberto={capitulo === 'chat'} onAlternar={() => alternar('chat')} onFechar={() => fechar('chat')} />
      </div>
      <footer className="status panel">
        <ModoDeRolagem />
        <div className="feedback">
          <PainelDoResultado />
          {phase === 'charging' && <BarraDeForca />}
        </div>
        <DicaDaFase />
        <RodaDeDados />
      </footer>
    </>
  );
}
