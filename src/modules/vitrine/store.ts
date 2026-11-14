// The showcase's state (owned by `vitrine`): a vanilla zustand store, written only here, read outside through
// `vitrine()`, `vitrineConcluida()` and `useVitrine()` (cena.ts).
import { createStore } from 'zustand/vanilla';
import type { EstadoDaVitrine } from './contracts.ts';

export const store = createStore<EstadoDaVitrine>((set) => ({
  showcased: 0,
  setShowcased: (showcased) => set({ showcased }),
}));

export const vitrine = (): EstadoDaVitrine => store.getState();
// The action never changes, so it can be taken once.
export const { setShowcased } = store.getState();

// The dice of this throw finished flying to the front (the shell uses it for the DPR and the panorama).
export const vitrineConcluida = (throwId: number): boolean => store.getState().showcased === throwId;
