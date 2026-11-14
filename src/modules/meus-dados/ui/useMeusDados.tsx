// The imported dice and the wizard's state as React hooks, here so the components can read them without importing cena.ts (no cycle).
import { useStore } from 'zustand';
import type { EstadoDoAssistente, MeusDados } from '../contracts.ts';
import { assistente, store } from '../store.ts';

// The "Meus dados" list and the session warning, re-rendering when they change.
export const useMeusDados = (): MeusDados => useStore(store);

// Whether the import wizard is open, and whether it has been mounted.
export const useAssistente = (): EstadoDoAssistente => useStore(assistente);
