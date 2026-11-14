import { create } from 'zustand';
import { customDie, customList, registerCustom, unregisterCustom, type CustomDie } from './modules/dados/index.ts';
import { deleteCustomDie, listCustomDice, saveCustomDie } from './dice/customStore';
import { omenOf, type CustomKind, type DieKind, type Omen } from './modules/regras/index.ts';
import { adicionar, definir, remover, selecao, selecaoAlterada } from './modules/selecao/index.ts';
import type { Launch } from './physics/apply';
import { HAND } from './physics/world';
import type { Vec3 } from './shared/math';
import { aoMudarMovimentoReduzido, movimentoReduzido } from './shared/plataforma';
import { initialGesture, reduce, type Effect, type GestureEvent, type GestureState } from './throw/gesture';
import type { ChargeMode } from './throw/aim';
import { omenKinds, withDiceFor, type OmenTest } from './dice/omenTest';

type HandMotion = { center: Vec3; omega: Vec3 };

interface DiceState {
  dice: DieKind[]; // the selection, one entry per die: a copy of selecao's hand (ponte até a OS-0025)
  gesture: GestureState;
  throwId: number;
  aim: Vec3;
  force: number;
  chargeMode: ChargeMode; // how the charge moves while held (the player's choice, remembered by the browser)
  launch: Launch | null;
  results: number[] | null;
  raw: number[] | null; // per-body up value behind `results` (d10 digit, d4 vertex)
  ready: boolean;
  showcased: number; // throwId whose dice finished flying to the front
  omen: (Omen & { throwId: number }) | null; // the show this throw's result puts on before it appears
  omenDone: number; // throwId whose omen finished playing
  omenAt: number; // shared animation clock, starting when the physical result is published
  omenRig: Omen | null; // test mode only: forces the omen of the next throws
  omenTest: OmenTest | null; // dev test buttons: the next throws land on faces that play this omen (real physics)
  customs: CustomDie[]; // the player's imported dice, in creation order
  sessionOnly: boolean; // IndexedDB is unavailable: imported dice last until the page closes
  loadCustoms: () => Promise<void>;
  addCustom: (die: CustomDie) => Promise<string | null>; // null, or why it could not be saved
  updateCustom: (die: CustomDie) => Promise<string | null>; // save a changed die (e.g. its ink); the selection stays
  removeCustom: (kind: CustomKind) => Promise<void>;
  addDie: (kind: DieKind) => void;
  removeDie: (kind: DieKind) => void;
  setDice: (dice: DieKind[]) => void;
  setAim: (aim: Vec3) => void;
  setForce: (force: number) => void;
  setChargeMode: (mode: ChargeMode) => void;
  setReady: () => void;
  setShowcased: (throwId: number) => void;
  setOmenDone: (throwId: number) => void;
  rigOmen: (omen: Omen | null) => void;
  setOmenTest: (test: OmenTest | null) => void;
  input: (event: GestureEvent, hand?: HandMotion) => Effect;
  publish: (throwId: number, results: number[], raw?: number[]) => void;
}

const MODE_KEY = 'diceroller.rolagem';
const savedMode = (): ChargeMode => { try { return localStorage.getItem(MODE_KEY) === 'static' ? 'static' : 'relative'; } catch { return 'relative'; } };

const selection = (s: DiceState) => ({
  gesture: reduce(s.gesture, { type: 'selection' }).state,
  throwId: s.throwId + 1,
  launch: null,
  results: null,
  force: 0,
});

// The omen of this throw is on screen: it plays only while the dice lie settled, so picking them up ends it
// (and the result shows at once).
export const omenPlaying = (s: Pick<DiceState, 'gesture' | 'omen' | 'omenDone' | 'throwId'>) =>
  s.gesture.phase === 'settled' && s.omen?.throwId === s.throwId && s.omenDone !== s.throwId;

