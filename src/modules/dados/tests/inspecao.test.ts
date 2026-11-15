import { describe, expect, it } from 'vitest';
import { BoxGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three';
import { inspecao } from '../index.ts';

// A die as AparenciaDoDado draws it, by hand: `die-0` holds the gem `gem-0` and the numerals object, whose anchors
// (not scene children, like BatchedText's members) are in userData.labels.
function scene() {
  const root = new Group(), die = new Group(), numbers = new Object3D();
  die.name = 'die-0';
  die.position.set(1, 0, 0);
  const label = new Object3D();
  label.position.set(0, 0.5, 0);
  label.rotation.x = -Math.PI / 2; // facing +Y
  Object.assign(label.userData, { text: '6', value: 6 });
  numbers.userData.labels = [label];
  const gem = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  gem.name = 'gem-0';
  die.add(gem, numbers);
  root.add(die);
  return { root, numbers, gem };
}

describe('inspecao', () => {
  it('reads the labels of a die in world space', () => {
    const [l] = inspecao.rotulos(scene().root, 0);
    expect(l.text).toBe('6');
    expect(l.value).toBe(6);
    expect(l.position.map((c) => +c.toFixed(6))).toEqual([1, 0.5, 0]);
    expect(l.normal.map((c) => +c.toFixed(6) + 0)).toEqual([0, 1, 0]);
  });
  it('finds nothing for a die that is not there', () => {
    const { root } = scene();
    expect(inspecao.rotulos(root, 3)).toEqual([]);
    expect(inspecao.numeraisVisiveis(root, 3)).toBe(false);
    expect(inspecao.aparenciaDaGema(root, 3)).toEqual([]);
  });
  it('tells whether the numerals show', () => {
    const { root, numbers } = scene();
    expect(inspecao.numeraisVisiveis(root, 0)).toBe(true);
    numbers.visible = false;
    expect(inspecao.numeraisVisiveis(root, 0)).toBe(false);
  });
  it('describes the gem: material, opacity, paint and the first inked vertex', () => {
    const { root, gem } = scene();
    expect(inspecao.aparenciaDaGema(root, 0)).toEqual([{ shown: true, material: 'MeshStandardMaterial', opaque: true, painted: false, ink: null }]);
    const painted = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 }));
    const n = painted.geometry.getAttribute('position').count;
    painted.geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3).fill(0.25), 3));
    painted.geometry.userData.ink = Uint8Array.from({ length: n / 3 }, (_, i) => (i === 1 ? 1 : 0));
    painted.visible = false;
    gem.add(painted);
    expect(inspecao.aparenciaDaGema(root, 0)[1]).toEqual({ shown: false, material: 'MeshBasicMaterial', opaque: false, painted: true, ink: [0.25, 0.25, 0.25] });
  });
});
