// The "Meus dados" chapter of the book: on the left page each imported die (selecao's add/remove pair, Editar, the bin) and
// "Forjar um dado novo" under the list; on the right page the sheet of the chosen die (OS-0085).
// Its DOM is contract of the E2E and the CSS (tests/componentes.test.ts).
import { useEffect, useState } from 'react';
import { customKind, nomeDoTipo } from '../../dados/index.ts';
import type { CustomKind } from '../../regras/index.ts';
import { BotaoDeDado } from '../../selecao/cena.ts';
import { movimentoReduzido } from '../../../shared/plataforma/index.ts';
import { excluir } from '../store.ts';
import { FichaDoDado } from './FichaDoDado.tsx';
import { useMeusDados } from './useMeusDados.tsx';

function Meu({ type, escolhido, onEditar }: { type: CustomKind; escolhido: boolean; onEditar: () => void }) {
  const name = nomeDoTipo(type);
  return (
    <div className="pick" data-escolhido={escolhido}>
      <BotaoDeDado kind={type} />
      <button aria-label={`Editar ${name}`} aria-pressed={escolhido} onClick={onEditar}>Editar</button>
      <button className="remove" aria-label={`Excluir ${name}`}
        onClick={() => { if (confirm(`Excluir ${name} deste navegador? Isso não pode ser desfeito.`)) void excluir(type); }}>Excluir</button>
    </div>
  );
}

export function MeusDados({ aberto, onFechar, onImportar }: { aberto: boolean; onFechar: () => void; onImportar: () => void }) {
  const { customs } = useMeusDados();
  const [escolhidoId, setEscolhidoId] = useState<string | undefined>();
  // The first die until another is chosen; deleting the chosen one falls to the first that is left.
  const escolhido = customs.find((d) => d.id === escolhidoId) ?? customs[0];
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);
  const editar = (id: string) => {
    setEscolhidoId(id);
    // On the phone the sheet sits under the list.
    if (window.matchMedia('(max-width: 800px)').matches)
      document.querySelector('#meus-dados .ficha-do-dado')?.scrollIntoView({ behavior: movimentoReduzido() ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <aside id="meus-dados" className="chat import" data-open={aberto} inert={!aberto} aria-label="Meus dados">
      <header><h2>Meus dados</h2><button aria-label="Fechar Meus dados" onClick={onFechar}>×</button></header>
      <div className="import-body">
        {customs.length === 0 && <p className="import-note">Nenhum dado importado ainda.</p>}
        <div className="selection">
          {customs.map((d) => <Meu key={d.id} type={customKind(d.id)} escolhido={d.id === escolhido?.id} onEditar={() => editar(d.id)} />)}
        </div>
      </div>
      <button className="primary" onClick={onImportar}>Forjar um dado novo</button>
      {aberto && <FichaDoDado die={escolhido} />}
    </aside>
  );
}
