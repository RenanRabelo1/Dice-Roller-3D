// Violates: zustand's create (renamed on import) outside store.ts.
import { create as criar } from 'zustand';

export const useEstado = criar(() => ({ aberto: false }));
