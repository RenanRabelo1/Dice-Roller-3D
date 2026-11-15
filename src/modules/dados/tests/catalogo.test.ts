import { afterEach, describe, expect, it } from 'vitest';
import { customKind, paraRegras, polyhedron, registerCustom, unregisterCustom, type CustomDie, type StdBase } from '../index.ts';

// A registered imported die whose solid is the built-in one of its base (no model needed here).
const imported = (id: string, base: StdBase, omens: boolean): CustomDie => {
  const die: CustomDie = {
    version: 1, id, createdAt: 0, name: id, slug: id, base, omens,
    file: { format: 'stl', name: `${id}.stl`, bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
    poly: polyhedron(base), printed: false, color: null,
  };
  registerCustom(die);
  return die;
};
afterEach(() => { for (const id of ['t-on', 't-off', 't-d6']) unregisterCustom(customKind(id)); });

describe('paraRegras', () => {
  it('an imported d20 counts as a d20 only when the player asked for omens', () => {
    expect(paraRegras(customKind(imported('t-on', 'd20', true).id))).toBe('d20');
    expect(paraRegras(customKind(imported('t-off', 'd20', false).id))).toBe('custom:t-off');
  });
  it('an imported die of another base stays itself, even with omens on', () => {
    expect(paraRegras(customKind(imported('t-d6', 'd6', true).id))).toBe('custom:t-d6');
  });
  it('a built-in kind is itself', () => {
    for (const k of ['d20', 'd6', 'd100', 'vtm', 'coin'] as const) expect(paraRegras(k)).toBe(k);
  });
});
