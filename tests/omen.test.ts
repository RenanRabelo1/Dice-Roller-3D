import { describe, it, expect, beforeEach } from 'vitest';
import { OMEN_MS, omenMs } from '../src/dice/omen';
import { omenPlaying, useDice } from '../src/store';
import { definir } from '../src/modules/selecao/index.ts';
import { definirMovimentoReduzido } from '../src/shared/plataforma';

describe('omenMs', () => {
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
  // Reduced motion lives outside the store now, so it would carry over from one test to the next.
  // The hand lives in selecao; reset it first so the copy in useDice starts equal (OS-0024, decision 8).
  beforeEach(() => { definir(['d20']); useDice.setState(useDice.getInitialState(), true); definirMovimentoReduzido(false); });

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
    definirMovimentoReduzido(true); roll(); s().publish(1, [20]);
    expect(s().omen).toBeNull();
  });
  it('enabling reduced motion cancels the current omen', () => {
    roll(); s().publish(1, [20]);
    expect(s().omen).not.toBeNull();
    definirMovimentoReduzido(true);
    expect(s().omen).toBeNull();
    expect(s().results).toEqual([20]);
  });
  it('a test rig forces the omen whatever the dice say', () => {
    s().rigOmen({ crits: [0], fumbles: [0] }); roll(); s().publish(1, [7]);
    expect(s().omen).toEqual({ throwId: 1, crits: [0], fumbles: [0] });
  });
});
