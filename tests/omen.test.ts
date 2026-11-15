import { describe, it, expect, beforeEach } from 'vitest';
import { OMEN_MS, omenMs, presagio, presagioTocando, reiniciarPresagio } from '../src/modules/pressagios/index.ts';
import { arremesso, reiniciar, resultadoPublicado } from '../src/modules/arremesso/index.ts';
import { definir } from '../src/modules/selecao/index.ts';
import { definirMovimentoReduzido } from '../src/shared/plataforma/index.ts';

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
  const s = () => ({ ...arremesso(), ...presagio() });
  const P = { kind: 'pointer', id: 1 } as const;
  // The throw's door has no full reset: reiniciar() starts a fresh throw, and the throw's id is read back (OS-0047).
  const roll = () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false }); s().input({ type: 'release', source: P, at: 700 });
    return arremesso().throwId;
  };
  // Reduced motion lives outside the store now, so it would carry over from one test to the next.
  // The hand lives in selecao; reset it first so the copy in the throw starts equal (OS-0024, decision 8).
  beforeEach(() => {
    definir(['d20']); reiniciar(); reiniciarPresagio(); definirMovimentoReduzido(false);
  });

  it('the omen is filled in the same synchronous tick as the publication (resultadoPublicado)', () => {
    const throwId = roll();
    const during: unknown[] = [];
    const off = resultadoPublicado.subscribe(() => during.push(presagio().omen));
    s().publish(throwId, [20]);
    off();
    expect(during).toEqual([{ throwId, crits: [0], fumbles: [] }]);
    expect(presagio().omen).toEqual({ throwId, crits: [0], fumbles: [] });
    expect(presagio().omenAt).toBeGreaterThan(0);
  });
  it('publish records the omen of the throw with the results', () => {
    const throwId = roll(); s().publish(throwId, [20]);
    expect(s().omen).toEqual({ throwId, crits: [0], fumbles: [] });
    expect(s().omenDone).toBe(0);
    s().setOmenDone(throwId);
    expect(s().omenDone).toBe(throwId);
  });
  it('picking the dice up ends the omen, so the result shows at once', () => {
    const throwId = roll(); s().publish(throwId, [20]);
    expect(presagioTocando()).toBe(true);
    s().input({ type: 'press', source: P, at: 0, repeat: false }); // pick up while it plays
    expect(s().gesture.phase).toBe('returning');
    expect(presagioTocando()).toBe(false);
    expect(s().results).toEqual([20]);
  });
  it('a plain roll has no omen', () => {
    const throwId = roll(); s().publish(throwId, [12]);
    expect(s().omen).toBeNull();
  });
  it('reduced motion skips omens', () => {
    definirMovimentoReduzido(true); const throwId = roll(); s().publish(throwId, [20]);
    expect(s().omen).toBeNull();
  });
  it('enabling reduced motion cancels the current omen', () => {
    const throwId = roll(); s().publish(throwId, [20]);
    expect(s().omen).not.toBeNull();
    definirMovimentoReduzido(true);
    expect(s().omen).toBeNull();
    expect(s().results).toEqual([20]);
  });
  it('a test rig forces the omen whatever the dice say', () => {
    s().rigOmen({ crits: [0], fumbles: [0] }); const throwId = roll(); s().publish(throwId, [7]);
    expect(s().omen).toEqual({ throwId, crits: [0], fumbles: [0] });
  });
});
