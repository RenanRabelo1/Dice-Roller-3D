// Violates: createStore imported from the package root (it re-exports zustand/vanilla), outside store.ts.
import { createStore } from 'zustand';

export const estado = createStore(() => ({ aberto: false }));
