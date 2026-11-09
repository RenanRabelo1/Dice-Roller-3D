import { useDice } from '../store';
import type { DieKind } from '../dice/polyhedra';

const kinds: DieKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

function Force() {
  const force = useDice((s) => s.force);
  return <progress aria-label="Força" max={1} value={force} />;
}

export function Controls() {
  const kind = useDice((s) => s.kind), count = useDice((s) => s.count);
  const phase = useDice((s) => s.gesture.phase), results = useDice((s) => s.results);
  return (
    <>
      <header className="controls panel">
        <h1>Rolador de dados</h1>
        <div className="selection" role="group" aria-label="Tipo de dado">
          {kinds.map((type) => <button key={type} aria-pressed={kind === type} onClick={() => useDice.getState().setKind(type)}>{type}</button>)}
        </div>
        <div className="quantity" role="group" aria-label="Quantidade">
          <span>Quantidade</span>
          <button aria-label="Diminuir quantidade" disabled={count === 1} onClick={() => useDice.getState().setCount(count - 1)}>−</button>
          <span className="count" aria-live="polite">{count}</span>
          <button aria-label="Aumentar quantidade" disabled={count === 10} onClick={() => useDice.getState().setCount(count + 1)}>+</button>
        </div>
      </header>
      <footer className="status panel">
        <div className="feedback">
          <output data-testid="result" aria-live="polite">
            {results && <><strong>{results.reduce((sum, value) => sum + value, 0)}</strong>{results.length > 1 && <span>{results.join(' + ')}</span>}</>}
          </output>
          {phase === 'charging' && <Force />}
        </div>
        <p>{phase === 'hand' ? 'Mire com o mouse e segure para carregar a força. Solte para jogar. No teclado: setas miram, Espaço carrega e solta.'
          : phase === 'settled' ? 'Clique na mesa para pegar os dados de novo.'
            : phase === 'charging' ? 'Solte para jogar.' : phase === 'rolling' ? 'Os dados estão rolando…' : 'Recolhendo os dados…'}</p>
      </footer>
    </>
  );
}
