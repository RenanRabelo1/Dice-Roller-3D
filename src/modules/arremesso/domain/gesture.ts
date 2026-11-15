import type { Effect, GestureEvent, GestureState, Source } from '../contracts.ts';
import { charge } from './aim.ts';

export const initialGesture: GestureState = { phase: 'hand', source: null, chargeStart: 0 };

const NONE: Effect = { type: 'none' };

function sameSource(a: Source | null, b: Source): boolean {
  return !!a && a.kind === b.kind && (a.kind === 'key' || (b.kind === 'pointer' && a.id === b.id));
}

export function reduce(s: GestureState, e: GestureEvent): { state: GestureState; effect: Effect } {
  const keep = { state: s, effect: NONE };
  switch (e.type) {
    case 'selection':
      return { state: initialGesture, effect: NONE };
    case 'press':
      if (e.repeat) return keep;
      if (s.phase === 'hand') return { state: { phase: 'charging', source: e.source, chargeStart: e.at }, effect: NONE };
      if (s.phase === 'settled') return { state: { ...s, phase: 'returning' }, effect: { type: 'return' } };
      return keep;
    case 'release':
      if (s.phase !== 'charging' || !sameSource(s.source, e.source)) return keep;
      return { state: { ...s, phase: 'rolling' }, effect: { type: 'throw', force: charge(e.at - s.chargeStart, e.mode) } };
    case 'cancel':
      return s.phase === 'charging' ? { state: initialGesture, effect: NONE } : keep;
    case 'published':
      return s.phase === 'rolling' ? { state: { ...s, phase: 'settled' }, effect: NONE } : keep;
    case 'returned':
      return s.phase === 'returning' ? { state: initialGesture, effect: NONE } : keep;
  }
}
