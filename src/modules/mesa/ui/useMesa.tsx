// The table's state as a React hook, here so the components can read it without importing cena.ts (no cycle).
import { useStore } from 'zustand';
import type { TableState } from '../contracts.ts';
import { store } from '../store.ts';

// The whole state, or a slice of it, re-rendering when it changes.
export function useMesa(): TableState;
export function useMesa<T>(selector: (state: TableState) => T): T;
export function useMesa<T>(selector?: (state: TableState) => T) {
  return useStore(store, selector ?? ((s: TableState) => s as unknown as T));
}
