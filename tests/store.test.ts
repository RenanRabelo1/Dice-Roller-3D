import { describe, it, expect, beforeEach } from 'vitest';
import { useDice } from '../src/store';
import { arremesso } from '../src/modules/arremesso/index.ts';
// Test only: the reset of the throw's state has no door (the gesture, publication and hand tests live in the module, OS-0031).
import { store } from '../src/modules/arremesso/store.ts';
import { adicionar, definir, selecao } from '../src/modules/selecao/index.ts';

const s = () => ({ ...arremesso(), ...useDice.getState() });
// The hand lives in selecao; reset it first so the copy in the throw starts equal (OS-0024, decision 8).
beforeEach(() => { definir(['d20']); store.setState(store.getInitialState(), true); useDice.setState(useDice.getInitialState(), true); });

describe('store', () => {
  it('choosing an animation test puts its dice in the hand; turning it off keeps them', () => {
    s().setOmenTest('kraken');
    expect(s()).toMatchObject({ omenTest: 'kraken', dice: ['d20', 'd100'] });
    s().setOmenTest(null);
    expect(s()).toMatchObject({ omenTest: null, dice: ['d20', 'd100'] });
  });
  it('choosing an animation test puts its dice in the hand of selecao, not only in the copy', () => {
    s().setOmenTest('kraken');
    expect(selecao()).toEqual(['d20', 'd100']);
    expect(s()).toMatchObject({ omenTest: 'kraken', dice: ['d20', 'd100'], throwId: 1 });
    adicionar('d6');
    expect(selecao()).toEqual(['d6', 'd20', 'd100']); // the d100 the test brought stays
    s().setOmenTest('kraken'); // already has its dice: the hand and the throw stay
    expect(s()).toMatchObject({ omenTest: 'kraken', dice: ['d6', 'd20', 'd100'], throwId: 2 });
  });
});
