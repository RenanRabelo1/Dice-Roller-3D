import { beforeEach, describe, expect, it } from 'vitest';
import { presagio, presagioTocando } from '../index.ts';
import { store } from '../store.ts';
import { arremesso, input, publish, reiniciar, resultadoPublicado } from '../../arremesso/index.ts';
import { definir } from '../../selecao/index.ts';
import { definirMovimentoReduzido } from '../../../shared/plataforma/index.ts';

const P = { kind: 'pointer', id: 1 } as const;
// The throw's state has no reset at its door: reiniciar() starts a fresh throw, and the throw's id is read back.
const roll = () => {
  input({ type: 'press', source: P, at: 0, repeat: false });
  input({ type: 'release', source: P, at: 700 });
  return arremesso().throwId;
};
// Reduced motion lives outside the store, so it would carry over from one test to the next.
beforeEach(() => { definir(['d20']); reiniciar(); store.setState(store.getInitialState(), true); definirMovimentoReduzido(false); });

describe('the omen state', () => {
  it('is filled in the same synchronous tick as resultadoPublicado, with its clock', () => {
    const throwId = roll();
    const during: unknown[] = [];
    const off = resultadoPublicado.subscribe(() => during.push(presagio().omen));
    publish(throwId, [20]);
    off();
    expect(during).toEqual([{ throwId, crits: [0], fumbles: [] }]);
    expect(presagio().omenAt).toBeGreaterThan(0);
    expect(presagioTocando()).toBe(true);
    // It keeps playing (the result waits) until the scene reports the show over for this throw.
    store.getState().setOmenDone(throwId - 1);
    expect(presagioTocando()).toBe(true);
    store.getState().setOmenDone(throwId);
    expect(presagioTocando()).toBe(false);
  });
  it('is null with reduced motion', () => {
    definirMovimentoReduzido(true);
    publish(roll(), [20]);
    expect(presagio()).toMatchObject({ omen: null, omenAt: 0 });
    expect(presagioTocando()).toBe(false);
  });
  it('is cancelled when reduced motion is switched on', () => {
    publish(roll(), [20]);
    expect(presagio().omen).not.toBeNull();
    definirMovimentoReduzido(true);
    expect(presagio().omen).toBeNull();
    expect(presagioTocando()).toBe(false);
    expect(arremesso().results).toEqual([20]);
  });

  it('publishes the Vampire omen in the same tick and ends it for the current throw', () => {
    definir(['vtm', 'vtm']);
    const throwId = roll(), during: unknown[] = [];
    const off = resultadoPublicado.subscribe(() => during.push(presagio().vampiro));
    publish(throwId, [10, 10]);
    off();
    expect(during).toEqual([{ throwId, tipo: 'par-de-criticos', dados: [0, 1] }]);
    expect(presagio()).toMatchObject({ omen: null, omenAt: expect.any(Number) });
    expect(presagio().omenAt).toBeGreaterThan(0);
    expect(presagioTocando()).toBe(true);
    store.getState().setOmenDone(throwId);
    expect(presagioTocando()).toBe(false);
  });

  it('leaves only the d20 omen when both rolls would qualify', () => {
    definir(['d20', 'hunger']);
    publish(roll(), [20, 10]);
    expect(presagio()).toMatchObject({ omen: { crits: [0] }, vampiro: null });
  });

  it('cancels Vampire omens on pickup, selection and reduced motion', () => {
    definir(['hunger']);
    publish(roll(), [10]);
    expect(presagioTocando()).toBe(true);
    input({ type: 'press', source: P, at: 1000, repeat: false });
    expect(presagioTocando()).toBe(false);
    definir(['hunger']);
    publish(roll(), [1]);
    expect(presagioTocando()).toBe(true);
    definir(['hunger']);
    expect(presagioTocando()).toBe(false);
    publish(roll(), [1]);
    definirMovimentoReduzido(true);
    expect(presagio().vampiro).toBeNull();
    expect(presagioTocando()).toBe(false);
    definir(['hunger']);
    publish(roll(), [10]);
    expect(presagio()).toMatchObject({ vampiro: null, omenAt: 0 });
  });
});
