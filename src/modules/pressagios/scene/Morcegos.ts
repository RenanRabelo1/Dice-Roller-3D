import {
  Color, DoubleSide, DynamicDrawUsage, Frustum, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, Sphere, SplineCurve, Vector2,
  type Camera,
} from 'three';
import { NUMERO_DE_MORCEGOS, PAR, revoadaAt, RUMO_DA_REVOADA } from '../domain/vampiroMotion.ts';
import { elipsoide, soldar, superficie } from './malhaLisa.ts';

function asa(side: number) {
  // Leading edge runs from shoulder to the longest finger. The alternating tips
  // and scallops on the other edge are part of the mesh silhouette.
  const bordo = new SplineCurve([
    [-0.22, 0.49], [-0.25, 0.58], [-0.28, 0.26], [-0.31, 0.35], [-0.34, 0.10],
    [-0.36, 0.20], [-0.41, -0.02], [-0.47, 0.08], [-0.54, -0.24], [-0.61, -0.32], [-0.70, -0.70],
  ].map(([a, b]) => new Vector2(a, b)));
  return soldar([superficie(38, 7, (u, v) => {
    const { x: frente, y: tras } = bordo.getPoint(u);
    const z = (frente + (tras - frente) * v) * 1.58;
    const x = 0.08 + 1.13 * u;
    const y = 0.056 * x ** 2 - 0.052 * z ** 2 + 0.05 * x * z;
    return [side * x, y, z];
  })]);
}

function corpo() {
  return soldar([
    elipsoide([0, 0.029, 0.08], [0.213, 0.232, 0.41], 0, 32, 24),
    elipsoide([0, 0.06, -0.25], [0.150, 0.14, 0.22], 0, 28, 22),
    ...[-1, 1].map(orelha),
  ]);
}

function orelha(side: number) {
  const g = elipsoide([0, 0, 0], [0.082, 0.096, 0.16], 0, 44, 32);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const taper = 0.87 + (z / 0.16) * 0.24;
    p.setXYZ(i, p.getX(i) * taper, p.getY(i) * taper, z);
  }
  return g.rotateY(-0.41 * side).translate(0.102 * side, 0.06, -0.41);
}

export class Morcegos {
  readonly root = new Group();
  private readonly body = new InstancedMesh(corpo(), new MeshStandardMaterial({
    color: '#29222e', roughness: 0.73, emissive: '#292233', emissiveIntensity: 0.27,
  }), NUMERO_DE_MORCEGOS);
  private readonly wings = [-1, 1].map((side) => new InstancedMesh(asa(side), new MeshStandardMaterial({
    color: '#251b2b', roughness: 0.64, side: DoubleSide, emissive: '#222033', emissiveIntensity: 0.26,
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
      return center.length() + radius; // Includes the full swing of both wings around the shoulder.
    }));
    for (const mesh of this.parts) {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.setColorAt(0, new Color(1, 1, 1));
      mesh.instanceColor!.setUsage(DynamicDrawUsage);
    }
    this.colors = Array.from({ length: NUMERO_DE_MORCEGOS }, (_, i) => new Color().setScalar(0.48 + 0.62 * Math.sin(i * 11.98) ** 2));
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
    for (const [i, { p, rumo, fase, escala }] of morcegos.entries()) {
      this.bounds.set(p, this.radius * escala);
      if (!this.frustum.intersectsSphere(this.bounds)) continue;
      const { transform, wing } = this;
      transform.position.copy(p);
      transform.quaternion.copy(RUMO_DA_REVOADA);
      transform.rotateY(rumo);
      transform.rotateX(0.11 * Math.cos(fase));
      transform.scale.setScalar(escala);
      transform.updateMatrix();
      this.body.setMatrixAt(visible, transform.matrix);
      const batida = 0.20 + 0.42 * Math.sin(fase);
      this.wings[0].setMatrixAt(visible, wing.makeRotationZ(-batida).premultiply(transform.matrix));
      this.wings[1].setMatrixAt(visible, wing.makeRotationZ(batida).premultiply(transform.matrix));
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
