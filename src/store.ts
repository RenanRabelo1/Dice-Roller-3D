import { create } from 'zustand';
import type { DieKind } from './dice/polyhedra';
import type { Launch } from './physics/apply';
import { HAND, type Quat, type Vec3 } from './physics/world';
import { initialGesture, reduce, type Effect, type GestureEvent, type GestureState } from './throw/gesture';

type Pose = { p: Vec3; q: Quat };
type HandMotion = { center: Vec3; omega: Vec3 };
type DiceError = 'graphics' | 'physics' | null;

interface DiceState {
  kind: DieKind;
  count: number;
  gesture: GestureState;
  throwId: number;
  aim: Vec3;
  force: number;
  launch: Launch | null;
  fixture: Pose[] | null;
  results: number[] | null;
  error: DiceError;
  ready: boolean;
  reducedMotion: boolean;
  setKind: (kind: DieKind) => void;
  setCount: (count: number) => void;
  setAim: (aim: Vec3) => void;
  setForce: (force: number) => void;
  setReady: () => void;
  setError: (error: DiceError) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  input: (event: GestureEvent, hand?: HandMotion) => Effect;
  publish: (throwId: number, results: number[]) => void;
  startFixture: (poses: Pose[]) => void;
}

const selection = (s: DiceState) => ({
  gesture: reduce(s.gesture, { type: 'selection' }).state,
  throwId: s.throwId + 1,
  launch: null,
  fixture: null,
  results: null,
  force: 0,
});

export const useDice = create<DiceState>((set) => ({
  kind: 'd20', count: 1, gesture: initialGesture, throwId: 0,
  aim: [0, 0, -1], force: 0, launch: null, fixture: null, results: null,
  error: null, ready: false, reducedMotion: false,
  setKind: (kind) => set((s) => ({ ...selection(s), kind })),
  setCount: (count) => set((s) => ({ ...selection(s), count: Math.min(10, Math.max(1, count)) })),
  setAim: (aim) => set({ aim: [...aim] }),
  setForce: (force) => set({ force }),
  setReady: () => set({ ready: true }),
  setError: (error) => set({ error }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
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
      return { gesture: next.state, throwId, force: effect.force, launch, fixture: null, results: null };
    });
    return effect;
  },
  publish: (throwId, results) => set((s) => {
    if (throwId !== s.throwId || s.gesture.phase !== 'rolling') return s;
    // Publish the result and reducer transition together so subscribers see one settled snapshot.
    return { results: [...results], gesture: reduce(s.gesture, { type: 'published' }).state };
  }),
  startFixture: (poses) => set((s) => ({
    throwId: s.throwId + 1, gesture: { ...initialGesture, phase: 'rolling' },
    fixture: poses.map(({ p, q }) => ({ p: [...p], q: [...q] })), launch: null, results: null,
  })),
}));
