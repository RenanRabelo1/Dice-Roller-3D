// The omen's state as React hooks, here so the components can read it without importing cena.ts (no cycle).
import { useStore } from 'zustand';
import { useArremesso } from '../../arremesso/cena.ts';
import type { EstadoDoPresagio } from '../contracts.ts';
import { store, tocando } from '../store.ts';

// A slice of the omen's state, re-rendering when it changes.
export function usePresagio<T>(selector: (state: EstadoDoPresagio) => T): T {
  return useStore(store, selector);
}

// presagioTocando() as a React hook: re-renders when the throw's phase or throwId, or the omen, change.
export function usePresagioTocando(): boolean {
  const phase = useArremesso((a) => a.gesture.phase), throwId = useArremesso((a) => a.throwId);
  const omen = usePresagio((p) => p.omen), omenDone = usePresagio((p) => p.omenDone);
  return tocando(phase, throwId, omen, omenDone);
}
