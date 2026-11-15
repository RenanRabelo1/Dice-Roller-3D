import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { adicionar, definir, remover, selecao, selecaoAlterada } from '../index.ts';
import { customKind, polyhedron, registerCustom, unregisterCustom, type CustomDie } from '../../dados/index.ts';
import type { DieKind } from '../../regras/index.ts';

const die = (id: string): CustomDie => ({
  version: 1, id, createdAt: 0, name: id, slug: id.replace(/[^a-z0-9]/g, ''), base: 'd6', omens: false,
  file: { format: 'stl', name: `${id}.stl`, bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
  poly: polyhedron('d6'), printed: false, color: null,
});

let seen: DieKind[][] = [];
let off = () => {};
beforeEach(() => {
  definir(['d20']);
  seen = [];
  off = selecaoAlterada.subscribe(({ dice }) => seen.push(dice));
});
afterEach(() => off());

describe('selecaoAlterada', () => {
  it('is exposed only to subscribe (the module publishes)', () => {
    expect(Object.keys(selecaoAlterada)).toEqual(['subscribe']);
  });

  it('emits the new hand on every accepted call', () => {
    adicionar('d6');
    remover('d6');
    definir(['d4', 'd8']);
    expect(seen).toEqual([['d6', 'd20'], ['d20'], ['d4', 'd8']]);
    expect(seen.at(-1)).toBe(selecao());
  });

  it('emits even when the hand did not change (the throw resets as before)', () => {
    definir(['d20']);
    expect(seen).toEqual([['d20']]);
  });

  it('stays quiet on a refused call: at the maximum, the last die, a kind not in the hand, an empty list', () => {
    remover('d20'); // the last die
    remover('d6'); // not in the hand
    definir([]); // empty
    definir([customKind('sel-fora')]); // empty once the unknown imported kind is dropped
    expect(seen).toEqual([]);
    definir(Array(10).fill('d6'));
    seen = [];
    adicionar('d4'); // at the maximum
    expect(seen).toEqual([]);
    expect(selecao()).toHaveLength(10);
  });
});

describe('reação ao catálogo', () => {
  it('a kind removed from the catalogue leaves the hand', () => {
    registerCustom(die('sel-a'));
    definir([customKind('sel-a'), 'd6', customKind('sel-a')]);
    seen = [];
    unregisterCustom(customKind('sel-a'));
    expect(selecao()).toEqual(['d6']);
    expect(seen).toEqual([['d6']]);
  });

  it('a removed kind that was not in the hand still emits, with the same hand', () => {
    registerCustom(die('sel-b'));
    definir(['d4', 'd6']);
    seen = [];
    unregisterCustom(customKind('sel-b'));
    expect(selecao()).toEqual(['d4', 'd6']);
    expect(seen).toEqual([['d4', 'd6']]);
  });

  it('a hand emptied by the removal goes back to a d20', () => {
    registerCustom(die('sel-c'));
    definir([customKind('sel-c'), customKind('sel-c')]);
    seen = [];
    unregisterCustom(customKind('sel-c'));
    expect(selecao()).toEqual(['d20']);
    expect(seen).toEqual([['d20']]);
  });

  it('a registered kind changes nothing', () => {
    registerCustom(die('sel-d'));
    expect(seen).toEqual([]);
    expect(selecao()).toEqual(['d20']);
    unregisterCustom(customKind('sel-d'));
  });
});
