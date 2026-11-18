import {
  BufferAttribute, Color, DoubleSide, DynamicDrawUsage, Frustum, Group, IcosahedronGeometry, InstancedMesh, Matrix4, MeshStandardMaterial,
  Object3D, Sphere, Vector3, type BufferGeometry, type Camera,
} from 'three';
import { ENVERGADURA, NUMERO_DE_MORCEGOS, PAR, revoadaAt } from '../domain/vampiroMotion.ts';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Vec3 } from '../../../shared/math.ts';
import { soldar, superficie } from './malhaLisa.ts';

export const OMBRO_DA_ASA = 0.04;
const PULSO_DA_ASA = new Vector3(0.195, 0, -0.105);
export const PONTAS_DA_ASA = [
  [ENVERGADURA / 2 - OMBRO_DA_ASA, -0.32], [0.59, 0.085], [0.44, 0.27], [0.24, 0.36], [0.048, 0.275],
] as const;
const CAMBRA = 1.02;

function membrana(x: number, z: number) {
  const d = (x - PULSO_DA_ASA.x) ** 2 + (z - PULSO_DA_ASA.z) ** 2;
  return -CAMBRA * d + 0.018;
}

export function painelDaAsa(panel: number, u: number, v: number) {
  const [ax, az] = PONTAS_DA_ASA[panel], [bx, bz] = PONTAS_DA_ASA[panel + 1];
  const { x: wx, z: wz } = PULSO_DA_ASA;
  const reach = v * (1 - 0.16 * Math.sin(u * Math.PI));
  const x = wx + (ax + (bx - ax) * u - wx) * reach;
  const z = wz + (az + (bz - az) * u - wz) * reach;
  return new Vector3(x, membrana(x, z), z);
}

function tingir(geometry: BufferGeometry, r: number, g: number, b: number) {
  const colors = new Float32Array(geometry.getAttribute('position').count * 3);
  for (let i = 0; i < colors.length; i += 3) { colors.set([r, g, b], i); }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

function asa(side: number) {
  const vincos = Array.from({ length: 4 }, (_, i) => superficie(8, 12, (u, v) => {
    const { x, y, z } = painelDaAsa(i, u, v);
    return [side * x, y, z];
  }));
  const liga = (a: readonly [number, number], b: readonly [number, number]) => superficie(5, 12, (u, v) => {
    const x = PULSO_DA_ASA.x + (a[0] + (b[0] - a[0]) * u - PULSO_DA_ASA.x) * v;
    const z = PULSO_DA_ASA.z + (a[1] + (b[1] - a[1]) * u - PULSO_DA_ASA.z) * v;
    return [side * x, membrana(x, z), z];
  });
  const frente = [PONTAS_DA_ASA[4], [0, 0.135], [0, -0.015], [0.12, -0.18],
    [0.30, -0.35], [0.61, -0.365], PONTAS_DA_ASA[0]] as const;
  for (let i = 1; i < frente.length; i++) vincos.push(liga(frente[i - 1], frente[i]));

  const osso = (x: number, z: number, inicio: number, ponta: number) => {
    const dx = x - PULSO_DA_ASA.x, dz = z - PULSO_DA_ASA.z;
    const lateral = new Vector3(-dz, 0, dx).normalize();
    return superficie(27, 7, (u, v) => {
      const d = Math.hypot(dx, dz) * v, angle = u * 2 * Math.PI;
      const a = Math.atan(-2 * CAMBRA * d);
      const radius = inicio + (ponta - inicio) * v;
      const px = PULSO_DA_ASA.x + dx * v, pz = PULSO_DA_ASA.z + dz * v;
      const lift = Math.sin(angle) * radius;
      const along = -Math.sin(a) * lift / Math.hypot(dx, dz);
      return [
        side * (px + radius * Math.cos(angle) * lateral.x + dx * along),
        membrana(px, pz) + radius * 0.5 + Math.cos(a) * lift,
        pz + radius * Math.cos(angle) * lateral.z + dz * along,
      ];
    });
  };
  const ossos = PONTAS_DA_ASA.map(([x, z], i) => osso(x, z, i === 0 ? 0.017 : 0.012, 0.003));
  ossos.push(osso(0, -0.015, 0.023, 0.015));
  return soldar([...vincos.map((g) => tingir(g, 1, 0.92, 0.93)), ...ossos.map((g) => tingir(g, 1.62, 1.23, 1.24))]);
}

function oval(p: Vec3, s: Vec3, detail = 5) {
  const geo = new IcosahedronGeometry(1, detail);
  const pos = geo.getAttribute('position'), point = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    point.fromBufferAttribute(pos, i);
    const d = Math.hypot(point.x * s[0], point.y * s[1], point.z * s[2]);
    pos.setXYZ(i, point.x * s[0] ** 2 / d, point.y * s[1] ** 2 / d, point.z * s[2] ** 2 / d);
  }
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const welded = mergeVertices(geo, 1e-6);
  geo.dispose();
  return welded.translate(...p);
}

