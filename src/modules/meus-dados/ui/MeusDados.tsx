// The "Meus dados" chapter of the book: each imported die (selecao's add/remove pair, the ink, the bin) and "Forjar um dado novo".
// Its DOM is contract of the E2E and the CSS (tests/componentes.test.ts).
import { useEffect } from 'react';
import { customDie, customKind, nomeDoTipo } from '../../dados/index.ts';
import type { CustomKind } from '../../regras/index.ts';
import { BotaoDeDado } from '../../selecao/cena.ts';
import { excluir } from '../store.ts';
import { InkButton } from './InkButton.tsx';
import { useMeusDados } from './useMeusDados.tsx';

function Meu({ type }: { type: CustomKind }) {
  const name = nomeDoTipo(type);
  return (
    <div className="pick">
      <BotaoDeDado kind={type} />
      {customDie(type)?.printed && <InkButton die={customDie(type)!} />}
      <button className="remove" aria-label={`Excluir ${name}`}
        onClick={() => { if (confirm(`Excluir ${name} deste navegador? Isso não pode ser desfeito.`)) void excluir(type); }}>Excluir</button>
    </div>
  );
}

export function MeusDados({ aberto, onFechar, onImportar }: { aberto: boolean; onFechar: () => void; onImportar: () => void }) {
  const { customs } = useMeusDados();
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);
  return (
    <aside id="meus-dados" className="chat panel import" data-open={aberto} inert={!aberto} aria-label="Meus dados">
      <header><h2>Meus dados</h2><button aria-label="Fechar Meus dados" onClick={onFechar}>×</button></header>
      <div className="import-body">
        {customs.length === 0 && <p className="import-note">Nenhum dado importado ainda.</p>}
        <div className="selection">
          {customs.map((d) => <Meu key={d.id} type={customKind(d.id)} />)}
        </div>
        <button className="primary" onClick={onImportar}>Forjar um dado novo</button>
      </div>
    </aside>
  );
}
