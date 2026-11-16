// Pure door of `meus-dados` (ADR 0010): the player's imported dice, saved in the browser. No React here: `useMeusDados` is in cena.ts.
import { customKind } from '../dados/index.ts';
import type { DadoInspecionado } from './contracts.ts';
import { meusDados } from './store.ts';

export type { DadoInspecionado, MeusDados, PedidoDeMontagem } from './contracts.ts';
export { atualizar, carregar, excluir, meusDados, salvar } from './store.ts';
export { montarDado, tintaPermitida } from './domain/montagem.ts';
// The importer is heavy (three's ConvexHull, the model readers): it loads on demand, never with this door (ADR 0007, ponto 11).
export const carregarImportador = () => import('./domain/importador.ts');
export type { Imported, Plane, Solid } from './domain/importador.ts';

// The saved dice as the test hook reads them (`window.__dice.customs()`), in creation order.
export const inspecao = (): DadoInspecionado[] =>
  meusDados().customs.map((d) => ({ kind: customKind(d.id), id: d.id, name: d.name, slug: d.slug, base: d.base, printed: d.printed }));
