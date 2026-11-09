import { describe, it, expect } from 'vitest';
import { reduce, initialGesture, type GestureState, type Phase, type Source } from '../src/throw/gesture';

const P1 = { kind: 'pointer', id: 1 } as const, P2 = { kind: 'pointer', id: 2 } as const, KEY = { kind: 'key' } as const;
const at = (phase: Phase): GestureState => ({ ...initialGesture, phase });
const press = (source: Source = P1, t = 0, repeat = false) => ({ type: 'press', source, at: t, repeat }) as const;
const release = (source: Source = P1, t = 700) => ({ type: 'release', source, at: t }) as const;

describe('gesture', () => {
  it('press in hand starts charging and remembers the source', () => {
    const r = reduce(initialGesture, press(P1, 100));
    expect(r.state).toEqual({ phase: 'charging', source: P1, chargeStart: 100 });
  });
  it('only the same source releases, throwing with the charge at that time', () => {
    const charging = reduce(initialGesture, press(P1, 0)).state;
    expect(reduce(charging, release(P2, 700))).toEqual({ state: charging, effect: { type: 'none' } });
    expect(reduce(charging, release(KEY, 700)).state.phase).toBe('charging');
    expect(reduce(charging, release(P1, 700))).toEqual({ state: { ...charging, phase: 'rolling' }, effect: { type: 'throw', force: 1 } });
  });
  it('ignores key repeat', () => expect(reduce(initialGesture, press(KEY, 0, true)).state.phase).toBe('hand'));
  it('cancel during charging returns to hand without throwing', () => {
    const charging = reduce(initialGesture, press(KEY, 0)).state;
    expect(reduce(charging, { type: 'cancel' })).toEqual({ state: initialGesture, effect: { type: 'none' } });
  });
  it('cancel after an accepted release does not undo the throw', () => {
    expect(reduce(at('rolling'), { type: 'cancel' }).state.phase).toBe('rolling');
  });
  it('press only starts a charge from hand; returning ignores gestures', () => {
    for (const ph of ['rolling', 'returning'] as Phase[]) expect(reduce(at(ph), press()).state.phase).toBe(ph);
  });
  it('published → settled; press in settled → returning with a return effect; returned → hand', () => {
    expect(reduce(at('rolling'), { type: 'published' }).state.phase).toBe('settled');
    expect(reduce(at('hand'), { type: 'published' }).state.phase).toBe('hand');
    expect(reduce(at('settled'), press())).toEqual({ state: { ...at('settled'), phase: 'returning' }, effect: { type: 'return' } });
    expect(reduce(at('returning'), { type: 'returned' }).state.phase).toBe('hand');
  });
  it('selection resets every phase to hand', () => {
    for (const ph of ['hand', 'charging', 'rolling', 'settled', 'returning'] as Phase[])
      expect(reduce(at(ph), { type: 'selection' }).state).toEqual(initialGesture);
  });
});
