import { describe, it, expect } from 'vitest';
import { Color } from 'three';
import { shard, shardWood } from '../cena.ts';

// The kraken's shards wear the table's colours; the table's own tests are in src/modules/mesa/tests/.
describe('kraken shards', () => {
  const rgb = (g: { getAttribute(n: string): { getX(i: number): number; getY(i: number): number; getZ(i: number): number } }, i: number) => {
    const c = g.getAttribute('color');
    return new Color(c.getX(i), c.getY(i), c.getZ(i)).getHexString();
  };
  const cell: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  it('are felt on top and wood below, in the colours given', () => {
    const g = shard(cell, 0.5, 0.5, new Color('#112233'), new Color('#445566'));
    expect(rgb(g, 0)).toBe('112233');
    expect(rgb(g, 3)).toBe('445566');
  });
  it('keep today\'s colours on the default table', () => {
    expect(rgb(shard(cell, 0.5, 0.5), 0)).toBe('3a0f1a');
    expect(shardWood('#3B2416').getHexString()).toBe('815435');
    expect(shardWood('#ffffff').getHexString()).toBeTruthy();
  });
});
