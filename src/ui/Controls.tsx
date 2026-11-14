import { useOmenPlaying } from '../store';
import { setChargeMode } from '../modules/arremesso/index';
import { useArremesso } from '../modules/arremesso/cena';
import { useFalha } from '../shared/plataforma';
import { resultText } from '../dice/notation';
import { BotoesDeDados, Chat, ResumoDaMao } from '../modules/selecao/cena';
// Importacao mounts the wizard on demand: the importer (and the model loaders) only load when the player opens it.
import { Importacao, MeusDados } from '../modules/meus-dados/cena';
import { TablePanel } from './TablePanel';

// Bottom left: how the charge moves while you hold (see arremesso/domain/aim.ts).
const MODES = [
  ['relative', 'Relativa', 'A força sobe e desce enquanto você segura: solte na hora certa.'],
  ['static', 'Estática', 'A força só sobe, até o máximo, e fica no máximo até você soltar.'],
] as const;
function RollMode() {
  const mode = useArremesso((s) => s.chargeMode);
  return (
    <div className="roll-mode" role="radiogroup" aria-label="Rolagem">
      <span aria-hidden="true">Rolagem</span>
      {MODES.map(([value, name, hint]) => (
        <label key={value} title={hint}>
          <input type="radio" name="roll-mode" value={value} checked={mode === value} onChange={() => setChargeMode(value)} />
          {name}
        </label>
      ))}
    </div>
  );
}

function Force() {
  const force = useArremesso((s) => s.force);
  return <progress aria-label="Força" max={1} value={force} />;
}

export function Controls() {
  const phase = useArremesso((s) => s.gesture.phase), results = useArremesso((s) => s.results), thrown = useArremesso((s) => s.dice); // thrown: the dice behind `results`
  const waiting = useOmenPlaying(); // the result shows once its omen has played (or the dice are picked up)
  const failed = useFalha() === 'physics';
  const text = results && !waiting && resultText(thrown, results);
  return (
    <>
      <header className="controls panel">
        <h1>Rolador de dados</h1>
        <BotoesDeDados />
        <MeusDados />
        <ResumoDaMao />
        <Chat />
        <TablePanel />
        <Importacao />
      </header>
      <footer className="status panel">
        <RollMode />
        <div className="feedback">
          <output data-testid="result" aria-live="polite">
            {text && <><strong>{text.total}</strong>{text.detail && <span>{text.detail}</span>}</>}
          </output>
          {phase === 'charging' && <Force />}
        </div>
        <p>{failed ? 'A física não respondeu; os dados voltaram para a mão. Tente jogar de novo.' : phase === 'hand' ? 'Mire com o mouse e segure para carregar a força. Solte para jogar. No teclado: setas miram, Espaço carrega e solta.'
          : phase === 'settled' ? 'Clique na mesa para pegar os dados de novo.'
            : phase === 'charging' ? 'Solte para jogar.' : phase === 'rolling' ? 'Os dados estão rolando…' : 'Recolhendo os dados…'}</p>
      </footer>
    </>
  );
}
