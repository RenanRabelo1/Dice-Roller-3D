import { describe, it, expect, beforeEach } from 'vitest';
import { adicionar, definir, selecao } from '../index.ts';
import { remover } from '../store.ts';
import { customKind, polyhedron, registerCustom, unregisterCustom, type CustomDie } from '../../dados/index.ts';

beforeEach(() => definir(['d20']));

describe('mão', () => {
  // Moved from tests/store.test.ts, where the legacy store's actions built the hand.
  it('builds a mixed selection: sorted, 1 to 10 dice', () => {
    adicionar('d100'); adicionar('d4'); adicionar('d12');
    expect(selecao()).toEqual(['d4', 'd12', 'd20', 'd100']);
    remover('d20'); remover('d4'); remover('d12');
    expect(selecao()).toEqual(['d100']);
    remover('d100'); expect(selecao()).toEqual(['d100']); // never empty
    for (let i = 0; i < 20; i++) adicionar('d6');
    expect(selecao()).toHaveLength(10);
  });

  it('remover takes the last occurrence of that kind', () => {
    definir(['d6', 'd6', 'd20']);
    remover('d6');
    expect(selecao()).toEqual(['d6', 'd20']);
  });

  it('definir sorts, cuts at 10, drops imported kinds out of the catalogue and ignores an empty list', () => {
    definir(['d100', 'd4', 'd20']);
    expect(selecao()).toEqual(['d4', 'd20', 'd100']);
    definir(Array(12).fill('d8'));
    expect(selecao()).toHaveLength(10);
    definir([customKind('sel-ausente'), 'd6']);
    expect(selecao()).toEqual(['d6']);
    definir([]);
    expect(selecao()).toEqual(['d6']);
    definir([customKind('sel-ausente')]);
    expect(selecao()).toEqual(['d6']);
  });

  it('definir keeps imported kinds in the catalogue', () => {
    const die: CustomDie = {
      version: 1, id: 'sel-m', createdAt: 0, name: 'sel-m', slug: 'selm', base: 'd6', omens: false,
      file: { format: 'stl', name: 'sel-m.stl', bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
      poly: polyhedron('d6'), printed: false, color: null,
    };
    registerCustom(die);
    definir([customKind('sel-m'), 'd20']);
    expect(selecao()).toEqual(['d20', customKind('sel-m')]);
    unregisterCustom(customKind('sel-m'));
  });
});
