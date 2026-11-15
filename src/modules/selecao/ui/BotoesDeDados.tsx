import { KINDS } from '../../regras/index.ts';
import { BotaoDeDado } from './BotaoDeDado.tsx';

// The built-in kinds, one `div.pick` each (the imported ones are in the "Meus dados" group, of `meus-dados`).
export function BotoesDeDados() {
  return (
    <div className="selection" role="group" aria-label="Dados">
      {KINDS.map((kind) => <div className="pick" key={kind}><BotaoDeDado kind={kind} /></div>)}
    </div>
  );
}
