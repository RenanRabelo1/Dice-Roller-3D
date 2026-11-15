// Violates: zustand/vanilla's createStore (renamed on import) outside store.ts.
import { createStore as criarStore } from 'zustand/vanilla';

export const estado = criarStore(() => ({ aberto: false }));
