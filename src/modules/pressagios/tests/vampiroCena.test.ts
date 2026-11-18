import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mesh, PerspectiveCamera, Scene, Vector3, type BufferGeometry, type Material, type Object3D, type WebGLRenderer } from 'three';
import { arremesso, input, publish } from '../../arremesso/index.ts';
import { definir } from '../../selecao/index.ts';
import { definirMovimentoReduzido } from '../../../shared/plataforma/index.ts';
import { presagio, reiniciarPresagio } from '../index.ts';
import { VAMPIRO_MS } from '../domain/vampiroMotion.ts';
import { Show } from '../scene/PresagiosNaCena.tsx';
import { Vampiro } from '../scene/Vampiro.ts';

const camera = new PerspectiveCamera(40, 1.6);
camera.position.set(0, 14, 10);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();

function resources(root: Object3D) {
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    geometries.add(o.geometry);
    for (const material of ([] as Material[]).concat(o.material)) materials.add(material);
  });
  return { geometries, materials };
}

function showOfScene() {
  const color = { addColorStop: vi.fn() };
  const ctx = { createRadialGradient: () => color, fillRect: vi.fn() };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const scene = new Scene(), show = new Show();
  scene.add(show.root);
  return { show, scene, vampire: scene.getObjectByName('vampiro')! };
}

const target = () => new Vector3(0, 0.7, 0);
const roll = () => {
  const source = { kind: 'key' } as const;
  definir(['hunger']);
  input({ type: 'press', source, at: 0, repeat: false });
  input({ type: 'release', source, at: 550 });
  publish(arremesso().throwId, [10]);
};

afterEach(() => {
  vi.unstubAllGlobals();
  definirMovimentoReduzido(false);
  reiniciarPresagio();
});

describe('Vampire scene', () => {
  it('warms the figure and camera hands in the shared shader compile, then hides them', () => {
    const { show, scene, vampire } = showOfScene();
    expect(vampire.visible).toBe(false);
    const compile = vi.fn(() => {
      expect(vampire.visible).toBe(true);
      expect(vampire.getObjectByName('vampiro-cabeca')?.visible).toBe(true);
      expect(vampire.getObjectByName('vampiro-maos-da-camera')?.visible).toBe(true);
    });
    show.compile({ compile } as unknown as WebGLRenderer, scene, camera);
    expect(compile).toHaveBeenCalledExactlyOnceWith(scene, camera);
    expect(vampire.visible).toBe(false);
    show.dispose();
  });

  it('reuses a bounded set of geometries and materials and releases each exactly once', () => {
    const vampire = new Vampiro();
    const first = resources(vampire.root);
    expect(first.geometries.size).toBeGreaterThan(0);
    expect(first.geometries.size).toBeLessThanOrEqual(32);
    expect(first.materials.size).toBeLessThanOrEqual(12);
    vampire.update('par-de-criticos', 1900, camera, [[1, 0.8, -1], [2, 0.8, 1]]);
    expect(vampire.root.getObjectByName('vampiro-cabeca')?.visible).toBe(false);
    vampire.update('critico-bestial', 1980, camera, [[1, 0.8, -1]]);
    vampire.update('falha-bestial', 1600, camera);
    vampire.hide();
    expect(resources(vampire.root)).toEqual(first);
    const dispose = [...first.geometries, ...first.materials].map((asset) => vi.spyOn(asset, 'dispose'));
    vampire.dispose();
    for (const released of dispose) expect(released).toHaveBeenCalledTimes(1);
  });

  it('hides on finish, pickup, selection change and reduced motion', () => {
    const { show, vampire } = showOfScene();
    const at = (t: number) => show.frame(presagio().omenAt + t, camera, target, 800);
    at(0);
    expect(vampire.visible).toBe(false);
    roll();
    at(1200);
    expect(vampire.visible).toBe(true);
    expect(at(VAMPIRO_MS['critico-bestial'] + 1)).toBe(arremesso().throwId);
    expect(vampire.visible).toBe(false);
    roll();
    at(1200);
    expect(vampire.visible).toBe(true);
    input({ type: 'press', source: { kind: 'key' }, at: 1200, repeat: false });
    at(1300);
    expect(vampire.visible).toBe(false);
    roll();
    at(1200);
    definir(['d20']);
    at(1300);
    expect(vampire.visible).toBe(false);
    roll();
    at(1200);
    definirMovimentoReduzido(true);
    at(1300);
    expect(vampire.visible).toBe(false);
    show.dispose();
  });
});
