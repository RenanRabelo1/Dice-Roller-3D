import { describe, it, expect, beforeEach } from 'vitest';
import type { DieKind } from '../src/dice/polyhedra';
import { OMEN_MS, omenKind, omenMs, omenOf } from '../src/dice/omen';
import { omenPlaying, useDice } from '../src/store';

const d20 = (n: number) => Array<DieKind>(n).fill('d20');

describe('omenOf: which dice crit (d20 20, d100 1) and which fumble (d20 1, d100 100)', () => {
  it.each([
    ['one 20 in 5d20 is a critical', d20(5), [3, 20, 7, 9, 11], { crits: [1], fumbles: [] }, 'crit'],
    ['one 1 in 5d20 is a fumble', d20(5), [3, 1, 7, 9, 11], { crits: [], fumbles: [1] }, 'fumble'],
    ['a 20 and a 1 is duality', d20(5), [20, 1, 7, 9, 11], { crits: [0], fumbles: [1] }, 'duality'],
    ['two fumbles and a critical is still duality', d20(3), [1, 20, 1], { crits: [1], fumbles: [0, 2] }, 'duality'],
    ['d100 1 is the Cthulhu critical', ['d100'], [1], { crits: [0], fumbles: [] }, 'crit'],
    ['d100 100 is a fumble', ['d100'], [100], { crits: [], fumbles: [0] }, 'fumble'],
    ['critical on both a d20 and a d100', ['d20', 'd100'], [20, 1], { crits: [0, 1], fumbles: [] }, 'crit'],
    ['fumble on both', ['d20', 'd100'], [1, 100], { crits: [], fumbles: [0, 1] }, 'fumble'],
    ['one of each across d20 and d100', ['d20', 'd100'], [20, 100], { crits: [0], fumbles: [1] }, 'duality'],
  ] as [string, DieKind[], number[], object, string][])('%s', (_, dice, results, omen, kind) => {
    const o = omenOf(dice, results)!;
    expect(o).toEqual(omen);
    expect(omenKind(o)).toBe(kind);
  });

  it('only d20 and d100 count: other dice, Vampire d10s and coins never trigger one', () => {
    expect(omenOf(['d4', 'd6', 'd10', 'd12', 'vtm', 'hunger', 'fire', 'coin'], [1, 1, 10, 12, 10, 1, 6, 1])).toBeNull();
    expect(omenOf(d20(3), [2, 19, 10])).toBeNull();
    expect(omenOf(['d100'], [50])).toBeNull();
  });

  it('omenMs: each show gets its time; the kraken is the longest; fire and storm together take the longer', () => {
    expect(omenMs({ crits: [0], fumbles: [] }, ['d20'])).toBe(OMEN_MS.lightning);
    expect(omenMs({ crits: [0, 1], fumbles: [] }, ['d20', 'd100'])).toBe(OMEN_MS.kraken);
    expect(omenMs({ crits: [], fumbles: [0] }, ['d100'])).toBe(OMEN_MS.storm);
    expect(omenMs({ crits: [], fumbles: [0] }, ['d20'])).toBe(OMEN_MS.fire);
    expect(omenMs({ crits: [], fumbles: [0, 1] }, ['d20', 'd100'])).toBe(Math.max(OMEN_MS.fire, OMEN_MS.storm));
    expect(OMEN_MS).not.toHaveProperty('blood'); // no more blood
    expect(omenMs({ crits: [0], fumbles: [1] }, ['d20', 'd20'])).toBe(OMEN_MS.duality);
    expect(OMEN_MS.kraken).toBeGreaterThan(OMEN_MS.lightning);
    expect(Math.max(...Object.values(OMEN_MS))).toBe(OMEN_MS.kraken);
  });
});

describe('store omen', () => {
  const s = () => useDice.getState();
  const P = { kind: 'pointer', id: 1 } as const;
  const roll = () => { s().input({ type: 'press', source: P, at: 0, repeat: false }); s().input({ type: 'release', source: P, at: 700 }); };
  beforeEach(() => useDice.setState(useDice.getInitialState(), true));

  it('publish records the omen of the throw with the results', () => {
    roll(); s().publish(1, [20]);
    expect(s().omen).toEqual({ throwId: 1, crits: [0], fumbles: [] });
    expect(s().omenDone).toBe(0);
    s().setOmenDone(1);
    expect(s().omenDone).toBe(1);
  });
  it('picking the dice up ends the omen, so the result shows at once', () => {
    roll(); s().publish(1, [20]);
    expect(omenPlaying(s())).toBe(true);
    s().input({ type: 'press', source: P, at: 0, repeat: false }); // pick up while it plays
    expect(s().gesture.phase).toBe('returning');
    expect(omenPlaying(s())).toBe(false);
    expect(s().results).toEqual([20]);
  });
  it('a plain roll has no omen', () => {
    roll(); s().publish(1, [12]);
    expect(s().omen).toBeNull();
  });
  it('reduced motion skips omens', () => {
    s().setReducedMotion(true); roll(); s().publish(1, [20]);
    expect(s().omen).toBeNull();
  });
  it('enabling reduced motion cancels the current omen', () => {
    roll(); s().publish(1, [20]);
    expect(s().omen).not.toBeNull();
    s().setReducedMotion(true);
    expect(s().omen).toBeNull();
    expect(s().results).toEqual([20]);
  });
  it('a test rig forces the omen whatever the dice say', () => {
    s().rigOmen({ crits: [0], fumbles: [0] }); roll(); s().publish(1, [7]);
    expect(s().omen).toEqual({ throwId: 1, crits: [0], fumbles: [0] });
  });
});
