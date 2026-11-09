import { create } from 'zustand';
import { MAX_DICE, sortDice, type DieKind } from './dice/polyhedra';
import type { Launch } from './physics/apply';
import { HAND, type Vec3 } from './physics/world';
import { initialGesture, reduce, type Effect, type GestureEvent, type GestureState } from './throw/gesture';

type HandMotion = { center: Vec3; omega: Vec3 };
type DiceError = 'graphics' | 'physics' | null;

interface DiceState {
  dice: DieKind[]; // the selection, one entry per die
  gesture: GestureState;
  throwId: number;
  aim: Vec3;
  force: number;
  launch: Launch | null;
  results: number[] | null;
  raw: number[] | null; // per-body up value behind `results` (d10 digit, d4 vertex)
  error: DiceError;
  ready: boolean;
  reducedMotion: boolean;
  showcased: number; // throwId whose dice finished flying to the front
  addDie: (kind: DieKind) => void;
  removeDie: (kind: DieKind) => void;
  setDice: (dice: DieKind[]) => void;
  setAim: (aim: Vec3) => void;
  setForce: (force: number) => void;
  setReady: () => void;
  setError: (error: DiceError) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setShowcased: (throwId: number) => void;
  input: (event: GestureEvent, hand?: HandMotion) => Effect;
  publish: (throwId: number, results: number[], raw?: number[]) => void;
}

const selection = (s: DiceState) => ({
  gesture: reduce(s.gesture, { type: 'selection' }).state,
  throwId: s.throwId + 1,
  launch: null,
  results: null,
  force: 0,
});

export const useDice = create<DiceState>((set) => ({
  dice: ['d20'], gesture: initialGesture, throwId: 0,
  aim: [0, 0, -1], force: 0, launch: null, results: null, raw: null,
  error: null, ready: false, reducedMotion: false, showcased: 0,
  addDie: (kind) => set((s) => (s.dice.length >= MAX_DICE ? s : { ...selection(s), dice: sortDice([...s.dice, kind]) })),
  removeDie: (kind) => set((s) => {
    const i = s.dice.lastIndexOf(kind);
    return i < 0 || s.dice.length === 1 ? s : { ...selection(s), dice: s.dice.filter((_, j) => j !== i) };
  }),
  setDice: (dice) => set((s) => ({ ...selection(s), dice: sortDice(dice.slice(0, MAX_DICE)) })),
  setAim: (aim) => set({ aim: [...aim] }),
  setForce: (force) => set({ force }),
  setReady: () => set({ ready: true }),
  setError: (error) => set({ error }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setShowcased: (showcased) => set({ showcased }),
  input: (event, hand) => {
    let effect: Effect = { type: 'none' };
    set((s) => {
      const next = reduce(s.gesture, event);
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
    // Publish the result and reducer transition together so subscribers see one settled snapshot.
    return { results: [...results], raw: raw ? [...raw] : null, gesture: reduce(s.gesture, { type: 'published' }).state };
  }),
}));
