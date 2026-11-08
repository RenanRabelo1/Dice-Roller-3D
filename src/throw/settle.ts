import type { Polyhedron } from '../dice/polyhedra';
import { readUp } from '../dice/read';
import { isOutside, recoveryPoint, SETTLE, type Quat, type Vec3 } from '../physics/world';
import type { Phase } from './gesture';

export interface BodyState { asleep: boolean; p: Vec3; q: Quat }
export interface SettleState { throwId: number; expected: number; steps: number; attempts: number[]; done: boolean }
export type SettleAction =
  | { type: 'wait' }
  | { type: 'recover'; moves: { index: number; p: Vec3 }[] }
  | { type: 'nudge'; indices: number[] }
  | { type: 'publish'; raw: number[]; poses: { p: Vec3; q: Quat }[]; timedOut: boolean };

export const initSettle = (throwId: number, expected: number): SettleState => ({
  throwId, expected, steps: 0, attempts: Array<number>(expected).fill(0), done: false,
});

const bump = (attempts: number[], indices: number[]) => attempts.map((n, i) => (indices.includes(i) ? n + 1 : n));

// Pure: decides wait / recover / nudge / publish from the CURRENT state of every body.
export function stepSettle(
  s: SettleState,
  input: { throwId: number; phase: Phase; polys: Polyhedron[]; bodies: BodyState[] },
): { state: SettleState; action: SettleAction } {
  const { polys, bodies } = input;
  if (input.throwId !== s.throwId || input.phase !== 'rolling' || s.done) return { state: s, action: { type: 'wait' } };
  const state = { ...s, steps: s.steps + 1 };
  if (bodies.length !== s.expected || polys.length !== s.expected) return { state, action: { type: 'wait' } };

  const outside = bodies.flatMap((b, i) => (isOutside(b.p, polys[i].radius) ? [i] : []));
  const publish = (poses: { p: Vec3; q: Quat }[], timedOut: boolean): { state: SettleState; action: SettleAction } => ({
    state: { ...state, done: true },
    action: { type: 'publish', raw: poses.map((pose, i) => readUp(polys[i], pose.q).value), poses, timedOut },
  });

  if (state.steps === SETTLE.timeoutSteps) {
    return publish(bodies.map((b, i) => ({ p: outside.includes(i) ? recoveryPoint(i, s.expected) : b.p, q: b.q })), true);
  }
  if (outside.length) {
    return {
      state: { ...state, attempts: bump(s.attempts, outside) },
      action: { type: 'recover', moves: outside.map((index) => ({ index, p: recoveryPoint(index, s.expected) })) },
    };
  }
  if (bodies.some((b) => !b.asleep)) return { state, action: { type: 'wait' } };

  const cocked = bodies.flatMap((b, i) => (readUp(polys[i], b.q).tilt > SETTLE.cockedDeg && s.attempts[i] < SETTLE.maxAttempts ? [i] : []));
  if (cocked.length) return { state: { ...state, attempts: bump(s.attempts, cocked) }, action: { type: 'nudge', indices: cocked } };
  return publish(bodies.map((b) => ({ p: b.p, q: b.q })), false);
}
