import { describe, expect, it } from 'vitest';
import { omenKinds, plays, withDiceFor } from '../src/dice/omenTest';
import { presimulate, presimulateFor, type RollRequest } from '../src/physics/presim';
import { handPositions } from '../src/physics/world';
import type { Quat, Vec3 } from '../src/shared/math';
import type { DieKind } from '../src/modules/regras/index.ts';
import { initRapier } from './helpers/sim';

describe('animation test buttons', () => {
  it('know which results play each omen', () => {
    expect(plays('lightning', ['d20'], [20])).toBe(true);
    expect(plays('lightning', ['d20', 'd20'], [20, 1])).toBe(false); // that is duality
    expect(plays('fire', ['d6', 'd20'], [6, 1])).toBe(true);
    expect(plays('kraken', ['d20', 'd100'], [20, 1])).toBe(true); // lightning and kraken play together
    expect(plays('kraken', ['d100'], [100])).toBe(false);
    expect(plays('storm', ['d100'], [100])).toBe(true);
    expect(plays('duality', ['d20', 'd100'], [20, 100])).toBe(true);
    expect(plays('duality', ['d20', 'd20'], [20, 20])).toBe(false);
  });

  it('put the dice each test needs in the hand, keeping the rest', () => {
    expect(withDiceFor('lightning', ['d6'])).toEqual(['d6', 'd20']);
    expect(withDiceFor('fire', ['d20', 'd20'])).toEqual(['d20', 'd20']);
    expect(withDiceFor('kraken', ['d20'])).toEqual(['d20', 'd100']);
    expect(withDiceFor('storm', ['d100'])).toEqual(['d100']);
    expect(withDiceFor('duality', ['d20'])).toEqual(['d20', 'd20']);
    expect(withDiceFor('duality', ['d4', 'd100'])).toEqual(['d4', 'd20', 'd100']);
    expect(withDiceFor('kraken', Array<DieKind>(10).fill('d6'))).toEqual(['d100']); // no room: just what it needs
  });

  it('a test throw is a real roll that lands on the omen; an ordinary throw is untouched', async () => {
    await initRapier();
    const request = (dice: DieKind[], seed: number, test?: 'kraken' | 'storm' | 'fire'): RollRequest => {
      const hand = handPositions(dice.length, 0);
      return {
        dice, start: hand.map((p) => ({ p, q: [0, 0, 0, 1] as Quat })), customs: {},
        launch: { throwId: 1, seed, target: [0, 0, -1], force: 0.6, handCenter: hand[0] as Vec3, handOmega: [0, 0, 0] },
        ...(test && { bias: { test, kinds: omenKinds(dice) } }),
      };
    };
    for (const [dice, test, value] of [[['d100'], 'kraken', 1], [['d100'], 'storm', 100], [['d6', 'd20'], 'fire', 1]] as const) {
      const rec = presimulateFor(request([...dice], 7, test), 20_000);
      expect(rec.results.at(-1)).toBe(value);
      expect(rec.escaped).toBe(false);
    }
    const plain = request(['d20'], 7);
    expect(presimulateFor(plain, 20_000)).toEqual(presimulate(plain.dice, plain.start, plain.launch));
  }, 60_000);
});
