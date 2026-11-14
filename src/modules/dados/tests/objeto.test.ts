import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { dadoNaRaiz, definirOpacidade, definirSombra, gemaNaRaiz, sombraNaGema } from '../index.ts';

// A die as AparenciaDoDado draws it, by hand: `die-0` holds the gem `gem-0` (a group, as for an imported die, with
// two meshes, one of them with two materials) and the engraving's glow, a mesh child of the die.
function scene() {
  const root = new Group(), die = new Group(), gem = new Group();
  die.name = 'die-0';
  gem.name = 'gem-0';
  const a = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ transparent: true }));
  const b = new Mesh(new BoxGeometry(), [new MeshStandardMaterial(), new MeshStandardMaterial()]);
  gem.add(a, b);
  const glow = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  die.add(gem, glow);
  root.add(die);
  return { root, die, gem, a, b, glow };
}

describe('objeto do dado na cena', () => {
  it('finds the die and its gem', () => {
    const { root, die, gem } = scene();
    expect(dadoNaRaiz(root, 0)).toBe(die);
    expect(gemaNaRaiz(root, 0)).toBe(gem);
  });
  it('finds nothing for a die that is not there', () => {
    const { root } = scene();
    expect(dadoNaRaiz(root, 3)).toBeUndefined();
    expect(gemaNaRaiz(root, 3)).toBeUndefined();
    expect(() => { definirOpacidade(root, 3, 0.5); definirSombra(root, 3, false); }).not.toThrow();
  });
  it('sets the opacity of every material under the die, the glow included', () => {
    const { root, a, b, glow } = scene();
    definirOpacidade(root, 0, 0.25);
    expect((a.material as MeshStandardMaterial).opacity).toBe(0.25);
    expect((b.material as MeshStandardMaterial[]).map((m) => m.opacity)).toEqual([0.25, 0.25]);
    expect((glow.material as MeshBasicMaterial).opacity).toBe(0.25);
  });
  it('switches the shadow of the gem meshes only', () => {
    const { root, a, b, glow } = scene();
    glow.castShadow = true;
    definirSombra(root, 0, true);
    expect([a.castShadow, b.castShadow]).toEqual([true, true]);
    definirSombra(root, 0, false);
    expect([a.castShadow, b.castShadow, glow.castShadow]).toEqual([false, false, true]);
  });
  it('switches the shadow on a gem already found, and does nothing without one', () => {
    const { root, gem, a, b, glow } = scene();
    glow.castShadow = true;
    sombraNaGema(gemaNaRaiz(root, 0), false);
    expect([a.castShadow, b.castShadow, glow.castShadow]).toEqual([false, false, true]);
    sombraNaGema(gem, true);
    expect([a.castShadow, b.castShadow]).toEqual([true, true]);
    expect(() => sombraNaGema(undefined, false)).not.toThrow();
  });
  it('switches the shadow of a built-in die, whose gem is the mesh itself', () => {
    const root = new Group(), die = new Group(), gem = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    die.name = 'die-1'; gem.name = 'gem-1'; gem.castShadow = true;
    die.add(gem); root.add(die);
    definirSombra(root, 1, false);
    expect(gem.castShadow).toBe(false);
  });
});
