import { describe, expect, it } from 'vitest';
import { initRapier } from '../../../../tests/helpers/sim.ts';
import type { DieKind, TipoVampiro } from '../../regras/index.ts';
import { handPositions, omenKinds, plays, presimulateFor, type RollRequest } from '../index.ts';

const cases: [TipoVampiro, DieKind[], number[], number[]][] = [
  ['par-de-criticos', ['vtm', 'vtm'], [10, 10], [10, 9]],
  ['critico-bestial', ['hunger'], [10], [1]],
  ['falha-bestial', ['hunger'], [1], [10]],
];

describe('Vampire test bias', () => {
  it.each(cases)('matches %s only when that omen plays', (test, dice, results, other) => {
    expect(plays(test, omenKinds(dice), results)).toBe(true);
    expect(plays(test, omenKinds(dice), other)).toBe(false);
    expect(plays(test, omenKinds([...dice, 'd20']), [...results, 20])).toBe(false);
  });

  it.each(cases)('finds a real roll for %s', async (test, dice, results) => {
    await initRapier();
    const hand = handPositions(dice.length, 0);
    const request: RollRequest = {
      dice,
      start: hand.map((p) => ({ p, q: [0, 0, 0, 1] })),
      customs: {},
      launch: { throwId: 1, seed: 7, target: [0, 0, -1], force: 0.6, handCenter: hand[0], handOmega: [0, 0, 0] },
      bias: { test, kinds: omenKinds(dice) },
    };
    const rec = presimulateFor(request, 20_000);
    expect(rec.results).toEqual(results);
    expect(rec.escaped).toBe(false);
  }, 30_000);
});
