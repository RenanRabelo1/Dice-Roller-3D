import { afterEach, describe, expect, it, vi } from 'vitest';
import { Box3, InstancedMesh, Mesh, PerspectiveCamera, Scene, Vector3, type BufferGeometry, type Material, type Object3D, type WebGLRenderer } from 'three';
import { arremesso, input, publish, TRAY } from '../../arremesso/index.ts';
import { definir } from '../../selecao/index.ts';
import { definirMovimentoReduzido } from '../../../shared/plataforma/index.ts';
import { presagio, reiniciarPresagio } from '../index.ts';
import { PAR, VAMPIRO } from '../domain/vampiroMotion.ts';
import { Show } from '../scene/PresagiosNaCena.tsx';
import { COLUNAS_CRITICO, dobraDoCritico, DOBRAS_CRITICO, Vampiro } from '../scene/Vampiro.ts';
import { CENTRO_DA_PEGA } from '../scene/vampiroMao.ts';

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
  const vampire = scene.getObjectByName('vampiro')!;
  const bats = scene.getObjectByName('revoada')!;
  const blood = scene.getObjectByName('sangue')!;
  return { show, scene, vampire, bats, blood };
}

const target = () => new Vector3(0, 0.7, 0);
const roll = () => {
  const source = { kind: 'key' } as const;
  definir(['vtm', 'vtm']);
  input({ type: 'press', source, at: 0, repeat: false });
  input({ type: 'release', source, at: 550 });
  publish(arremesso().throwId, [10, 10]);
};

afterEach(() => {
  vi.unstubAllGlobals();
  definirMovimentoReduzido(false);
  reiniciarPresagio();
});

