// Types of `meus-dados`: the player's imported dice as the module keeps them.
import type { CustomDie, Finish, Ink, Polyhedron } from '../dados/index.ts';
import type { CustomBase, CustomKind } from '../regras/index.ts';

/** The "Meus dados" list and whether the browser keeps them (what `meusDados()` and `useMeusDados()` give). */
export interface MeusDados {
  customs: CustomDie[]; // the player's imported dice, in creation order
  sessionOnly: boolean; // IndexedDB is unavailable: imported dice last until the page closes
}

/** What the import wizard has when it saves: `montarDado` turns it into the `CustomDie`. */
export interface PedidoDeMontagem {
  id: string; createdAt: number; // given by the caller (crypto.randomUUID(), Date.now()), so the result is deterministic
  nome: string; apelido: string; // already trimmed and checked by the wizard
  imp: { base: CustomBase; fit: CustomDie['fit'] }; // the imported solid
  arquivo: CustomDie['file'];
  printed: boolean; omens: boolean; color: string; ink: Ink; surface: Finish;
  textured: boolean; // a GLB with its own texture
  poly: Polyhedron; // the final, numbered solid
}

/** The import wizard: `montado` turns true on the first opening and stays (the lazy chunk is loaded once). */
export interface EstadoDoAssistente {
  importando: boolean; // the wizard is open
  montado: boolean; // the wizard has been opened at least once
}

/** One saved die as the test hook (`window.__dice.customs()`) sees it: what `inspecao()` gives. */
export interface DadoInspecionado {
  kind: CustomKind; id: string; name: string; slug: string; base: CustomBase; printed: boolean;
}
