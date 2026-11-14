import { create } from 'zustand';
import { omenOf, type Omen } from './modules/regras/index.ts';
import { definir, selecao } from './modules/selecao/index.ts';
import { aoMudarMovimentoReduzido, movimentoReduzido } from './shared/plataforma';
import { arremesso, resultadoPublicado, type OmenTest, type Phase } from './modules/arremesso/index.ts';
import { useArremesso } from './modules/arremesso/cena.ts';
import { omenKinds, withDiceFor } from './dice/omenTest';

// What is left of the legacy store: the omen and the showcase. The throw's state is in `arremesso` (OS-0031).
interface DiceState {
  showcased: number; // throwId whose dice finished flying to the front
  omen: (Omen & { throwId: number }) | null; // the show this throw's result puts on before it appears
  omenDone: number; // throwId whose omen finished playing
  omenAt: number; // shared animation clock, starting when the physical result is published
  omenRig: Omen | null; // test mode only: forces the omen of the next throws
  omenTest: OmenTest | null; // dev test buttons: the next throws land on faces that play this omen (real physics)
  setShowcased: (throwId: number) => void;
  setOmenDone: (throwId: number) => void;
  rigOmen: (omen: Omen | null) => void;
  setOmenTest: (test: OmenTest | null) => void;
}

export const useDice = create<DiceState>((set) => ({
  showcased: 0, omen: null, omenDone: 0, omenAt: 0, omenRig: null, omenTest: null,
  setShowcased: (showcased) => set({ showcased }),
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

// The omen of this throw is on screen: it plays only while the dice lie settled, so picking them up ends it
// (and the result shows at once).
const playing = (phase: Phase, throwId: number, omen: DiceState['omen'], omenDone: number) =>
  phase === 'settled' && omen?.throwId === throwId && omenDone !== throwId;
export const omenPlaying = (): boolean => {
  const a = arremesso(), d = useDice.getState();
  return playing(a.gesture.phase, a.throwId, d.omen, d.omenDone);
};
// The same, as a React hook: re-renders when the throw's phase or throwId, or the omen, change.
export const useOmenPlaying = (): boolean => {
  const phase = useArremesso((a) => a.gesture.phase), throwId = useArremesso((a) => a.throwId);
  const omen = useDice((d) => d.omen), omenDone = useDice((d) => d.omenDone);
  return playing(phase, throwId, omen, omenDone);
};

// The omen of a published result, decided in the same synchronous tick as the publication (ADR 0005; two sets in the
// same tick, OS-0031 decision 2). Reduced motion skips the omens' shows. Subscribed when the module loads and never
// cancelled: the store lives as long as the app.
resultadoPublicado.subscribe(({ throwId, dice, results }) => {
  const omen = movimentoReduzido() ? null : useDice.getState().omenRig ?? omenOf(omenKinds(dice), results);
  useDice.setState({ omen: omen && { throwId, ...omen }, omenAt: omen ? performance.now() : 0 });
});

// Switching reduced motion on cancels the omen being shown, in the same synchronous tick (ADR 0005). Subscribed
// when the module loads and never cancelled: the store lives as long as the app.
aoMudarMovimentoReduzido((v) => { if (v) useDice.setState({ omen: null }); });
