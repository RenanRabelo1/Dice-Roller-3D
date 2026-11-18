import { describe, expect, it } from 'vitest';
import {
  BufferGeometry, InstancedMesh, MathUtils, Matrix4, Mesh, PerspectiveCamera, Ray, Vector3, type Object3D,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TRAY } from '../../arremesso/index.ts';
import { NUMERO_DE_MORCEGOS, PAR } from '../domain/vampiroMotion.ts';
import { Morcegos, painelDaAsa, PONTAS_DA_ASA } from '../scene/Morcegos.ts';
import { escoamentoAt, Sangue } from '../scene/Sangue.ts';
import { Vampiro } from '../scene/Vampiro.ts';

const camera = new PerspectiveCamera(40, 1.6);
camera.position.set(0, 14, 10);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();

function malhas(root: Object3D) {
  const meshes: Mesh[] = [];
  root.traverse((part) => { if (part instanceof Mesh) meshes.push(part); });
  return meshes;
}

function maxAngle(source: BufferGeometry, morph = 0) {
  const g = new BufferGeometry();
  const pos = morph ? source.morphAttributes.position![morph - 1] : source.getAttribute('position');
  g.setAttribute('position', pos);
  g.setIndex(source.getIndex());
  const welded = mergeVertices(g, 1e-6);
  const index = welded.getIndex()!, vertices = welded.getAttribute('position');
  const edges = new Map<number, Vector3>();
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  let cosine = 1;
  for (let i = 0; i < index.count; i += 3) {
    const x = index.getX(i), y = index.getX(i + 1), z = index.getX(i + 2);
    a.fromBufferAttribute(vertices, x);
    b.fromBufferAttribute(vertices, y).sub(a);
    c.fromBufferAttribute(vertices, z).sub(a);
    const normal = new Vector3().crossVectors(b, c);
    if (normal.lengthSq() < 1e-24) continue;
    normal.normalize();
    for (const [start, end] of [[x, y], [y, z], [z, x]]) {
      const key = Math.min(start, end) * vertices.count + Math.max(start, end);
      const previous = edges.get(key);
      if (previous) cosine = Math.min(cosine, normal.dot(previous));
      else edges.set(key, normal);
    }
  }
  g.dispose();
  welded.dispose();
  return MathUtils.radToDeg(Math.acos(MathUtils.clamp(cosine, -1, 1)));
}

function geometryLabel(mesh: Mesh) {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return `${mesh.name || mesh.parent?.name || 'vampiro'}:${material.name}`;
}

describe('Vampire procedural meshes', () => {
  it('keeps adjacent triangles within 15 degrees on the curved surfaces', () => {
    const vampire = new Vampiro(), bats = new Morcegos(), blood = new Sangue();
    const figures = [...new Map([vampire.root, bats.root, blood.root].flatMap(malhas).map((m) => [m.geometry, m])).values()];
    const measured = figures.flatMap((m) => [0, ...(m.geometry.morphAttributes.position ? [1] : [])]
      .map((morph) => ({ name: geometryLabel(m), morph, angle: maxAngle(m.geometry, morph) })));
    const cape = new Set(malhas(vampire.root.getObjectByName('vampiro-capa')!).map((mesh) => mesh.geometry));
    for (const [type, t] of [['par-de-criticos', 900], ['par-de-criticos', 4300], ['critico-bestial', 1900], ['falha-bestial', 3700]] as const) {
      vampire.update(type, t, camera);
      for (const geometry of cape) measured.push({ name: `capa:${type}:${t}`, morph: 0, angle: maxAngle(geometry) });
    }
    // No intentional sharp-edge exceptions. The collar, nails and fangs are rounded too.
    expect(measured.filter(({ angle }) => angle > 15)).toEqual([]);
    vampire.dispose();
  }, 20_000);

  it('batches the figure by material and instances the flock and blood within their draw budgets', () => {
    const vampire = new Vampiro(), bats = new Morcegos(), blood = new Sangue();
    const body = vampire.root.getObjectByName('vampiro-corpo')!;
    const meshes = malhas(body);
    const vertices = new Set(meshes.map((mesh) => mesh.geometry));
    expect([...vertices].reduce((total, g) => total + g.getAttribute('position').count, 0)).toBeLessThanOrEqual(60_000);
    expect(meshes.reduce((total, mesh) => total + mesh.geometry.getAttribute('position').count, 0)).toBeLessThanOrEqual(60_000);
    const calls = new Map<string, number>();
    for (const mesh of meshes) {
      const key = mesh.parent!.uuid + (Array.isArray(mesh.material) ? 'multi' : mesh.material.uuid);
      calls.set(key, (calls.get(key) ?? 0) + (Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1));
    }
    expect(Math.max(...calls.values())).toBeLessThanOrEqual(4);
    expect(malhas(bats.root)).toHaveLength(3);
    expect(malhas(blood.root)).toHaveLength(2);
    for (const mesh of malhas(bats.root)) {
      expect(mesh).toBeInstanceOf(InstancedMesh);
      expect((mesh as InstancedMesh).instanceMatrix.count).toBe(NUMERO_DE_MORCEGOS);
    }
    for (const mesh of malhas(blood.root)) expect(mesh).toBeInstanceOf(InstancedMesh);
    vampire.dispose();
  });
});

