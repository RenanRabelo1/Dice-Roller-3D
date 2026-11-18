// The omen's state (owned by `pressagios`): a vanilla zustand store, written only here, read outside through
// `presagio()` and `usePresagio()` (cena.ts). The omen of a published result is decided here (ADR 0005).
import { createStore } from 'zustand/vanilla';
import { omenOf, presagioVampiro } from '../regras/index.ts';
import { definir, selecao } from '../selecao/index.ts';
import { arremesso, omenKinds, resultadoPublicado, type Phase } from '../arremesso/index.ts';
import { aoMudarMovimentoReduzido, movimentoReduzido } from '../../shared/plataforma/index.ts';
import type { EstadoDoPresagio } from './contracts.ts';
import { withDiceFor } from './domain/omenTest.ts';

export const store = createStore<EstadoDoPresagio>((set) => ({
  omen: null, vampiro: null, omenDone: 0, omenAt: 0, omenRig: null, omenTest: null,
  setOmenDone: (omenDone) => set({ omenDone }),
  rigOmen: (omenRig) => set({ omenRig }),
  // Choosing a test also puts the dice it needs in the hand (a d20, a d100, or two for duality).
  // Two sets in the same tick (OS-0024, decision 7); selecao() keeps its reference when unchanged.
  setOmenTest: (omenTest) => {
    const dice = omenTest ? withDiceFor(omenTest, selecao()) : selecao();
    set({ omenTest });
    if (dice !== selecao()) definir(dice);
  },
}));

export const presagio = (): EstadoDoPresagio => store.getState();
// The actions never change, so they can be taken once.
export const { setOmenDone, rigOmen, setOmenTest } = store.getState();
// Back to the initial state (the tests, and the shell if it ever needs it). Named apart from arremesso's `reiniciar`,
// since whoever resets both imports the two.
export const reiniciarPresagio = (): void => store.setState(store.getInitialState(), true);

// The omen of this throw is on screen: it plays only while the dice lie settled, so picking them up ends it
// (and the result shows at once).
export const tocando = (phase: Phase, throwId: number, show: { throwId: number } | null, omenDone: number) =>
  phase === 'settled' && show?.throwId === throwId && omenDone !== throwId;
export const presagioTocando = (): boolean => {
  const a = arremesso(), p = store.getState();
  return tocando(a.gesture.phase, a.throwId, p.omen ?? p.vampiro, p.omenDone);
};

// The omen of a published result, decided in the same synchronous tick as the publication (ADR 0005; two sets in the
// same tick, OS-0031 decision 2). Reduced motion skips the omens' shows. Subscribed when the module loads and never
// cancelled: the store lives as long as the app.
resultadoPublicado.subscribe(({ throwId, dice, results }) => {
  const kinds = omenKinds(dice), reduced = movimentoReduzido();
  const omen = reduced ? null : store.getState().omenRig ?? omenOf(kinds, results);
  const vampiro = reduced || omen ? null : presagioVampiro(kinds, results);
  store.setState({ omen: omen && { throwId, ...omen }, vampiro: vampiro && { throwId, ...vampiro }, omenAt: omen || vampiro ? performance.now() : 0 });
});

// Switching reduced motion on cancels the omen being shown, in the same synchronous tick (ADR 0005). Subscribed
// when the module loads and never cancelled: the store lives as long as the app.
aoMudarMovimentoReduzido((v) => { if (v) store.setState({ omen: null, vampiro: null }); });
