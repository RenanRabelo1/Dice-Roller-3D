// The player's imported dice (owned by `meus-dados`): a vanilla zustand store, written only here, read outside through
// `meusDados()` and `useMeusDados()` (cena.ts). Each die reaches the catalogue of `dados` by registerCustom/unregisterCustom.
// A second store keeps the wizard's state (open, mounted), apart so the list and its tests stay as they were.
import { createStore } from 'zustand/vanilla';
import { customDie, customList, registerCustom, unregisterCustom, type CustomDie } from '../dados/index.ts';
import type { CustomKind } from '../regras/index.ts';
import type { EstadoDoAssistente, MeusDados } from './contracts.ts';
// Imported statically: its defineStore must run before the database opens (armadilhas.md).
import { deleteCustomDie, listCustomDice, saveCustomDie } from './repository.ts';

export const store = createStore<MeusDados>(() => ({ customs: [], sessionOnly: false }));
const set = store.setState;
export const assistente = createStore<EstadoDoAssistente>(() => ({ importando: false, montado: false }));

// The wizard mounts on its first opening and stays mounted after it closes (its chunk loads once).
export const alternarImportacao = (): void => assistente.setState((s) => ({ montado: true, importando: !s.importando }));
export const fecharImportacao = (): void => assistente.setState({ importando: false });

export const meusDados = (): MeusDados => store.getState();

export const carregar = async (): Promise<void> => {
  try {
    const saved = await listCustomDice();
    saved.forEach(registerCustom);
    set({ customs: customList(), sessionOnly: false });
  } catch { set({ sessionOnly: true }); }
};

// null, or why it could not be saved.
export const salvar = async (die: CustomDie): Promise<string | null> => {
  let failure: string | null = null;
  try { await saveCustomDie(die); } catch (e) {
    // A full disk loses the die; no IndexedDB at all just keeps it for this session.
    if (e instanceof DOMException && e.name === 'QuotaExceededError') return 'Não coube no armazenamento do navegador. Libere espaço ou use um modelo menor.';
    failure = 'session';
  }
  registerCustom(die);
  set({ customs: customList(), sessionOnly: failure !== null || store.getState().sessionOnly });
  return null;
};

// Save a changed die (e.g. its ink); the selection stays.
export const atualizar = async (die: CustomDie): Promise<string | null> => {
  // Applied at once (the controls and the scene follow the store), saved after; a failed save keeps it for this session.
  registerCustom(die);
  set({ customs: customList() });
  try { await saveCustomDie(die); } catch (e) {
    set({ sessionOnly: true });
    if (e instanceof DOMException && e.name === 'QuotaExceededError') return 'Não coube no armazenamento do navegador; a mudança vale só nesta sessão.';
  }
  return null;
};

export const excluir = async (kind: CustomKind): Promise<void> => {
  const die = customDie(kind);
  if (!die) return;
  try { await deleteCustomDie(die.id); } catch { /* session-only: nothing stored */ }
  // selecao takes the kind out of the hand (catalogoAlterado) and the throw's copy follows, before the customs update.
  unregisterCustom(kind);
  set({ customs: customList() });
};
