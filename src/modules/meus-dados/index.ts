// Pure door of `meus-dados` (ADR 0010): the player's imported dice, saved in the browser. No React here: `useMeusDados` is in cena.ts.
export type { MeusDados, PedidoDeMontagem } from './contracts.ts';
export { atualizar, carregar, excluir, meusDados, salvar } from './store.ts';
export { montarDado, tintaPermitida } from './domain/montagem.ts';
// The importer is heavy (three's ConvexHull, the model readers): it loads on demand, never with this door (ADR 0007, ponto 11).
export const carregarImportador = () => import('./domain/importador.ts');
export type { Imported, Plane, Solid } from './domain/importador.ts';