function corpo() {
  return soldar([
    oval([0, 0.032, 0.039], [0.107, 0.097, 0.148]),
    oval([0, 0.04, -0.118], [0.086, 0.077, 0.086], 4),
    oval([0, 0.041, -0.192], [0.046, 0.040, 0.043], 4),
    ...[-1, 1].flatMap((side) => [
      orelha(side),
      oval([0, 0, 0], [0.024, 0.022, 0.041])
        .rotateY(side * 0.35).translate(side * 0.059, 0.024, 0.167),
    ]),
  ]);
}

function orelha(side: number) {
  const g = oval([0, 0, 0], [0.043, 0.039, 0.068], 6);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const taper = 0.88 + (z / 0.068) * 0.27;
    p.setXYZ(i, p.getX(i) * taper, p.getY(i) * taper, z);
  }
  return g.rotateY(-0.26 * side).rotateX(0.23).translate(0.057 * side, 0.053, -0.190);
}

export class Morcegos {
  readonly root = new Group();
  private readonly body = new InstancedMesh(corpo(), new MeshStandardMaterial({
    color: '#1d1519', roughness: 0.60, emissive: '#170b0e', emissiveIntensity: 0.23,
  }), NUMERO_DE_MORCEGOS);
  private readonly wings = [-1, 1].map((side) => new InstancedMesh(asa(side), new MeshStandardMaterial({
    color: '#1a1217', roughness: 0.58, side: DoubleSide, vertexColors: true,
    emissive: '#170a12', emissiveIntensity: 0.21,
  }), NUMERO_DE_MORCEGOS));
  private readonly parts = [this.body, ...this.wings];
  private readonly transform = new Object3D();
  private readonly wing = new Matrix4();
  private readonly view = new Matrix4();
  private readonly frustum = new Frustum();
  private readonly bounds = new Sphere();
  private readonly radius: number;
  private readonly colors: Color[];

  constructor() {
    this.root.name = 'revoada';
    this.body.name = 'morcegos-corpos';
    this.wings[0].name = 'morcegos-asas-esquerdas';
    this.wings[1].name = 'morcegos-asas-direitas';
    this.root.add(...this.parts);
    this.radius = Math.max(...this.parts.map((mesh) => {
      mesh.geometry.computeBoundingSphere();
      const { center, radius } = mesh.geometry.boundingSphere!;
      return center.length() + radius + OMBRO_DA_ASA; // Includes the full swing of both wings around the shoulder.
    }));
    for (const mesh of this.parts) {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.setColorAt(0, new Color(1, 1, 1));
      mesh.instanceColor!.setUsage(DynamicDrawUsage);
    }
    this.colors = Array.from({ length: NUMERO_DE_MORCEGOS }, (_, i) => new Color().setScalar(0.77 + 0.31 * Math.sin(i * 11.98) ** 2));
    this.hide();
  }

  prepare(camera: Camera) {
    this.update((PAR.cobre + PAR.descobre) / 2, camera);
    this.parts.forEach((mesh) => { mesh.count = 1; });
  }

  update(t: number, camera: Camera) {
    const morcegos = revoadaAt(t, camera.position.toArray());
    if (!morcegos.length) { this.hide(); return; }
    camera.updateWorldMatrix(true, false);
    this.frustum.setFromProjectionMatrix(this.view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let visible = 0;
    for (const [i, { p, orientacao, batida, escala }] of morcegos.entries()) {
      this.bounds.set(p, this.radius * escala);
      if (!this.frustum.intersectsSphere(this.bounds)) continue;
      const { transform, wing } = this;
      transform.position.copy(p);
      transform.quaternion.copy(orientacao);
      transform.scale.setScalar(escala);
      transform.updateMatrix();
      this.body.setMatrixAt(visible, transform.matrix);
      this.wings[0].setMatrixAt(visible, wing.makeRotationZ(-batida).setPosition(-OMBRO_DA_ASA, 0, 0).premultiply(transform.matrix));
      this.wings[1].setMatrixAt(visible, wing.makeRotationZ(batida).setPosition(OMBRO_DA_ASA, 0, 0).premultiply(transform.matrix));
      this.parts.forEach((mesh) => mesh.setColorAt(visible, this.colors[i]));
      visible++;
    }
    this.root.visible = visible > 0;
    for (const mesh of this.parts) {
      mesh.count = visible;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    }
  }

  hide() { this.root.visible = false; }
}
