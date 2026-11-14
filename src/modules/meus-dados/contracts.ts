// Types of `meus-dados`: the player's imported dice as the module keeps them.
import type { CustomDie } from '../dados/index.ts';

/** The "Meus dados" list and whether the browser keeps them (what `meusDados()` and `useMeusDados()` give). */
export interface MeusDados {
  customs: CustomDie[]; // the player's imported dice, in creation order
  sessionOnly: boolean; // IndexedDB is unavailable: imported dice last until the page closes
}
