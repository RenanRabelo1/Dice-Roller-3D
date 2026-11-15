// Violates: the ADR 0008 permission is only falha.ts, not the rest of shared/plataforma.
import { createStore } from 'zustand/vanilla';

export const store = createStore(() => ({ outra: 0 }));