describe('Vampire scene', () => {
  it('warms the figure, camera hands, bats and blood in the shared compile, then hides them', () => {
    const { show, scene, vampire, bats, blood } = showOfScene();
    expect(vampire.visible).toBe(false);
    const compile = vi.fn(() => {
      expect(vampire.visible).toBe(true);
      expect(vampire.getObjectByName('vampiro-cabeca')?.visible).toBe(true);
      expect(vampire.getObjectByName('vampiro-maos-da-camera')?.visible).toBe(true);
      expect(vampire.getObjectByName('vampiro-capa-critica')?.visible).toBe(true);
      expect(bats.visible).toBe(true);
      expect(blood.visible).toBe(true);
    });
    show.compile({ compile } as unknown as WebGLRenderer, scene, camera);
    expect(compile).toHaveBeenCalledExactlyOnceWith(scene, camera);
    expect(vampire.visible).toBe(false);
    expect(bats.visible).toBe(false);
    expect(blood.visible).toBe(false);
    show.dispose();
  });

  it('reuses a bounded set of geometries and materials and releases each exactly once', () => {
    const vampire = new Vampiro();
    const first = resources(vampire.root);
    expect(first.geometries.size).toBeGreaterThan(0);
    expect(first.geometries.size).toBeLessThanOrEqual(32);
    expect(first.materials.size).toBeLessThanOrEqual(12);
    vampire.update('par-de-criticos', 1900, camera, [[1, 0.8, -1], [2, 0.8, 1]]);
    expect(vampire.root.getObjectByName('vampiro-cabeca')?.visible).toBe(true);
    vampire.update('critico-bestial', 1980, camera, [[1, 0.8, -1]]);
    const critical = vampire.root.getObjectByName('vampiro-capa-critica') as Mesh;
    const releasesCritical = [vi.spyOn(critical.geometry, 'dispose'), vi.spyOn(critical.material as Material, 'dispose')];
    vampire.update('falha-bestial', 1600, camera);
    vampire.hide();
    expect(resources(vampire.root)).toEqual(first);
    const dispose = [...first.geometries, ...first.materials].map((asset) => vi.spyOn(asset, 'dispose'));
    vampire.dispose();
    for (const released of [...dispose, ...releasesCritical]) expect(released).toHaveBeenCalledTimes(1);
  });

  it('releases every bat and blood geometry, material and instance buffer once', () => {
    const { show, bats, blood } = showOfScene();
    const parts = [bats, blood];
    const assets = parts.flatMap((root) => {
      const { geometries, materials } = resources(root);
      return [...geometries, ...materials, ...(root.children as InstancedMesh[])];
    });
    const releases = assets.map((asset) => vi.spyOn(asset, 'dispose'));
    roll();
    for (const t of [PAR.cobre, PAR.sai, PAR.duration]) show.frame(presagio().omenAt + t, camera, target, 800);
    show.dispose();
    for (const release of releases) expect(release).toHaveBeenCalledTimes(1);
  });

  it('keeps the entire pair figure beyond the outer face of the back wall', () => {
    const vampire = new Vampiro();
    const body = vampire.root.getObjectByName('vampiro-corpo')!;
    for (const t of [400, 900, PAR.cobre, PAR.sai, 5200]) {
      vampire.update('par-de-criticos', t, camera);
      expect(new Box3().setFromObject(body, true).max.z).toBeLessThan(-TRAY.halfDepth - TRAY.wallThickness);
    }
    vampire.dispose();
  });

  it('holds the pair figure above the wall at the waist during its presence', () => {
    const vampire = new Vampiro();
    const body = vampire.root.getObjectByName('vampiro-corpo')!;
    for (const t of [900, 3100, 4300]) {
      vampire.update('par-de-criticos', t, camera);
      const waist = body.localToWorld(new Vector3(0, 1.45, 0));
      expect(waist.y).toBeGreaterThan(TRAY.wallHeight);
      expect(waist.z).toBeLessThan(-TRAY.halfDepth - TRAY.wallThickness);
    }
    vampire.dispose();
  });

  it('fills the space above the rear lip without cropping the pair figure', () => {
    const vampire = new Vampiro();
    const body = vampire.root.getObjectByName('vampiro-corpo')!;
    const head = vampire.root.getObjectByName('vampiro-cabeca')!;
    const lip = new Vector3(0, TRAY.wallHeight, -TRAY.halfDepth - TRAY.wallThickness).project(camera).y;
    const point = new Vector3();
    for (const t of [900, 3100, 3600, 4300]) {
      vampire.update('par-de-criticos', t, camera);
      body.updateWorldMatrix(true, true);
      let top = -Infinity;
      head.traverse((mesh) => {
        if (!(mesh instanceof Mesh)) return;
        const vertices = mesh.geometry.getAttribute('position');
        for (let i = 0; i < vertices.count; i++) {
          top = Math.max(top, point.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld).project(camera).y);
        }
      });
      expect((top - lip) / (1 - lip)).toBeGreaterThanOrEqual(0.85);
      expect((1 - top) / 2).toBeGreaterThanOrEqual(0);
      expect((1 - top) / 2).toBeLessThanOrEqual(0.015);
      expect(body.position.x).toBe(0);
    }
    vampire.dispose();
  });

  it('runs seven full depth folds from collar to hem within a quarter of the viewport', () => {
    const vampire = new Vampiro();
    vampire.update('critico-bestial', 1900, camera, [[1, 0.8, -1]]);
    const cape = vampire.root.getObjectByName('vampiro-capa-critica') as Mesh;
    cape.updateWorldMatrix(true, false);
    const vertices = cape.geometry.getAttribute('position');
    const columns = COLUNAS_CRITICO + 1;
    const tool = new Vector3();
    let widest = 0;
    expect(DOBRAS_CRITICO).toBe(7);
    for (let fold = 0; fold < DOBRAS_CRITICO; fold++) {
      expect(dobraDoCritico(fold / DOBRAS_CRITICO)).toBeGreaterThanOrEqual(0.08);
      expect(dobraDoCritico((fold + 0.5) / DOBRAS_CRITICO)).toBeLessThanOrEqual(-0.08);
    }
    for (let start = 0; start < vertices.count; start += columns) {
      let lo = 1, hi = -1;
      const projected = (col: number) => Math.max(-1, Math.min(1,
        tool.fromBufferAttribute(vertices, start + col).applyMatrix4(cape.matrixWorld).project(camera).x));
      for (let col = 0; col < columns; col++) {
        const x = projected(col);
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
      const folds = Array.from({ length: DOBRAS_CRITICO }, (_, i) => projected(Math.round((i + 0.5) / DOBRAS_CRITICO * COLUNAS_CRITICO)));
      const marks = [lo, ...folds, hi].sort((a, b) => a - b);
      for (let i = 1; i < marks.length; i++) widest = Math.max(widest, (marks[i] - marks[i - 1]) / 2);
    }
    expect(widest).toBeLessThanOrEqual(0.25);
    vampire.dispose();
  });

  it('puts the cupped palm around the die in the foreground attack', () => {
    const vampire = new Vampiro();
    const carried = new Vector3(0.65, 11, 7.7);
    vampire.update('falha-bestial', VAMPIRO.falha.rasante, camera, [[-3, 0.7, -2]], carried.toArray());
    const palm = vampire.root.getObjectByName('vampiro-mao-direita')!;
    expect(palm.localToWorld(new Vector3(...CENTRO_DA_PEGA)).distanceTo(carried)).toBeLessThan(1e-6);
    vampire.dispose();
  });

  it('keeps each camera hand and its cuff on its own side throughout coverage', () => {
    const vampire = new Vampiro();
    const hands = vampire.root.getObjectByName('vampiro-maos-da-camera')!;
    const world = new Vector3();
    for (const t of [900, 1600, 2300]) {
      vampire.update('falha-bestial', t, camera);
      hands.updateWorldMatrix(true, true);
      hands.children.forEach((hand, side) => hand.traverse((mesh) => {
        if (!(mesh instanceof Mesh)) return;
        const vertices = mesh.geometry.getAttribute('position');
        for (let i = 0; i < vertices.count; i++) {
          const x = world.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld).project(camera).x;
          if (side === 0 ? x >= 0 : x <= 0) throw new Error(`Camera hand ${side} crossed the frame at ${t} ms`);
        }
      }));
    }
    vampire.dispose();
  });

  it('closes the grip around its die with the wrist away from an adjacent spectator die', () => {
    const vampire = new Vampiro(), die = new Vector3(0, 6, 4);
    vampire.update('critico-bestial', 2800, camera, [], die.toArray(), [[1.1, 6, 4]]);
    const palm = vampire.root.getObjectByName('vampiro-mao-direita')!;
    const [skin, nails] = palm.children as Mesh[];
    expect(skin.morphTargetInfluences).toEqual([1]);
    expect(nails.morphTargetInfluences).toEqual([1]);
    expect(palm.localToWorld(new Vector3(...CENTRO_DA_PEGA)).distanceTo(die)).toBeLessThan(1e-6);
    expect(palm.localToWorld(new Vector3(0, -0.31, -0.035)).x).toBeLessThan(-1.1);
    vampire.dispose();
  });

  it('hides on finish, pickup, selection change and reduced motion', () => {
    const { show, vampire, bats, blood } = showOfScene();
    const at = (t: number) => show.frame(presagio().omenAt + t, camera, target, 800);
    const visible = () => [vampire.visible, bats.visible, blood.visible];
    at(0);
    expect(visible()).toEqual([false, false, false]);
    roll();
    at(PAR.cobre);
    expect(visible()).toEqual([true, true, false]);
    at(PAR.sai);
    expect(visible()).toEqual([true, false, true]);
    expect(at(PAR.duration + 1)).toBe(arremesso().throwId);
    expect(visible()).toEqual([false, false, false]);
    roll();
    at(PAR.cobre);
    expect(visible()).toEqual([true, true, false]);
    input({ type: 'press', source: { kind: 'key' }, at: 1200, repeat: false });
    at(PAR.cobre + 1);
    expect(visible()).toEqual([false, false, false]);
    roll();
    at(PAR.sai);
    expect(visible()).toEqual([true, false, true]);
    definir(['d20']);
    at(PAR.sai + 1);
    expect(visible()).toEqual([false, false, false]);
    roll();
    at(PAR.sai);
    expect(visible()).toEqual([true, false, true]);
    definirMovimentoReduzido(true);
    at(PAR.sai + 1);
    expect(visible()).toEqual([false, false, false]);
    show.dispose();
  });
});
