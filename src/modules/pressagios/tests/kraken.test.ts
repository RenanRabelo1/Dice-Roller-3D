import { describe, expect, it } from 'vitest';
import { fractureCells, KRAKEN, krakenAt, krakenIndices, stormIndices, trayBrokenAt } from '../domain/krakenMotion.ts';

// The kraken's and the storm's rules that need no showcase (OS-0047); the die's path to the result pose is tested
// with the showcase in src/modules/vitrine/tests/kraken.test.ts.
describe('d100 = 1: the kraken grabs the die, flings it away and brings it back', () => {
  it('only a positive d100 critical calls the kraken; only a d100 fumble the storm', () => {
    expect(krakenIndices({ crits: [0, 1], fumbles: [] }, ['d20', 'd100'])).toEqual([1]);
    expect(krakenIndices({ crits: [0], fumbles: [1] }, ['d100', 'd20'])).toEqual([]);
    expect(krakenIndices(null, ['d100'])).toEqual([]);
    expect(stormIndices({ crits: [], fumbles: [0, 1] }, ['d20', 'd100'])).toEqual([1]);
    expect(stormIndices({ crits: [1], fumbles: [0] }, ['d100', 'd20'])).toEqual([]);
  });

  it('the tentacle holds the die while carrying it and lets go to throw it', () => {
    expect(krakenAt(KRAKEN.lift).grip).toBe(1);
    expect(krakenAt(KRAKEN.shown).grip).toBe(1);
    expect(krakenAt((KRAKEN.fling + KRAKEN.catch) / 2).grip).toBe(0);
    expect(krakenAt(KRAKEN.duration).grip).toBe(0);
  });

  it('breaks the tray as it rises and leaves it whole at the end', () => {
    expect(krakenAt(0)).toMatchObject({ broken: false, spread: 0, arms: 0 });
    expect(krakenAt(KRAKEN.grab)).toMatchObject({ broken: true, spread: 1 });
    expect(krakenAt(KRAKEN.restored)).toMatchObject({ broken: false, spread: 0, arms: 0 });
    expect(krakenAt(KRAKEN.shown).reveal).toBe(1);
    expect(krakenAt(KRAKEN.duration + 5000).reveal).toBe(1); // the number keeps showing on the die
  });
});

describe('temporary tray fragments', () => {
  it.each([[0, 0], [4.5, -2.5], [-4.5, 2.5]])('cover the entire original floor from (%s, %s) without gaps', (x, z) => {
    const cells = fractureCells(x, z);
    const area = cells.reduce((sum, points) => sum + Math.abs(points.reduce((a, p, i) => {
      const next = points[(i + 1) % points.length];
      return a + p[0] * next[1] - next[0] * p[1];
    }, 0)) / 2, 0);
    expect(area).toBeCloseTo(15 * 10, 5);
    expect(cells.flat().every(([px, pz]) => Math.abs(px) <= 7.5 + 1e-8 && Math.abs(pz) <= 5 + 1e-8)).toBe(true);
  });
});

describe('trayBrokenAt', () => {
  const live = { phase: 'settled' as const, throwId: 4, omen: { throwId: 4, crits: [0], fumbles: [] }, omenDone: 3, omenAt: 1000, dice: ['d100' as const], reducedMotion: false };
  const mid = 1000 + KRAKEN.lift;
  it('is broken in the middle of the kraken', () => expect(trayBrokenAt(live, mid)).toBe(true));
  it('is whole before the rupture and after the repair', () => {
    expect(trayBrokenAt(live, 1000)).toBe(false);
    expect(trayBrokenAt(live, 1000 + KRAKEN.restored)).toBe(false);
  });
  it('is whole at once with reduced motion', () => expect(trayBrokenAt({ ...live, reducedMotion: true }, mid)).toBe(false));
  it('is whole once the omen is done, for another throw, or when the hand is picked up', () => {
    expect(trayBrokenAt({ ...live, omenDone: 4 }, mid)).toBe(false);
    expect(trayBrokenAt({ ...live, throwId: 5 }, mid)).toBe(false);
    expect(trayBrokenAt({ ...live, phase: 'hand' }, mid)).toBe(false);
  });
  it('is whole when the selection has no d100 critical', () => {
    expect(trayBrokenAt({ ...live, dice: ['d20'] }, mid)).toBe(false);
    expect(trayBrokenAt({ ...live, omen: { throwId: 4, crits: [0], fumbles: [0] } }, mid)).toBe(false);
    expect(trayBrokenAt({ ...live, omen: null }, mid)).toBe(false);
  });
});
