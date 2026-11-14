// Pure door of `meus-dados` (ADR 0010): the player's imported dice, saved in the browser. No React here: `useMeusDados` is in cena.ts.
export type { MeusDados } from './contracts.ts';
export { atualizar, carregar, excluir, meusDados, salvar } from './store.ts';
