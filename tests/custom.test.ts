import { Quaternion, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { customKind, registerPoly, unregisterCustom } from '../src/dice/custom';
import { formatDice, parseDice, resultText, slugOf, slugProblem } from '../src/dice/notation';
import { isD20, omenOf } from '../src/dice/omen';
import { baseOf, polyhedron, sortDice } from '../src/dice/polyhedra';
import { readUp, toResults } from '../src/dice/read';
import { customDieOf, freeDieOf, prismTriangles } from './helpers/models';
import { simulate } from './helpers/sim';
import { checkFreeValue, checkFreeValues } from '../src/dice/importer';

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

describe('the worker', () => {
  it('rolls a die it only knows by its solid (registerPoly)', async () => {
    const die = skull(), kind = customKind(die.id);
    unregisterCustom(kind);
    registerPoly(kind, die.poly);
    const rec = await simulate({ kind, count: 2, force: 0.6, target: [1, 0, -1], seed: 5 });
    expect(rec.escaped).toBe(false);
    expect(rec.results).toHaveLength(2);
  });
});

describe('a free-form die', () => {
  const seven = () => freeDieOf(prismTriangles(5, 1.4), 'Sete', 'sete', [1, 2, 3, 4, 5, 6, 7]);
  it('rolls in the tray: stays inside, reads one of its values, deterministic', async () => {
    const kind = customKind(seven().id);
    for (const seed of [3, 11, 29]) {
      const a = await simulate({ kind, count: 2, force: 0.8, target: [0, 0, -1], seed });
      const b = await simulate({ kind, count: 2, force: 0.8, target: [0, 0, -1], seed });
      expect(a.escaped).toBe(false);
      expect(a.results).toEqual(b.results);
      a.results.forEach((v) => { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(7); });
    }
  });
  it('checks free values: whole numbers from -99 to 999, repeats allowed', () => {
    expect(checkFreeValue(-99)).toBeNull();
    expect(checkFreeValue(999)).toBeNull();
    expect(checkFreeValue(1000)).toMatch(/-99 a 999/);
    expect(checkFreeValue(1.5)).not.toBeNull();
    expect(checkFreeValues([2, 2, 3, 3, 4, 4], 6)).toBeNull();
    expect(checkFreeValues([2, 2], 3)).toBe('Faltam números.');
  });
});

describe('a free-form die in the chat', () => {
  const cav = () => customKind(freeDieOf(prismTriangles(5, 1.4), 'Caveira', 'caveira', [1, 2, 3, 4, 5, 6, 7]).id);
  it('answers to its nickname alone, with or without a count', () => {
    const k = cav();
    expect(parseDice('caveira')).toEqual({ dice: [k] });
    expect(parseDice('2caveira')).toEqual({ dice: [k, k] });
    expect(parseDice('2 caveira')).toEqual({ dice: [k, k] });
    expect(parseDice('caveira + d20')).toEqual({ dice: ['d20', k] });
    expect(parseDice('2d6caveira')).toEqual({ dice: ['d6', 'd6', k] }); // compact: 2d6 then the die
    expect(parseDice('0caveira')).toHaveProperty('error');
  });
  it('is named by itself and sums like a normal die', () => {
    const k = cav();
    expect(formatDice([k, k, 'd20'])).toBe('1d20 + 2 Caveira');
    expect(resultText([k, k], [3, 4]).total).toBe('7');
  });
  it('never raises an omen', () => {
    expect(isD20(cav())).toBe(false);
  });
  it('refuses the words the chat already reads as a nickname', () => {
    for (const s of ['moeda', 'boladefogo']) expect(slugProblem(s)).toBeTruthy();
  });
});
