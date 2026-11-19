import { afterEach, describe, expect, it, vi } from 'vitest';
import { Box3, InstancedMesh, Line3, Mesh, PerspectiveCamera, Ray, Scene, Triangle, Vector3, type BufferGeometry, type Material, type Object3D, type WebGLRenderer } from 'three';
import { arremesso, input, publish, TRAY } from '../../arremesso/index.ts';
import { RADIUS } from '../../dados/index.ts';
import { definir } from '../../selecao/index.ts';
import { definirMovimentoReduzido } from '../../../shared/plataforma/index.ts';
import { presagio, reiniciarPresagio } from '../index.ts';
import { PAR, VAMPIRO } from '../domain/vampiroMotion.ts';
import { Show } from '../scene/PresagiosNaCena.tsx';
import { COLUNAS_CRITICO, dobraDoCritico, DOBRAS_CRITICO, PUNHO_DO_VAMPIRO, Vampiro } from '../scene/Vampiro.ts';
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
const { halfWidth: w, halfDepth: d, wallThickness: thick, wallHeight: h } = TRAY;
const volume = (minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) =>
  new Box3(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ));
const tray = [
  volume(-w - thick, 0, -d - thick, w + thick, h, -d),
  volume(-w - thick, 0, d, w + thick, h, d + thick),
  volume(-w - thick, 0, -d, -w, h, d), volume(w, 0, -d, w + thick, h, d),
  volume(-w, -0.12, -d, w, 0, d),
];
const FOLGA = 0.15;
const marksDoPar = [PAR.surge, PAR.revoada, PAR.revela, PAR.mostrado];
// At the default camera, the single result row for a pair is centred six units from the eye.
const resultTop = RADIUS.d10 / (Math.sqrt(6 ** 2 - RADIUS.d10 ** 2) * Math.tan(camera.fov * Math.PI / 360));
const defineWalls = (boxes: Box3[], distance: number) => boxes.map((box) => {
  const corners = Array.from({ length: 8 }, (_, i) => new Vector3(
    (i & 1 ? box.max : box.min).x, (i & 2 ? box.max : box.min).y, (i & 4 ? box.max : box.min).z));
  const edges = corners.flatMap((corner, i) => [1, 2, 4].filter((bit) => !(i & bit))
    .map((bit) => new Line3(corner, corners[i ^ bit])));
  return { box, expanded: box.clone().expandByScalar(distance), distance, corners, edges };
});
const walls = defineWalls(tray, FOLGA);

function triangleIsClear(triangle: Triangle, wall: (typeof walls)[number], point: Vector3) {
  if (!wall.expanded.intersectsTriangle(triangle)) return true;
  if (wall.box.intersectsTriangle(triangle)) return false;
  const vertices = [triangle.a, triangle.b, triangle.c];
  if (vertices.some((p) => wall.box.distanceToPoint(p) < wall.distance)) return false;
  if (wall.corners.some((corner) => triangle.closestPointToPoint(corner, point).distanceToSquared(corner) < wall.distance ** 2)) return false;
  // Disjoint convex surfaces approach at a vertex/face or along two edges.
  return vertices.every((p, i) => {
    const side = new Line3(p, vertices[(i + 1) % 3]);
    return wall.edges.every((edge) => side.distanceSqToLine3(edge) >= wall.distance ** 2);
  });
}

