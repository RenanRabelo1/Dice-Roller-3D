// The showcase's state as a React hook, here so the components can read it without importing cena.ts (no cycle).
import { useStore } from 'zustand';
import type { EstadoDaVitrine } from '../contracts.ts';
import { store } from '../store.ts';

// A slice of the showcase's state, re-rendering when it changes.
export function useVitrine<T>(selector: (state: EstadoDaVitrine) => T): T {
  return useStore(store, selector);
}
