import { describe, it, expect, beforeEach } from 'vitest';
import { presagio, reiniciarPresagio } from '../src/modules/pressagios/index.ts';
// The throw's door has no full reset: reiniciar() starts a fresh throw, and the throw's id is read back (OS-0047).
import { arremesso, reiniciar } from '../src/modules/arremesso/index.ts';
import { adicionar, definir, selecao } from '../src/modules/selecao/index.ts';

const s = () => ({ ...arremesso(), ...presagio() });
// The hand lives in selecao; reset it first so the copy in the throw starts equal (OS-0024, decision 8).
beforeEach(() => { definir(['d20']); reiniciar(); reiniciarPresagio(); });

describe('store', () => {
  it('choosing an animation test puts its dice in the hand; turning it off keeps them', () => {
    s().setOmenTest('kraken');
    expect(s()).toMatchObject({ omenTest: 'kraken', dice: ['d20', 'd100'] });
    s().setOmenTest(null);
    expect(s()).toMatchObject({ omenTest: null, dice: ['d20', 'd100'] });
  });
  it('choosing an animation test puts its dice in the hand of selecao, not only in the copy', () => {
    const base = arremesso().throwId + 1; // the throw the test's dice start
    s().setOmenTest('kraken');
    expect(selecao()).toEqual(['d20', 'd100']);
    expect(s()).toMatchObject({ omenTest: 'kraken', dice: ['d20', 'd100'], throwId: base });
    adicionar('d6');
    expect(selecao()).toEqual(['d6', 'd20', 'd100']); // the d100 the test brought stays
    s().setOmenTest('kraken'); // already has its dice: the hand and the throw stay
    expect(s()).toMatchObject({ omenTest: 'kraken', dice: ['d6', 'd20', 'd100'], throwId: base + 1 });
  });
});
