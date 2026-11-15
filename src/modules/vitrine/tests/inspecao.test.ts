// inspecao(cena): the showcase's fields of the test hook (OS-0044), the same calculation the shell's hook made before.
import { describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, Object3D } from 'three';
import { inspecao } from '../index.ts';

const nomeado = <T extends Object3D>(o: T, name: string, visible = true) => Object.assign(o, { name, visible });

describe('inspecao: the showcase as the test hook reads it', () => {
  it('an empty scene: no numbers and no glow', () => {
    const lido = inspecao(new Object3D());
    expect(lido.highlights()).toEqual([]);
    expect(lido.inkGlow(0)).toBeNull();
  });
  it('the rolled numbers (a symbol has no text) and the lit engraving, off the scene', () => {
    const cena = new Group(), grupo = nomeado(new Group(), 'result-highlights');
    // troika's Text needs a browser: an Object3D with `text` stands in for it.
    const numero = Object.assign(new Object3D(), { text: '17' });
    numero.position.set(1, 2, 3);
    const simbolo = new Mesh();
    simbolo.visible = false; simbolo.position.set(-1, 0, 0.5);
    grupo.add(numero, simbolo);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(18), 3)); // 6 vertices: 2 triangles
    const brilho = nomeado(new Mesh(geo, new MeshBasicMaterial({ transparent: true, opacity: 0.4 })), 'ink-glow-0');
    cena.add(grupo, brilho);
    const lido = inspecao(cena);
    expect(lido.highlights()).toEqual([
      { text: '17', visible: true, position: [1, 2, 3] },
      { text: null, visible: false, position: [-1, 0, 0.5] },
    ]);
    expect(lido.inkGlow(0)).toEqual({ visible: true, triangles: 2, opacity: 0.4 });
    expect(lido.inkGlow(1)).toBeNull();
  });
});
