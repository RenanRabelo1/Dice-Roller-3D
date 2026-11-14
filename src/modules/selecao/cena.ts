// Scene door of `selecao` (ADR 0010): the React hooks. Everything pure is in index.ts.
import { useStore } from 'zustand';
import type { DieKind } from '../regras/index.ts';
import { store } from './store.ts';

// The hand, re-rendering when it changes.
export const useSelecao = (): DieKind[] => useStore(store, (s) => s.dice);