export const useDice = create<DiceState>((set, get) => ({
  dice: selecao(), gesture: initialGesture, throwId: 0,
  aim: [0, 0, -1], force: 0, chargeMode: savedMode(), launch: null, results: null, raw: null,
  ready: false, showcased: 0, omen: null, omenDone: 0, omenAt: 0, omenRig: null, omenTest: null, customs: [], sessionOnly: false,
  // ponte até a OS-0025: selecao changes the hand; the copy and the throw follow its event (below).
  addDie: (kind) => adicionar(kind),
  removeDie: (kind) => remover(kind),
  setDice: (dice) => definir(dice),
  loadCustoms: async () => {
    try {
      const saved = await listCustomDice();
      saved.forEach(registerCustom);
      set({ customs: customList(), sessionOnly: false });
    } catch { set({ sessionOnly: true }); }
  },
  addCustom: async (die) => {
    let failure: string | null = null;
    try { await saveCustomDie(die); } catch (e) {
      // A full disk loses the die; no IndexedDB at all just keeps it for this session.
      if (e instanceof DOMException && e.name === 'QuotaExceededError') return 'Não coube no armazenamento do navegador. Libere espaço ou use um modelo menor.';
      failure = 'session';
    }
    registerCustom(die);
    set({ customs: customList(), sessionOnly: failure !== null || get().sessionOnly });
    return null;
  },
  updateCustom: async (die) => {
    // Applied at once (the controls and the scene follow the store), saved after; a failed save keeps it for this session.
    registerCustom(die);
    set({ customs: customList() });
    try { await saveCustomDie(die); } catch (e) {
      set({ sessionOnly: true });
      if (e instanceof DOMException && e.name === 'QuotaExceededError') return 'Não coube no armazenamento do navegador; a mudança vale só nesta sessão.';
    }
    return null;
  },
  removeCustom: async (kind) => {
    const die = customDie(kind);
    if (!die) return;
    try { await deleteCustomDie(die.id); } catch { /* session-only: nothing stored */ }
    // selecao takes the kind out of the hand (catalogoAlterado) and the copy follows, before the customs update.
    unregisterCustom(kind);
    set({ customs: customList() });
  },
  setAim: (aim) => set({ aim: [...aim] }),
  setForce: (force) => set({ force }),
  setChargeMode: (chargeMode) => {
    set({ chargeMode });
    try { localStorage.setItem(MODE_KEY, chargeMode); } catch { /* a private window: the choice lasts this visit */ }
  },
  setReady: () => set({ ready: true }),
  setShowcased: (showcased) => set({ showcased }),
  setOmenDone: (omenDone) => set({ omenDone }),
  rigOmen: (omenRig) => set({ omenRig }),
  // Choosing a test also puts the dice it needs in the hand (a d20, a d100, or two for duality).
  // ponte até a OS-0025: two sets in the same tick (OS-0024, decision 7); selecao() keeps its reference when unchanged.
  setOmenTest: (omenTest) => {
    const dice = omenTest ? withDiceFor(omenTest, selecao()) : selecao();
    set({ omenTest });
    if (dice !== selecao()) definir(dice);
  },
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
  publish: (throwId, results, raw) => set((s) => {
    if (throwId !== s.throwId || s.gesture.phase !== 'rolling') return s;
    // Publish the result, its omen and the reducer transition together so subscribers see one settled snapshot.
    // Reduced motion skips the omens' shows.
    const omen = movimentoReduzido() ? null : s.omenRig ?? omenOf(omenKinds(s.dice), results);
    return { results: [...results], raw: raw ? [...raw] : null, omen: omen && { throwId, ...omen }, omenAt: omen ? performance.now() : 0, gesture: reduce(s.gesture, { type: 'published' }).state };
  }),
}));

// Switching reduced motion on cancels the omen being shown, in the same synchronous tick (ADR 0005). Subscribed
// when the module loads and never cancelled: the store lives as long as the app.
aoMudarMovimentoReduzido((v) => { if (v) useDice.setState({ omen: null }); });

// ponte até a OS-0025: a change of the hand resets the throw, in the same synchronous tick (ADR 0005) and in one update,
// so the phase, throwId, launch, result and force change together with the copy of the hand.
selecaoAlterada.subscribe(({ dice }) => useDice.setState((s) => ({ ...selection(s), dice })));
