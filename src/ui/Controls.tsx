import { lazy, Suspense, useCallback, useState } from 'react';
import { useDice } from '../store';
import { customDie, customKind, finishOf, isCustom, type CustomDie } from '../dice/custom';
import { KINDS, MAX_DICE, type DieKind } from '../dice/polyhedra';
import { dieName, formatDice, resultText } from '../dice/notation';
import { Chat } from './Chat';
import { InkChoice } from './InkChoice';
import { TablePanel } from './TablePanel';

// The importer (and the model loaders) only load when the player opens it.
const ImportDie = lazy(() => import('./ImportDie').then((m) => ({ default: m.ImportDie })));


// The ink and finish of one imported die, changed in place (nothing is imported again).
function InkButton({ die }: { die: CustomDie }) {
  const [textured, setTextured] = useState(false);
  const change = (patch: Partial<CustomDie>) => { void useDice.getState().updateCustom({ ...die, ...patch }); };
  return (
    <details className="ink-pop" onToggle={(e) => {
      if (e.currentTarget.open && die.file.format === 'glb') void import('../dice/importer').then((m) => m.modelObject(die)).then((o) => import('../dice/importer').then((m) => setTextured(m.hasTexture(o))));
    }}>
      <summary aria-label={`Tinta de ${die.name}`}>Tinta</summary>
      <InkChoice ink={die.ink ?? 'auto'} finish={finishOf(die)} engraved stl={die.file.format === 'stl'} textured={textured}
        onInk={(ink) => change({ ink })} onFinish={(finish) => change({ finish })} />
    </details>
  );
}

function Force() {
  const force = useDice((s) => s.force);
  return <progress aria-label="Força" max={1} value={force} />;
}

export function Controls() {
  const dice = useDice((s) => s.dice), customs = useDice((s) => s.customs);
  const [importing, setImporting] = useState(false), [mounted, setMounted] = useState(false);
  const closeImport = useCallback(() => setImporting(false), []);
  const pick = (type: DieKind, mine = false) => {
    const n = dice.filter((d) => d === type).length, name = dieName(type);
    return (
      <div className="pick" key={type}>
        <button aria-label={`Adicionar ${name}`} aria-pressed={n > 0} disabled={dice.length >= MAX_DICE}
          onClick={() => useDice.getState().addDie(type)}>{n ? formatDice(dice.filter((d) => d === type)) : name}</button>
        {n > 0 && <button className="remove" aria-label={`Remover ${name}`} disabled={dice.length === 1}
          onClick={() => useDice.getState().removeDie(type)}>−</button>}
        {mine && isCustom(type) && customDie(type)?.printed && <InkButton die={customDie(type)!} />}
        {mine && <button className="remove" aria-label={`Excluir ${name}`}
          onClick={() => { if (confirm(`Excluir ${name} deste navegador? Isso não pode ser desfeito.`)) void useDice.getState().removeCustom(type as `custom:${string}`); }}>🗑</button>}
      </div>
    );
  };
  const phase = useDice((s) => s.gesture.phase), results = useDice((s) => s.results);
  const omen = useDice((s) => s.omen), omenDone = useDice((s) => s.omenDone), throwId = useDice((s) => s.throwId);
  const waiting = omen?.throwId === throwId && omenDone !== throwId; // the result shows once its omen has played
  const text = results && !waiting && resultText(dice, results);
  return (
    <>
      <header className="controls panel">
        <h1>Rolador de dados</h1>
        <div className="selection" role="group" aria-label="Dados">
          {KINDS.map((type) => pick(type))}
        </div>
        <div className="selection" role="group" aria-label="Meus dados">
          {customs.map((d) => pick(customKind(d.id), true))}
          <button aria-expanded={importing} aria-controls="import-die" onClick={() => { setMounted(true); setImporting((o) => !o); }}>Importar dado</button>
        </div>
        <p className="pool" aria-live="polite">{formatDice(dice)}</p>
        <Chat />
        <TablePanel />
        {mounted && <Suspense fallback={null}><ImportDie open={importing} onClose={closeImport} /></Suspense>}
      </header>
      <footer className="status panel">
        <div className="feedback">
          <output data-testid="result" aria-live="polite">
            {text && <><strong>{text.total}</strong>{text.detail && <span>{text.detail}</span>}</>}
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
