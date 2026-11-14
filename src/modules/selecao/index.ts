// Pure door of `selecao` (ADR 0010): the player's hand and the chat's notation. No React here: `useSelecao` is in cena.ts.
import { selecaoAlterada as sinalDaSelecao } from './store.ts';

export type { LeituraDaNotacao, SelecaoAlterada } from './contracts.ts';
export { adicionar, definir, remover, selecao } from './store.ts';
// The module publishes (ADR 0005); outside, only subscribe.
export const selecaoAlterada: Pick<typeof sinalDaSelecao, 'subscribe'> = { subscribe: (listener) => sinalDaSelecao.subscribe(listener) };
export { formatDice, parseDice, slugOf, slugProblem } from './domain/notacao.ts';