function projectVampire(body: Object3D, head: Object3D, project: boolean) {
  const bounds = new Box3(), skull = new Box3();
  const peito = new Box3(), ombros = new Box3(), core = new Box3();
  const coreParts = new Set<Object3D>();
  if (project) body.getObjectByName('vampiro-tronco')!.traverse((part) => coreParts.add(part));
  const ray = new Ray(camera.position.clone());
  const hit = new Vector3(), point = new Vector3(), triangle = new Triangle();
  const clear = new Box3();
  let collision = '';
  body.updateWorldMatrix(true, true);
  body.traverse((mesh) => {
    if (!(mesh instanceof Mesh)) return;
    const isHead = mesh.parent === head;
    const { geometry, matrixWorld } = mesh;
    geometry.computeBoundingBox();
    clear.copy(geometry.boundingBox!).applyMatrix4(matrixWorld);
    const near = walls.filter(({ expanded }) => expanded.intersectsBox(clear));
    if (!project && !near.length) return;
    const vertices = geometry.getAttribute('position');
    const worldPoints = Array.from({ length: vertices.count }, (_, i) =>
      new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(matrixWorld));
    if (project) for (const vertex of worldPoints) {
      const distance = ray.direction.subVectors(vertex, ray.origin).length();
      ray.direction.divideScalar(distance);
      const hidden = tray.some((box) => ray.intersectBox(box, hit) && hit.distanceTo(ray.origin) < distance - 0.0001);
      if (!hidden) {
        point.copy(vertex).project(camera);
        bounds.expandByPoint(point);
        if (coreParts.has(mesh)) core.expandByPoint(point);
        if (mesh.name === 'vampiro-peito') peito.expandByPoint(point);
        if (mesh.name === 'vampiro-ombros') ombros.expandByPoint(point);
      }
      if (isHead) skull.expandByPoint(point.copy(vertex).project(camera));
    }
    if (!near.length) return;
    const index = geometry.getIndex()!;
    for (let i = 0; i < index.count; i += 3) {
      triangle.set(worldPoints[index.getX(i)], worldPoints[index.getX(i + 1)], worldPoints[index.getX(i + 2)]);
      if (near.some((wall) => !triangleIsClear(triangle, wall, point))) {
        collision = mesh.name || (mesh.material as Material).name;
        break;
      }
    }
  });
  return { bounds, skull, peito, ombros, core, collision };
}
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
    expect(first.geometries.size).toBeLessThanOrEqual(35);
    expect(first.materials.size).toBeLessThanOrEqual(16);
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

  it('frames the leaning pair with its full head, centred over the rear lip and clear of the tray', () => {
    const vampire = new Vampiro();
    const body = vampire.root.getObjectByName('vampiro-corpo')!;
    const head = vampire.root.getObjectByName('vampiro-cabeca')!;
    const transitions = Array.from({ length: 24 }, (_, i) => [(i + 1) * 29, PAR.sai + i * 33]).flat();
    for (const t of [...transitions, ...marksDoPar, 900, 1900, 3600, 4300]) {
      vampire.update('par-de-criticos', t, camera);
      const checkFrame = marksDoPar.includes(t);
      const { bounds, skull, peito, ombros, core, collision } = projectVampire(body, head, checkFrame);
      expect.soft(collision, `${t} ms`).toBe('');
      if (!checkFrame) continue;
      const height = (bounds.max.y - bounds.min.y) / 2;
      const bottom = (1 - bounds.min.y) / 2;
      const center = Math.abs(bounds.max.x + bounds.min.x) / 4;
      const headBox = new Box3().setFromObject(head, true), face = headBox.getCenter(new Vector3());
      expect.soft(height, `${t} ms`).toBeGreaterThanOrEqual(0.24);
      expect.soft((core.max.y - core.min.y) / 2, `${t} ms sem os braços`).toBeGreaterThanOrEqual(0.24);
      expect.soft(height, `${t} ms`).toBeLessThanOrEqual(0.32);
      expect.soft(bottom, `${t} ms`).toBeLessThanOrEqual(0.42);
      expect.soft(bounds.max.y, `${t} ms`).toBeLessThanOrEqual(1);
      expect.soft(bounds.min.y, `${t} ms`).toBeGreaterThan(resultTop);
      expect.soft(center, `${t} ms`).toBeLessThanOrEqual(0.03);
      expect.soft(face.y, `${t} ms`).toBeGreaterThanOrEqual(4.5);
      expect.soft(face.z, `${t} ms`).toBeGreaterThanOrEqual(-d);
      expect.soft(face.z, `${t} ms`).toBeLessThanOrEqual(-d + 2);
      expect.soft((skull.max.y - skull.min.y) / 2, `${t} ms`).toBeGreaterThanOrEqual(0.065);
      expect.soft(peito.min.y).toBeLessThan(skull.min.y);
      expect.soft(ombros.min.y).toBeLessThan(skull.min.y);
      for (const limit of [skull.max.x, skull.max.y, -skull.min.x, -skull.min.y]) expect.soft(limit).toBeLessThanOrEqual(1);
    }
    vampire.dispose();
  }, 20_000);

  it('frames the face with open palms and keeps the arms well above the felt', () => {
    const vampire = new Vampiro();
    const head = vampire.root.getObjectByName('vampiro-cabeca')!;
    const cameraFront = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    for (const t of marksDoPar) {
      vampire.update('par-de-criticos', t, camera);
      vampire.root.updateMatrixWorld(true);
      const skull = new Box3().setFromObject(head, true), center = skull.getCenter(new Vector3());
      for (const [handSide, armSide] of [['esquerda', 'esquerdo'], ['direita', 'direito']]) {
        const palm = vampire.root.getObjectByName(`vampiro-mao-${handSide}`)!;
        const wrist = palm.localToWorld(new Vector3(...PUNHO_DO_VAMPIRO));
        const distance = Math.abs(wrist.x - center.x);
        const arm = ['braco', 'antebraco'].map((part) => vampire.root.getObjectByName(`vampiro-${part}-${armSide}`)!);
        for (const part of [palm, ...arm]) expect.soft(new Box3().setFromObject(part, true).min.y).toBeGreaterThanOrEqual(2.5);
        expect.soft(wrist.y).toBeGreaterThan(skull.min.y);
        expect.soft(distance).toBeGreaterThanOrEqual(1.0);
        expect.soft(distance).toBeLessThanOrEqual(2.2);
        const elbowY = arm[1].getWorldPosition(new Vector3()).y;
        expect.soft(wrist.y).toBeGreaterThan(elbowY);
        expect.soft(elbowY).toBeGreaterThanOrEqual(arm[0].getWorldPosition(new Vector3()).y);
        expect(new Vector3(0, 0, 1).transformDirection(palm.matrixWorld).dot(cameraFront)).toBeGreaterThan(0.95);
        palm.traverse((part) => { if (part instanceof Mesh) expect(part.morphTargetInfluences).toEqual([0]); });
      }
    }
    vampire.dispose();
  }, 20_000);

  it('keeps an adult head-to-body and head-to-shoulder ratio in the neutral sculpture', () => {
    const vampire = new Vampiro();
    vampire.root.updateMatrixWorld(true);
    const bounds = (name: string) => new Box3().setFromObject(vampire.root.getObjectByName(name)!, true);
    const head = bounds('vampiro-cabeca'), shoulders = bounds('vampiro-ombros');
    const figureHeight = head.max.y - bounds('vampiro-perna-esquerda').min.y;
    const headHeight = (head.max.y - head.min.y) / figureHeight;
    const headWidth = (head.max.x - head.min.x) / (shoulders.max.x - shoulders.min.x);
    expect(headHeight).toBeGreaterThanOrEqual(1 / 8);
    expect(headHeight).toBeLessThanOrEqual(1 / 7);
    expect(headWidth).toBeLessThanOrEqual(0.4);
    const neck = bounds('vampiro-pescoco').getSize(new Vector3());
    expect(neck.y).toBeGreaterThan(0.23);
    expect(neck.x / (head.max.x - head.min.x)).toBeGreaterThanOrEqual(0.42);
    expect(neck.x / (head.max.x - head.min.x)).toBeLessThanOrEqual(0.50);
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
