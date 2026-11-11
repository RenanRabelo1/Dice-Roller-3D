import { useEffect, useRef, useState } from 'react';
import { formatDice, parseDice } from '../dice/notation';
import { useDice } from '../store';

type Line = { id: number; from: 'you' | 'app'; text: string; error?: boolean };

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

// Side chat: type "2d10 + d100" (or "2d10d100d4") and press Enter / Aplicar to put those dice in the hand.
// Opens from the header button or the C key; Esc closes and returns focus to the button.
export function Chat() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); return; }
      if ((e.key === 'c' || e.key === 'C') && !typing(e.target)) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => { if (open) input.current?.focus({ preventScroll: true }); }, [open]);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const said = text.trim();
    if (!said) return;
    const r = parseDice(said);
    if ('dice' in r) useDice.getState().setDice(r.dice);
    const id = nextId.current += 2;
    setLines((l) => [...l, { id, from: 'you' as const, text: said },
      'dice' in r ? { id: id + 1, from: 'app' as const, text: `Na mão: ${formatDice(r.dice)}` } : { id: id + 1, from: 'app' as const, text: r.error, error: true }].slice(-20));
    if ('dice' in r) setText('');
  };

  return (
    <>
      <button ref={toggle} className="chat-toggle" aria-expanded={open} aria-controls="dice-chat" aria-keyshortcuts="C"
        onClick={() => setOpen((o) => !o)}>Chat <kbd>C</kbd></button>
      <aside id="dice-chat" className="chat panel" data-open={open} inert={!open} aria-label="Chat de dados">
        <header>
          <h2>Chat de dados</h2>
          <button aria-label="Fechar chat" onClick={() => { setOpen(false); toggle.current?.focus(); }}>×</button>
        </header>
        <ol className="chat-log" aria-live="polite">
          {lines.length === 0 && <li className="hint">Escreva os dados e aperte Enter. Ex.: <code>2d10 + d100</code> ou <code>2d10d100d4</code>. Dados especiais: <code>2d10v + 1d10fome</code> (Vampiro) e <code>bola de fogo</code> (8d6 de fogo).</li>}
          {lines.map((l) => <li key={l.id} className={`msg-${l.from}`} data-error={l.error || undefined}>{l.text}</li>)}
        </ol>
        <form onSubmit={apply}>
          <input ref={input} value={text} onChange={(e) => setText(e.target.value)} aria-label="Dados, por exemplo 2d10 + d100"
            placeholder="2d10 + d100" autoComplete="off" spellCheck={false} />
          <button type="submit">Aplicar</button>
        </form>
      </aside>
    </>
  );
}
