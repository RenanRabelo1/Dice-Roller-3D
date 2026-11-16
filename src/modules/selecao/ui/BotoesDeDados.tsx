import type { CSSProperties } from 'react';
import { KINDS } from '../../regras/index.ts';
import { BotaoDeDado } from './BotaoDeDado.tsx';

// The built-in kinds, one `div.pick` each (the imported ones are in the "Meus dados" group, of `meus-dados`).
export function BotoesDeDados() {
  return (
    <div className="selection" role="group" aria-label="Dados" style={{ '--n': KINDS.length } as CSSProperties}>
      {KINDS.map((kind, i) => <div className="pick" key={kind} style={{ '--i': i } as CSSProperties}><BotaoDeDado kind={kind} /></div>)}
    </div>
  );
}
