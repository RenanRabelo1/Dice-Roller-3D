// The throw's state as a React hook, here so the components can read it without importing cena.ts (no cycle).
import { useStore } from 'zustand';
import type { EstadoDoArremesso } from '../contracts.ts';
import { store } from '../store.ts';

// A slice of the throw's state, re-rendering when it changes.
export function useArremesso<T>(selector: (state: EstadoDoArremesso) => T): T {
  return useStore(store, selector);
}
