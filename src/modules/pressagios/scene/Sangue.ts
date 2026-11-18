import { Color, DynamicDrawUsage, Group, InstancedMesh, MeshPhysicalMaterial, Object3D } from 'three';
import { TRAY } from '../../arremesso/index.ts';
import { parAt } from '../domain/vampiroMotion.ts';
import { elipsoide, soldar } from './malhaLisa.ts';

const FILETES_POR_FACE = 18;
const filetes = [-1, 1].flatMap((side) => [0, 1].flatMap((face) =>
  Array.from({ length: FILETES_POR_FACE }, (_, i) => {
    const seed = (i + 1) * 2.399963 + side * 7 + face * 11;
    return {
      x: side * (TRAY.halfWidth + face * TRAY.wallThickness + (face ? 0.024 : -0.024)),
      z: (i / (FILETES_POR_FACE - 1) * 2 - 1) * (TRAY.halfDepth - 0.18) + Math.sin(seed) * 0.12,
      largura: 0.034 + 0.095 * Math.cos(seed * 1.43) ** 4,
      atraso: 0.26 * Math.sin(seed * 0.61) ** 2,
      comprimento: 0.44 + 1.00 * Math.cos(seed) ** 2,
    };
  }),
));

const material = () => new MeshPhysicalMaterial({
  color: '#ad102c', emissive: '#630716', emissiveIntensity: 0.42,
  roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.22,
});

export class Sangue {
  readonly root = new Group();
  private readonly fio = new InstancedMesh(soldar([elipsoide([0, 0, 0], [1, 1, 1])]), material(), filetes.length);
  private readonly gota = new InstancedMesh(soldar([elipsoide([0, 0, 0], [1, 1.4, 1])]), material(), filetes.length);
  private readonly pose = new Object3D();

  constructor() {
    this.root.name = 'sangue';
    this.fio.name = 'sangue-filetes';
    this.gota.name = 'sangue-gotas';
    this.root.add(this.fio, this.gota);
    for (const mesh of [this.fio, this.gota]) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
    }
    const tom = new Color();
    for (let i = 0; i < filetes.length; i++) {
      tom.setScalar(0.46 + 0.54 * Math.sin(i * 7.13) ** 2);
      this.fio.setColorAt(i, tom);
      this.gota.setColorAt(i, tom);
    }
    this.hide();
  }

  update(t: number) {
    const { sangue } = parAt(t);
    this.root.visible = sangue > 0;
    if (!this.root.visible) return;
    const topo = TRAY.wallHeight + 0.035;
    for (const [i, { x, z, largura, atraso, comprimento }] of filetes.entries()) {
      const u = Math.max(0, (sangue - atraso) / (1 - atraso));
      const length = comprimento * u;
      const width = largura * Math.min(1, u * 5);
      this.pose.position.set(x, topo - length * 0.5, z);
      this.pose.scale.set(width * 0.78, length * 0.5, width);
      this.pose.updateMatrix();
      this.fio.setMatrixAt(i, this.pose.matrix);
      this.pose.position.y = topo - length * 0.92;
      this.pose.scale.set(width, width * 1.12, width * 1.15);
      this.pose.updateMatrix();
      this.gota.setMatrixAt(i, this.pose.matrix);
    }
    this.fio.instanceMatrix.needsUpdate = this.gota.instanceMatrix.needsUpdate = true;
  }

  hide() { this.root.visible = false; }
}
