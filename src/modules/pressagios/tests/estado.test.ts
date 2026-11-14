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
});
