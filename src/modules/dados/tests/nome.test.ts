import { afterEach, describe, expect, it } from 'vitest';
import { customKind, nomeDoTipo, polyhedron, registerCustom, unregisterCustom, type CustomDie } from '../index.ts';

// A registered imported die named "Caveira", on a d20 or as a free-form solid (no model needed here).
const imported = (id: string, free: boolean): CustomDie => {
  const poly = free ? { ...polyhedron('d20'), shape: 'livre' as const } : polyhedron('d20');
  const die: CustomDie = {
    version: 1, id, createdAt: 0, name: 'Caveira', slug: 'caveira', base: free ? 'livre' : 'd20', omens: false,
    file: { format: 'stl', name: `${id}.stl`, bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
    poly, printed: false, color: null,
  };
  registerCustom(die);
  return die;
};
afterEach(() => { for (const id of ['n-d20', 'n-livre']) unregisterCustom(customKind(id)); });

describe('nomeDoTipo', () => {
  it('names the special built-in kinds', () => {
    expect(nomeDoTipo('vtm')).toBe('d10 Vampiro');
    expect(nomeDoTipo('hunger')).toBe('d10 Fome');
    expect(nomeDoTipo('coin')).toBe('Moeda');
    expect(nomeDoTipo('d20')).toBe('d20');
  });
  it('an imported die is "<base> <name>"; a free-form one only "<name>"', () => {
    expect(nomeDoTipo(customKind(imported('n-d20', false).id))).toBe('d20 Caveira');
    expect(nomeDoTipo(customKind(imported('n-livre', true).id))).toBe('Caveira');
  });
});
