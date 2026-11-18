import { DynamicDrawUsage, Group, InstancedMesh, MathUtils, MeshPhysicalMaterial, Object3D } from 'three';
import { TRAY } from '../../arremesso/index.ts';
import { PAR, parAt } from '../domain/vampiroMotion.ts';
import { elipsoide, soldar, superficie } from './malhaLisa.ts';

const FILETES_POR_LATERAL = 17;
const RECUO = 0.0065, MEIA_ESPESSURA = 0.0034;
const filetes = [-1, 1].flatMap((side) => Array.from({ length: FILETES_POR_LATERAL }, (_, i) => {
  const seed = (i + 1) * 2.399963 + side * 7;
  return {
    side,
    z: (i / (FILETES_POR_LATERAL - 1) * 2 - 1) * (TRAY.halfDepth - 0.19) + Math.sin(seed) * 0.13,
    largura: 0.06 + 0.08 * Math.cos(seed * 1.43) ** 2,
    atraso: 0.27 * Math.sin(seed * 0.61) ** 2,
    velocidade: 0.67 + 0.92 * Math.cos(seed) ** 2,
  };
}));

export function escoamentoAt(t: number) {
  const cresce = parAt(Math.min(t, PAR.sai)).sangue;
  const seca = t > PAR.sai ? parAt(t).sangue : 1;
  return {
    labio: MathUtils.smoothstep(cresce, 0, 0.22) * seca,
    filetes: filetes.map(({ side, z, largura, atraso, velocidade }) => {
      const caminho = Math.max(0, (cresce - atraso) * velocidade) * TRAY.wallHeight;
      return {
        x: side * (TRAY.halfWidth - RECUO), z, largura,
        comprimento: Math.min(caminho, TRAY.wallHeight) * seca,
        poca: MathUtils.smoothstep(caminho, TRAY.wallHeight, TRAY.wallHeight + 0.30) * seca ** 2,
      };
    }),
  };
}

const material = () => new MeshPhysicalMaterial({
  color: '#7e000c', emissive: '#350005', emissiveIntensity: 0.11, envMapIntensity: 0.39, specularIntensity: 0.50,
  roughness: 0.24, clearcoat: 0.9, clearcoatRoughness: 0.25,
});

function fioComGota() {
  // Full at the rim, thin down the wall and slightly swollen at the wet tip.
  // Samples follow a continuous profile, with a rounded terminal pole.
  return soldar([superficie(32, 64, (u, v) => {
    const a = u * 2 * Math.PI, row = v * 64;
    let r: number, y: number;
    if (row <= 44) {
      y = 1.76 * row / 44;
      const s = y / 1.76;
      r = 0.50 - 0.31 * MathUtils.smootherstep(s, 0, 0.90)
        + 0.09 * MathUtils.smootherstep(s, 0.76, 1);
    } else {
      const cap = (row - 44) / 20 * Math.PI / 2;
      y = 1.76 + 0.24 * Math.sin(cap);
      r = 0.28 * Math.cos(cap);
    }
    return [r * Math.sin(a), -y, r * Math.cos(a)];
  })]);
}

export class Sangue {
  readonly root = new Group();
  private readonly fio = new InstancedMesh(fioComGota(), material(), filetes.length);
  private readonly superficies = new InstancedMesh(soldar([elipsoide([0, 0, 0], [1, 1, 1])]), material(), filetes.length + 2);
  private readonly pose = new Object3D();

  constructor() {
    this.root.name = 'sangue';
    this.fio.name = 'sangue-filetes';
    this.superficies.name = 'sangue-labios-e-pocas';
    this.root.add(this.fio, this.superficies);
    for (const mesh of [this.fio, this.superficies]) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
    }
    this.hide();
  }

  update(t: number) {
    const { labio, filetes } = escoamentoAt(t);
    this.root.visible = labio > 0;
    if (!this.root.visible) return;
    const { wallHeight: top, halfWidth: w, halfDepth: d } = TRAY;
    for (const [i, { x, z, largura, comprimento, poca }] of filetes.entries()) {
      const ativo = comprimento > 0 ? 1 : 0;
      this.pose.position.set(x, top + 0.006, z);
      this.pose.scale.set(2 * MEIA_ESPESSURA * ativo, (comprimento + ativo * 0.006) / 2, largura * ativo);
      this.pose.updateMatrix();
      this.fio.setMatrixAt(i, this.pose.matrix);

      this.pose.position.set(x - Math.sign(x) * (0.10 * poca), 0.003, z + 0.024);
      this.pose.scale.set(0.23 * poca, 0.013 * poca, largura * 1.85 * poca);
      this.pose.updateMatrix();
      this.superficies.setMatrixAt(i + 2, this.pose.matrix);
    }
    for (const [i, side] of [-1, 1].entries()) {
      // The narrow inside lip overlaps the roots of all the streams.
      this.pose.position.set(side * (w + 0.008 * labio), top + 0.003, 0);
      this.pose.scale.set(0.103 * labio, 0.006 * labio, d + 0.02);
      this.pose.updateMatrix();
      this.superficies.setMatrixAt(i, this.pose.matrix);
    }
    this.fio.instanceMatrix.needsUpdate = this.superficies.instanceMatrix.needsUpdate = true;
  }

  hide() { this.root.visible = false; }
}