it('gives each wing five fingers with four inset scallops and curved panels', () => {
  expect(PONTAS_DA_ASA).toHaveLength(5);
  for (let panel = 0; panel < PONTAS_DA_ASA.length - 1; panel++) {
    const wrist = painelDaAsa(panel, 0.5, 0);
    const outer = painelDaAsa(panel, 0.5, 1);
    const centre = painelDaAsa(panel, 0.5, 0.5);
    const straight = painelDaAsa(panel, 0, 1).lerp(painelDaAsa(panel, 1, 1), 0.5);
    const length = Math.hypot(wrist.x - outer.x, wrist.z - outer.z);
    const camber = (centre.y - (wrist.y + outer.y) * 0.5) / length;
    expect(camber).toBeGreaterThanOrEqual(0.08);
    expect(camber).toBeLessThanOrEqual(0.15);
    expect(length).toBeLessThan(Math.hypot(wrist.x - straight.x, wrist.z - straight.z));
  }
});

it('keeps the projected bats below twelve percent of the default viewport width', () => {
  const bats = new Morcegos();
  const parts = malhas(bats.root) as InstancedMesh[];
  const matrix = new Matrix4(), clip = new Matrix4();
  const projection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  let widest = 0;
  for (const t of [1300, 1600, PAR.cobre, 1900, PAR.descobre, 2300, 2500]) {
    bats.update(t, camera);
    for (let i = 0; i < parts[0].count; i++) {
      let left = 1, right = -1;
      for (const part of parts) {
        part.getMatrixAt(i, matrix);
        const e = clip.multiplyMatrices(projection, matrix).elements;
        const xyz = part.geometry.getAttribute('position').array;
        for (let j = 0; j < xyz.length; j += 3) {
          const x = xyz[j], y = xyz[j + 1], z = xyz[j + 2];
          const screen = (e[0] * x + e[4] * y + e[8] * z + e[12]) / (e[3] * x + e[7] * y + e[11] * z + e[15]);
          left = Math.min(left, screen);
          right = Math.max(right, screen);
        }
      }
      widest = Math.max(widest, (Math.min(1, right) - Math.max(-1, left)) / 2);
    }
  }
  expect(widest).toBeLessThanOrEqual(0.12);
});

