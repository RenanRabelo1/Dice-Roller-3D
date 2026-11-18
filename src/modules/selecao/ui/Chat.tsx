import { useEffect, useRef, useState } from 'react';
import { formatDice, parseDice } from '../domain/notacao.ts';
import { definir } from '../store.ts';
import { JanelaDosDados } from './JanelaDosDados.tsx';
import { typing } from './campoDeTexto.ts';

type Line = { id: number; from: 'you' | 'app'; text: string; error?: boolean };

// Chat chapter of the book: type "2d10 + d100" (or "2d10d100d4") and press Enter / Aplicar to put those dice in the hand.
// The shell owns the open state (and the "Chat" button); the C key (toggle) and Esc / × (close) call back into it.
export function Chat({ aberto, onAlternar, onFechar }: { aberto: boolean; onAlternar: () => void; onFechar: () => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.key === 'Escape' && aberto) { onFechar(); return; }
      if ((e.key === 'c' || e.key === 'C') && !typing(e.target)) { e.preventDefault(); onAlternar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onAlternar, onFechar]);

  useEffect(() => { if (aberto) input.current?.focus({ preventScroll: true }); }, [aberto]);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const said = text.trim();
    if (!said) return;
    const r = parseDice(said);
    if ('dice' in r) definir(r.dice);
    const id = nextId.current += 2;
    setLines((l) => [...l, { id, from: 'you' as const, text: said },
      'dice' in r ? { id: id + 1, from: 'app' as const, text: `Na mão: ${formatDice(r.dice)}` } : { id: id + 1, from: 'app' as const, text: r.error, error: true }].slice(-20));
    if ('dice' in r) setText('');
  };

  return (
    <aside id="dice-chat" className="chat" data-open={aberto} inert={!aberto} aria-label="Chat de dados">
      <header>
        <h2>Chat de dados</h2>
        <button aria-label="Fechar chat" onClick={onFechar}>×</button>
      </header>
      <ol className="chat-log" aria-live="polite">
        {lines.length === 0 && <li className="hint">Escreva os dados e aperte Enter. Ex.: <code>2d10 + d100</code> ou <code>2d10d100d4</code>. Dados especiais: <code>2d10v + 1d10fome</code> (Vampiro), <code>moeda</code> e os seus dados importados (ex.: <code>2d20caveira</code>).</li>}
        {lines.map((l) => <li key={l.id} className={`msg-${l.from}`} data-error={l.error || undefined}>{l.text}</li>)}
      </ol>
      {aberto && <JanelaDosDados texto={text} />}
      <form onSubmit={apply}>
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} aria-label="Dados, por exemplo 2d10 + d100"
          placeholder="2d10 + d100" autoComplete="off" spellCheck={false} />
        <button type="submit">Aplicar</button>
      </form>
    </aside>
  );
}
