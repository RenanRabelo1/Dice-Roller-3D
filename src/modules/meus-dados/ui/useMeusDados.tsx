// The imported dice as a React hook, here so the components can read them without importing cena.ts (no cycle).
import { useStore } from 'zustand';
import type { MeusDados } from '../contracts.ts';
import { store } from '../store.ts';

// The "Meus dados" list and the session warning, re-rendering when they change.
export const useMeusDados = (): MeusDados => useStore(store);
