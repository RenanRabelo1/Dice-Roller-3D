// The hand as a React hook, here so the components can read it without importing cena.ts (no cycle).
import { useStore } from 'zustand';
import type { DieKind } from '../../regras/index.ts';
import { store } from '../store.ts';

// The hand, re-rendering when it changes.
export const useSelecao = (): DieKind[] => useStore(store, (s) => s.dice);