it('starts the blood on the lip, follows the inner walls and shrinks the length by 5200 ms', () => {
  const initial = escoamentoAt(PAR.sangue);
  const early = escoamentoAt(3100);
  const peak = escoamentoAt(PAR.sai);
  const leaving = escoamentoAt(5200);
  const ended = escoamentoAt(PAR.duration);
  expect(initial.labio).toBe(0);
  expect(early.labio).toBeGreaterThan(0);
  for (const side of [-1, 1]) {
    const streams = peak.filetes.filter(({ x }) => x * side > 0);
    expect(streams).toHaveLength(17);
    for (const { x, largura } of streams) {
      expect(TRAY.halfWidth - Math.abs(x)).toBeCloseTo(0.0065, 6);
      expect(largura).toBeGreaterThanOrEqual(0.06);
      expect(largura).toBeLessThanOrEqual(0.14);
    }
  }
  expect(peak.filetes.some(({ comprimento, poca }) => comprimento === TRAY.wallHeight && poca > 0)).toBe(true);
  expect(peak.filetes.some(({ comprimento }) => comprimento < TRAY.wallHeight)).toBe(true);
  for (const [i, stream] of peak.filetes.entries()) {
    expect(leaving.filetes[i].comprimento).toBeLessThanOrEqual(stream.comprimento * 0.60);
    expect(ended.filetes[i].comprimento).toBe(0);
    expect(ended.filetes[i].poca).toBe(0);
  }
});

function triangleHits(ray: Ray, geometry: BufferGeometry) {
  const vertices = geometry.getAttribute('position'), index = geometry.getIndex()!;
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), hit = new Vector3();
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(vertices, index.getX(i));
    b.fromBufferAttribute(vertices, index.getX(i + 1));
    c.fromBufferAttribute(vertices, index.getX(i + 2));
    if (ray.intersectTriangle(a, b, c, false, hit)) return hit;
  }
  return null;
}

it('occludes a 9 by 6 grid of felt from the default camera throughout the flock peak', () => {
  const bats = new Morcegos();
  const parts = (malhas(bats.root) as InstancedMesh[]).reverse();
  const radius = Math.max(...parts.map(({ geometry }) => {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry.boundingSphere!.center.length() + geometry.boundingSphere!.radius;
  }));
  const instances = Array.from({ length: NUMERO_DE_MORCEGOS }, () => ({
    center: new Vector3(), radiusSq: 0,
    parts: parts.map((mesh) => ({ mesh, world: new Matrix4(), local: new Matrix4() })),
  }));
  const rays = [0, TRAY.wallHeight].flatMap((height) => Array.from({ length: 54 }, (_, i) => {
    const point = new Vector3((i % 9 / 4 - 1) * TRAY.halfWidth, height, (Math.floor(i / 9) / 2.5 - 1) * TRAY.halfDepth);
    const direction = point.clone().sub(camera.position);
    return { ray: new Ray(camera.position.clone(), direction.clone().normalize()), lengthSq: direction.lengthSq(), point };
  }));
  const local = new Ray();
  for (let t = PAR.cobre; t <= PAR.descobre; t++) {
    bats.update(t, camera);
    const drawn = instances.slice(0, parts[0].count);
    drawn.forEach((instance, i) => {
      for (const { mesh, world, local } of instance.parts) {
        mesh.getMatrixAt(i, world);
        local.copy(world).invert();
      }
      const { world } = instance.parts[0];
      instance.center.setFromMatrixPosition(world);
      instance.radiusSq = (radius * world.getMaxScaleOnAxis()) ** 2;
    });
    for (const { ray, lengthSq, point } of rays) {
      const covered = drawn.some(({ center, radiusSq, parts }) => {
        if (ray.distanceSqToPoint(center) > radiusSq) return false;
        return parts.some(({ mesh, world, local: inverse }) => {
          local.copy(ray).applyMatrix4(inverse);
          if (!local.intersectsBox(mesh.geometry.boundingBox!)) return false;
          const hit = triangleHits(local, mesh.geometry);
          return !!hit && hit.applyMatrix4(world).distanceToSquared(ray.origin) < lengthSq;
        });
      });
      if (!covered) throw new Error(`Exposed felt at ${t} ms, point ${point.toArray()}`);
    }
  }
}, 30_000);
