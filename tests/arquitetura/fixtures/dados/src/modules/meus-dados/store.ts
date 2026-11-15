// Allowed: the module's own store, made with zustand/vanilla's createStore.
import { createStore } from 'zustand/vanilla';

export const store = createStore(() => ({ dados: [] as string[] }));
