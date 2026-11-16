import { useEffect, useState } from 'react';
import { BotoesDeDados } from './BotoesDeDados.tsx';
import { ResumoDaMao } from './ResumoDaMao.tsx';
import { typing } from './campoDeTexto.ts';

// The wheel of built-in dice, next to the hand button. Open by default; the D key toggles it (not remembered between sessions).
export function RodaDeDados() {
  const [aberta, setAberta] = useState(true);
  const alternar = () => setAberta((a) => !a);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if ((e.key === 'd' || e.key === 'D') && !typing(e.target)) { e.preventDefault(); alternar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="roda" data-open={aberta}>
      <div id="roda-de-dados" className="roda-anel" inert={!aberta}><BotoesDeDados /></div>
      <button className="roda-botao" aria-label="Escolher dados" aria-expanded={aberta}
        aria-controls="roda-de-dados" aria-keyshortcuts="D" onClick={alternar}>
        <ResumoDaMao /> <kbd>D</kbd>
      </button>
    </div>
  );
}
