import { describe, expect, it } from 'vitest';
import type { Pose } from '../../../shared/math.ts';
import { indicesComPercurso, movimentoNoPresagio } from '../domain/percurso.ts';
import { KRAKEN, krakenAt, krakenDieAt, STORM, stormAt, stormDieAt } from '../domain/krakenMotion.ts';

const de: Pose = { p: [2, 0.9, -2], q: [0, 0, 0, 1] }, para: Pose = { p: [0, 6, 4], q: [0, 0.7071, 0, 0.7071] };

describe('indicesComPercurso: the dice the omen carries itself (no ordinary flight)', () => {
  it('the d100 of a kraken (crit without fumble) and of a storm (fumble without crit)', () => {
    expect(indicesComPercurso({ crits: [1], fumbles: [] }, ['d20', 'd100'])).toEqual({ kraken: [1], tempestade: [] });
    expect(indicesComPercurso({ crits: [], fumbles: [0, 1] }, ['d100', 'd100'])).toEqual({ kraken: [], tempestade: [0, 1] });
  });
  it('none for a d20, a duality or no omen', () => {
    expect(indicesComPercurso({ crits: [0], fumbles: [] }, ['d20'])).toEqual({ kraken: [], tempestade: [] });
    expect(indicesComPercurso({ crits: [0], fumbles: [1] }, ['d100', 'd100'])).toEqual({ kraken: [], tempestade: [] });
    expect(indicesComPercurso(null, ['d100'])).toEqual({ kraken: [], tempestade: [] });
  });
});

describe('movimentoNoPresagio: where the omen holds the die, and how much of its number shows', () => {
  it('the kraken grabs, flings and brings the die back', () => {
    for (const ms of [0, KRAKEN.grab + 100, KRAKEN.fling + 200, KRAKEN.catch + 400, KRAKEN.shown, KRAKEN.duration]) {
      expect(movimentoNoPresagio(1, ms, de, para, [1], [])).toEqual(
        { pose: krakenDieAt(ms, de, para), revela: krakenAt(ms).reveal, sombra: KRAKEN.grab, fim: KRAKEN.duration });
    }
  });
  it('the storm drifts the die to the screen', () => {
    for (const ms of [0, STORM.approach + 300, STORM.arrive - 200, STORM.duration]) {
      expect(movimentoNoPresagio(0, ms, de, para, [], [0])).toEqual(
        { pose: stormDieAt(ms, de, para), revela: stormAt(ms).reveal, sombra: STORM.approach, fim: STORM.duration });
    }
  });
  it('the shadow goes at the grab (1150 ms) or the approach (600 ms); the path ends at 6500 or 4600 ms', () => {
    expect(movimentoNoPresagio(1, 0, de, para, [1], [])).toMatchObject({ sombra: 1150, fim: 6500 });
    expect(movimentoNoPresagio(0, 0, de, para, [], [0])).toMatchObject({ sombra: 600, fim: 4600 });
  });
  it('null for a die the omen does not move', () => {
    expect(movimentoNoPresagio(0, 1000, de, para, [1], [2])).toBeNull();
    expect(movimentoNoPresagio(0, 1000, de, para, [], [])).toBeNull();
  });
});
