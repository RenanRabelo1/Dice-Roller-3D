// The "Meus dados" group of the header: each imported die (selecao's add/remove pair, the ink, the bin) and "Importar dado".
// Its DOM is contract of the E2E and the CSS (tests/componentes.test.ts).
import { customDie, customKind, nomeDoTipo } from '../../dados/index.ts';
import type { CustomKind } from '../../regras/index.ts';
import { BotaoDeDado } from '../../selecao/cena.ts';
import { alternarImportacao, excluir } from '../store.ts';
import { InkButton } from './InkButton.tsx';
import { useAssistente, useMeusDados } from './useMeusDados.tsx';

function Meu({ type }: { type: CustomKind }) {
  const name = nomeDoTipo(type);
  return (
    <div className="pick">
      <BotaoDeDado kind={type} />
      {customDie(type)?.printed && <InkButton die={customDie(type)!} />}
      <button className="remove" aria-label={`Excluir ${name}`}
        onClick={() => { if (confirm(`Excluir ${name} deste navegador? Isso não pode ser desfeito.`)) void excluir(type); }}>🗑</button>
    </div>
  );
}

export function MeusDados() {
  const { customs } = useMeusDados(), { importando } = useAssistente();
  return (
    <div className="selection" role="group" aria-label="Meus dados">
      {customs.map((d) => <Meu key={d.id} type={customKind(d.id)} />)}
      <button aria-expanded={importando} aria-controls="import-die" onClick={alternarImportacao}>Importar dado</button>
    </div>
  );
}
