import { lazy, Suspense, useCallback, useState } from 'react';
import { omenPlaying, useDice } from '../store';
import { useFalha } from '../shared/plataforma';
import { carregarModelo, customDie, customKind, finishOf, hasTexture, nomeDoTipo, type CustomDie } from '../modules/dados/index';
import type { CustomKind } from '../modules/regras/index';
import { resultText } from '../dice/notation';
import { BotaoDeDado, BotoesDeDados, Chat, ResumoDaMao } from '../modules/selecao/cena';
import { atualizar, excluir } from '../modules/meus-dados/index';
import { useMeusDados } from '../modules/meus-dados/cena';
import { InkChoice } from './InkChoice';
import { TablePanel } from './TablePanel';

// The importer (and the model loaders) only load when the player opens it.
const ImportDie = lazy(() => import('./ImportDie').then((m) => ({ default: m.ImportDie })));


// The ink and finish of one imported die, changed in place (nothing is imported again).
function InkButton({ die }: { die: CustomDie }) {
  const [textured, setTextured] = useState(false);
  const change = (patch: Partial<CustomDie>) => { void atualizar({ ...die, ...patch }); };
  return (
    <details className="ink-pop" onToggle={(e) => {
      if (e.currentTarget.open && die.file.format === 'glb') void carregarModelo(die).then((o) => setTextured(hasTexture(o)));
    }}>
      <summary aria-label={`Tinta de ${die.name}`}>Tinta</summary>
      <InkChoice ink={die.ink ?? 'auto'} finish={finishOf(die)} engraved stl={die.file.format === 'stl'} textured={textured}
        onInk={(ink) => change({ ink })} onFinish={(finish) => change({ finish })} />
    </details>
  );
}

// Bottom left: how the charge moves while you hold (see throw/aim.ts).
const MODES = [
  ['relative', 'Relativa', 'A força sobe e desce enquanto você segura: solte na hora certa.'],
  ['static', 'Estática', 'A força só sobe, até o máximo, e fica no máximo até você soltar.'],
] as const;
function RollMode() {
  const mode = useDice((s) => s.chargeMode);
  return (
    <div className="roll-mode" role="radiogroup" aria-label="Rolagem">
      <span aria-hidden="true">Rolagem</span>
      {MODES.map(([value, name, hint]) => (
        <label key={value} title={hint}>
          <input type="radio" name="roll-mode" value={value} checked={mode === value} onChange={() => useDice.getState().setChargeMode(value)} />
          {name}
        </label>
      ))}
    </div>
  );
}

function Force() {
  const force = useDice((s) => s.force);
  return <progress aria-label="Força" max={1} value={force} />;
}

export function Controls() {
  const { customs } = useMeusDados();
  const [importing, setImporting] = useState(false), [mounted, setMounted] = useState(false);
  const closeImport = useCallback(() => setImporting(false), []);
  // An imported die: selecao's add/remove pair, then the ink and the bin (of meus-dados, still here).
  const mine = (type: CustomKind) => {
    const name = nomeDoTipo(type);
    return (
      <div className="pick" key={type}>
        <BotaoDeDado kind={type} />
        {customDie(type)?.printed && <InkButton die={customDie(type)!} />}
        <button className="remove" aria-label={`Excluir ${name}`}
          onClick={() => { if (confirm(`Excluir ${name} deste navegador? Isso não pode ser desfeito.`)) void excluir(type); }}>🗑</button>
      </div>
    );
  };
  const phase = useDice((s) => s.gesture.phase), results = useDice((s) => s.results), thrown = useDice((s) => s.dice); // thrown: the dice behind `results`
  const waiting = useDice(omenPlaying); // the result shows once its omen has played (or the dice are picked up)
  const failed = useFalha() === 'physics';
  const text = results && !waiting && resultText(thrown, results);
  return (
    <>
      <header className="controls panel">
        <h1>Rolador de dados</h1>
        <BotoesDeDados />
        <div className="selection" role="group" aria-label="Meus dados">
          {customs.map((d) => mine(customKind(d.id)))}
          <button aria-expanded={importing} aria-controls="import-die" onClick={() => { setMounted(true); setImporting((o) => !o); }}>Importar dado</button>
        </div>
        <ResumoDaMao />
        <Chat />
        <TablePanel />
        {mounted && <Suspense fallback={null}><ImportDie open={importing} onClose={closeImport} /></Suspense>}
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
