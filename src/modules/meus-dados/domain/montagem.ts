// The saved die put together from what the import wizard has, and the ink a model may wear. Pure: tested in Node.
import { customKind, type CustomDie, type Ink } from '../../dados/index.ts';
import { tipoParaPresagio } from '../../regras/index.ts';
import type { PedidoDeMontagem } from '../contracts.ts';

// On a model with its own texture the ink multiplies it, so only dark ink (or none) is allowed: any other becomes dark.
export const tintaPermitida = (ink: Ink, textured: boolean): Ink => (textured && ink !== 'nenhuma' ? 'escura' : ink);

export function montarDado(p: PedidoDeMontagem): CustomDie {
  const stl = p.arquivo.format === 'stl';
  return {
    version: 1, id: p.id, createdAt: p.createdAt, name: p.nome, slug: p.apelido, base: p.imp.base,
    // Only a d20 base raises omens (a free-form die never does): the same rule the omens read with.
    omens: tipoParaPresagio({ kind: customKind(p.id), base: p.imp.base, omens: p.omens }) === 'd20',
    file: p.arquivo, fit: p.imp.fit, poly: p.poly, printed: p.printed, color: stl ? p.color : null,
    ...(p.printed ? { ink: tintaPermitida(p.ink, p.textured) } : {}), ...(stl ? { finish: p.surface } : {}),
  };
}
