import { isOutside, recoveryPoint, SETTLE, type Quat, type Vec3 } from '../physics/world';
import type { Phase } from './gesture';

export interface BodyState { p: Vec3; q: Quat; speed: number; spin: number }
export interface SettleState { throwId: number; expected: number; steps: number; calm: number; done: boolean }
export type SettleAction =
  | { type: 'wait' }
  | { type: 'recover'; moves: { index: number; p: Vec3 }[] }
  | { type: 'reveal'; poses: { p: Vec3; q: Quat }[]; timedOut: boolean };

export const initSettle = (throwId: number, expected: number): SettleState => ({ throwId, expected, steps: 0, calm: 0, done: false });

// Pure: decides when the dice count as stopped, from the CURRENT state of every body. The value is decided
// at the throw, so nothing here reads faces: reveal only needs the dice to be still.
export function stepSettle(
  s: SettleState,
  input: { throwId: number; phase: Phase; radii: number[]; bodies: BodyState[] },
): { state: SettleState; action: SettleAction } {
  const { radii, bodies } = input;
  if (input.throwId !== s.throwId || input.phase !== 'rolling' || s.done) return { state: s, action: { type: 'wait' } };
  const state = { ...s, steps: s.steps + 1 };
  if (bodies.length !== s.expected || radii.length !== s.expected) return { state, action: { type: 'wait' } };
  const outside = bodies.flatMap((b, i) => (isOutside(b.p, radii[i]) ? [i] : []));
  const reveal = (timedOut: boolean) => ({
    state: { ...state, done: true },
    action: {
      type: 'reveal' as const, timedOut,
      poses: bodies.map((b, i) => ({ p: outside.includes(i) ? recoveryPoint(i, s.expected) : b.p, q: b.q })),
    },
  });
  if (state.steps >= SETTLE.timeoutSteps) return reveal(true);
  if (outside.length) {
    return { state: { ...state, calm: 0 }, action: { type: 'recover', moves: outside.map((index) => ({ index, p: recoveryPoint(index, s.expected) })) } };
  }
  const still = bodies.every((b) => b.speed < SETTLE.speed && b.spin < SETTLE.spin);
  const calm = still ? state.calm + 1 : 0;
  if (calm >= SETTLE.calmSteps) return reveal(false);
  return { state: { ...state, calm }, action: { type: 'wait' } };
}
