// The throw's state (owned by `arremesso`): a vanilla zustand store, written only here, read outside through
// `arremesso()` and `useArremesso()` (cena.ts). Each publication announces `resultadoPublicado` (ADR 0005).
import { createStore } from 'zustand/vanilla';
import { createSignal } from '../../shared/events.ts';
import { selecao, selecaoAlterada } from '../selecao/index.ts';
import type { Effect, EstadoDoArremesso, Launch, ResultadoPublicado } from './contracts.ts';
import { initialGesture, reduce } from './domain/gesture.ts';
import { HAND } from './domain/world.ts';
import { savedMode, saveMode } from './repository.ts';

const selection = (s: EstadoDoArremesso) => ({
  gesture: reduce(s.gesture, { type: 'selection' }).state,
  throwId: s.throwId + 1,
  launch: null,
  results: null,
  force: 0,
});

export const resultadoPublicado = createSignal<ResultadoPublicado>();

export const store = createStore<EstadoDoArremesso>((set, get) => ({
  dice: selecao(), gesture: initialGesture, throwId: 0,
  aim: [0, 0, -1], force: 0, chargeMode: savedMode(), launch: null, results: null, raw: null, ready: false,
  reiniciar: () => set((s) => selection(s)),
  setAim: (aim) => set({ aim: [...aim] }),
  setForce: (force) => set({ force }),
  setChargeMode: (chargeMode) => {
    set({ chargeMode });
    saveMode(chargeMode);
  },
  setReady: () => set({ ready: true }),
  input: (event, hand) => {
    let effect: Effect = { type: 'none' };
    set((s) => {
      const next = reduce(s.gesture, event.type === 'release' ? { ...event, mode: s.chargeMode } : event);
      effect = next.effect;
      if (effect.type !== 'throw') return { gesture: next.state };
      const throwId = s.throwId + 1;
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const launch: Launch = {
        throwId, seed, target: [...s.aim], force: effect.force,
        handCenter: hand ? [...hand.center] : [0, HAND.y, HAND.z],
        handOmega: hand ? [...hand.omega] : [0, 0, 0],
      };
      return { gesture: next.state, throwId, force: effect.force, launch, results: null };
    });
    return effect;
  },
  publish: (throwId, results, raw) => {
    const s = get();
    if (throwId !== s.throwId || s.gesture.phase !== 'rolling') return;
    // The result and the reducer transition land together, then the publication is announced in the same
    // synchronous tick (the omen reacts to it, OS-0031 decision 2).
    const published = { results: [...results], raw: raw ? [...raw] : null };
    set({ ...published, gesture: reduce(s.gesture, { type: 'published' }).state });
    resultadoPublicado.emit({ throwId, dice: s.dice, ...published, force: s.force });
  },
}));

export const arremesso = (): EstadoDoArremesso => store.getState();
// The actions never change, so they can be taken once.
export const { input, publish, reiniciar, setAim, setForce, setChargeMode, setReady } = store.getState();

// The dice of the throw: a copy of the hand, received by selecaoAlterada. A change of the hand resets the throw, in the
// same synchronous tick (ADR 0005) and in one update, so the phase, throwId, launch, result and force change together
// with the copy. Subscribed when the module loads and never cancelled: the store lives as long as the app.
selecaoAlterada.subscribe(({ dice }) => store.setState((s) => ({ ...selection(s), dice })));
