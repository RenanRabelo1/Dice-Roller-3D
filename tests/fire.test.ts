import { describe, expect, it } from 'vitest';
import { TRAY } from '../src/physics/world';
import { FIRE, fireAt, fireIndices, fireReach } from '../src/scene/fireMotion';

describe('d20 = 1: the die catches fire and the fire takes the tray', () => {
  it('only a d20 fumble burns (a duality never does)', () => {
    expect(fireIndices({ crits: [], fumbles: [0, 2] }, ['d20', 'd100', 'd20'])).toEqual([0, 2]);
    expect(fireIndices({ crits: [], fumbles: [1] }, ['d20', 'd100'])).toEqual([]);
    expect(fireIndices({ crits: [1], fumbles: [0] }, ['d20', 'd20'])).toEqual([]);
    expect(fireIndices(null, ['d20'])).toEqual([]);
  });

  it('spreads from the burning dice until every corner of the felt is ablaze', () => {
    for (const lit of [[{ x: 0, z: 0 }], [{ x: 6, z: 4 }], [{ x: -5, z: -3 }, { x: 5, z: 3 }]]) {
      const reach = fireReach(lit);
      const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: sx * TRAY.halfWidth, z: sz * TRAY.halfDepth })));
      const r = fireAt(FIRE.spread[1], reach).radius;
      for (const c of corners) expect(Math.min(...lit.map((p) => Math.hypot(c.x - p.x, c.z - p.z)))).toBeLessThanOrEqual(r);
      expect(fireAt(FIRE.spread[0], reach).radius).toBe(0);
    }
  });

  it('the tray burns out, but the die keeps burning until it is picked up', () => {
    expect(fireAt(0, 10).die).toBe(0);
    expect(fireAt(FIRE.ignite, 10).die).toBe(1);
    expect(fireAt(FIRE.spread[1], 10).tray).toBe(1);
    expect(fireAt(FIRE.trayOut[1], 10).tray).toBe(0);
    expect(fireAt(60_000, 10).die).toBe(1);
  });
});
