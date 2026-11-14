// The hand (owned by `selecao`): a vanilla zustand store, written only here, read outside through `selecao()`
// and `useSelecao()` (cena.ts). Every accepted change publishes `selecaoAlterada` (ADR 0005), even when the hand ends up the same.
import { createStore } from 'zustand/vanilla';
import { createSignal } from '../../shared/events.ts';
import { catalogoAlterado } from '../dados/index.ts';
import type { DieKind } from '../regras/index.ts';
import type { SelecaoAlterada } from './contracts.ts';
import { comAdicionado, definida, MAO_INICIAL, semRemovido, semTipo } from './domain/mao.ts';

export const store = createStore<{ dice: DieKind[] }>(() => ({ dice: [...MAO_INICIAL] }));
export const selecaoAlterada = createSignal<SelecaoAlterada>();

const aplicar = (dice: DieKind[] | null): void => {
  if (!dice) return; // refused: nothing changes and nothing is published
  store.setState({ dice });
  selecaoAlterada.emit({ dice });
};

export const selecao = (): DieKind[] => store.getState().dice;
export const adicionar = (kind: DieKind): void => aplicar(comAdicionado(selecao(), kind));
export const remover = (kind: DieKind): void => aplicar(semRemovido(selecao(), kind));
export const definir = (dice: DieKind[]): void => aplicar(definida(dice));

// A kind gone from the catalogue leaves the hand, always publishing (the throw resets as it did). Subscribed when the
// module loads and never cancelled: the hand lives as long as the app.
catalogoAlterado.subscribe(({ kind, mudanca }) => { if (mudanca === 'removido') aplicar(semTipo(selecao(), kind)); });
