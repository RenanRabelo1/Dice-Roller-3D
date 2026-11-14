import { afterEach, describe, expect, it } from 'vitest';
import { catalogoAlterado, customDie, customKind, polyhedron, registerCustom, registerPoly, unregisterCustom, type CustomDie } from '../index.ts';

const die = (id: string): CustomDie => ({
  version: 1, id, createdAt: 0, name: id, slug: id, base: 'd6', omens: false,
  file: { format: 'stl', name: `${id}.stl`, bytes: new ArrayBuffer(0) }, fit: { center: [0, 0, 0], scale: 1 },
  poly: polyhedron('d6'), printed: false, color: null,
});
afterEach(() => { for (const id of ['s-a', 's-poly']) unregisterCustom(customKind(id)); });

describe('catalogoAlterado', () => {
  it('tells when an imported kind is registered and removed', () => {
    const seen: unknown[] = [];
    const off = catalogoAlterado.subscribe((e) => seen.push(e));
    registerCustom(die('s-a'));
    unregisterCustom(customKind('s-a'));
    off();
    expect(seen).toEqual([{ kind: 'custom:s-a', mudanca: 'registrado' }, { kind: 'custom:s-a', mudanca: 'removido' }]);
  });
  it('stays quiet when only the worker registers a solid', () => {
    const seen: unknown[] = [];
    const off = catalogoAlterado.subscribe((e) => seen.push(e));
    registerPoly(customKind('s-poly'), polyhedron('d6'));
    off();
    expect(seen).toEqual([]);
  });
  it('is exposed only to subscribe (the catalogue publishes)', () => {
    expect(Object.keys(catalogoAlterado)).toEqual(['subscribe']);
  });
  it('keeps the same record between emissions, a stable snapshot', () => {
    const d = die('s-a');
    registerCustom(d);
    expect(customDie(customKind('s-a'))).toBe(customDie(customKind('s-a')));
    expect(customDie(customKind('s-a'))).toBe(d);
  });
});
