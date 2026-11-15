// Violates: zustand/vanilla's createStore through a namespace, outside store.ts.
import * as zv from 'zustand/vanilla';

export const estado = zv.createStore(() => ({ aberto: false }));
