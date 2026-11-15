// Types of `selecao`: the player's hand and what reading the chat's notation gives.
import type { DieKind } from '../regras/index.ts';

/** Published on every accepted change of the hand, even when it ends up the same. */
export interface SelecaoAlterada { dice: DieKind[] }

/** What `parseDice` gives: the hand it reads, or why it could not (in pt-BR). */
export type LeituraDaNotacao = { dice: DieKind[] } | { error: string };
