import { Quaternion, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { customKind, unregisterCustom } from '../src/dice/custom';
import { formatDice, parseDice, resultText, slugOf, slugProblem } from '../src/dice/notation';
import { isD20, omenOf } from '../src/dice/omen';
import { baseOf, polyhedron, sortDice } from '../src/dice/polyhedra';
import { readUp, toResults } from '../src/dice/read';
import { customDieOf } from './helpers/models';
import { simulate } from './helpers/sim';

const skull = () => customDieOf('d20', 'Caveira', 'caveira');
afterEach(() => { for (const id of ['caveira', 'cav', 'osso']) unregisterCustom(customKind(`test-${id}`)); });

describe('imported dice in the chat', () => {
  it('reads and writes the nickname', () => {
    const k = customKind(skull().id);
    expect(parseDice('2d20caveira + d6')).toEqual({ dice: sortDice(['d6', k, k]) });
    expect(formatDice([k, k])).toBe('2d20 Caveira');
    expect(resultText([k, k], [3, 4]).total).toBe('7');
  });
  it('prefers the longest word and still reads the built-in dice', () => {
    customDieOf('d20', 'Cav', 'cav'); skull();
    const [cav, caveira] = ['test-cav', 'test-caveira'].map(customKind);
    expect(parseDice('d20caveira')).toEqual({ dice: [caveira] });
    expect(parseDice('d20cav + d20')).toEqual({ dice: sortDice(['d20', cav]) });
  });
  it('refuses nicknames that clash with the chat', () => {
    skull();
    for (const s of ['v', 'fogo', 'moeda', 'd20', 'caveira', '1x', 'Ab', 'a b']) expect(slugProblem(s)).toBeTruthy();
    expect(slugProblem('osso')).toBeNull();
    expect(slugOf('Caveira Rúnica 2')).toBe('caveirarunica2');
    expect(slugOf('123')).toBe('');
  });
  it('mentions imported dice when it does not understand', () => {
    skull();
    expect((parseDice('xyz') as { error: string }).error).toContain('2d20caveira');
  });
});

describe('imported dice in play', () => {
  it('reads the face on top like any die, and a d10 reads 0 as 10', () => {
    const k = customKind(skull().id);
    expect(baseOf(k)).toBe('d20');
    const p = polyhedron(k), face = p.faces.find((f) => f.value === 7)!;
    const q = new Quaternion().setFromUnitVectors(new Vector3(...face.normal), new Vector3(0, 1, 0)); // turn face 7 up
    expect(readUp(p, q.toArray() as [number, number, number, number]).value).toBe(7);
    const ten = customDieOf('d10', 'Osso', 'osso');
    expect(toResults([customKind(ten.id)], [0])).toEqual([10]);
  });
  it('counts as a d20 for omens only when the player asked', () => {
    const on = customKind(customDieOf('d20', 'Cav', 'cav').id), off = customKind(customDieOf('d20', 'Caveira', 'caveira', { omens: false }).id);
    expect(isD20(on)).toBe(true);
    expect(isD20(off)).toBe(false);
    expect(omenOf([on, off], [20, 20])).toEqual({ crits: [0], fumbles: [] });
    expect(omenOf([on, off], [1, 1])).toEqual({ crits: [], fumbles: [0] });
  });
  it('rolls in the tray: stays inside, reads 1..20, deterministic', async () => {
    const kind = customKind(skull().id);
    const a = await simulate({ kind, count: 3, force: 0.8, target: [0, 0, -1], seed: 11 });
    const b = await simulate({ kind, count: 3, force: 0.8, target: [0, 0, -1], seed: 11 });
    expect(a.escaped).toBe(false);
    expect(a.results).toEqual(b.results);
    a.results.forEach((v) => { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(20); });
  });
});
