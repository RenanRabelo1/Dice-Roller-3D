import { Color, DynamicDrawUsage, Group, InstancedMesh, MathUtils, MeshPhysicalMaterial, Object3D } from 'three';
import { TRAY } from '../../arremesso/index.ts';
import { PAR, parAt } from '../domain/vampiroMotion.ts';
import { elipsoide, soldar, superficie } from './malhaLisa.ts';

const FILETES_POR_LATERAL = 20;
export const LARGURA_LABIO = 0.186, ALTURA_POCA = 0.012;
const RECUO = 0.0065, MEIA_ESPESSURA = 0.0034;
const filetes = [-1, 1].flatMap((side) => Array.from({ length: FILETES_POR_LATERAL }, (_, i) => {
  const seed = (i + 1) * 2.399963 + side * 7;
  const encontro = i % 5 === 1 ? 0.132 : i % 5 === 2 ? -0.131 : 0;
  return {
    side,
    z: (i / (FILETES_POR_LATERAL - 1) * 2 - 1) * (TRAY.halfDepth - 0.19) + Math.sin(seed) * 0.041 + encontro,
    largura: 0.12 + 0.16 * (1 - Math.sin(seed * 1.43) ** 8),
    atraso: 0.11 * Math.sin(seed * 0.61) ** 2,
    velocidade: 0.97 + 1.10 * Math.cos(seed) ** 2,
  };
}));

const raioDaHaste = (s: number) => 0.50 - 0.18 * MathUtils.smootherstep(s, 0, 0.88)
  + 0.085 * MathUtils.smootherstep(s, 0.76, 1);
const RAIO_GOTA = raioDaHaste(1);

export function raioDoFilete(progresso: number) {
  if (progresso < 0 || progresso >= 1) return 0;
  if (progresso <= 0.88) return raioDaHaste(progresso / 0.88);
  return RAIO_GOTA * Math.sqrt(1 - ((progresso - 0.88) / 0.12) ** 2);
}

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

function materialDoLabioEDasPocas() {
  const surface = material();
  // The instance tint identifies floor pools; their reflections stay blood-red
  // at grazing angles while the lip retains the ordinary wet clearcoat.
  surface.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      #if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)
        if (vColor.r < 0.75) {
          vec3 reflections = totalSpecular;
          #ifdef USE_CLEARCOAT
            reflections += (clearcoatSpecularDirect + clearcoatSpecularIndirect) * material.clearcoat;
          #endif
          outgoingLight = totalDiffuse + totalEmissiveRadiance + reflections * vec3(0.35, 0.045, 0.055);
        }
      #endif
      #include <opaque_fragment>
    `);
  };
  surface.customProgramCacheKey = () => 'pressagios-pocas-vermelhas';
  return surface;
}

function fioComGota() {
  // Full at the rim, thin down the wall and slightly swollen at the wet tip.
  // Samples follow a continuous profile, with a rounded terminal pole.
  return soldar([superficie(32, 64, (u, v) => {
    const a = u * 2 * Math.PI, row = v * 64;
    let r: number, y: number;
    if (row <= 44) {
      y = 1.76 * row / 44;
      r = raioDaHaste(row / 44);
    } else {
      const cap = (row - 44) / 20 * Math.PI / 2;
      y = 1.76 + 0.24 * Math.sin(cap);
      r = RAIO_GOTA * Math.cos(cap);
    }
    return [r * Math.sin(a), -y, r * Math.cos(a)];
  })]);
}

export class Sangue {
  readonly root = new Group();
  private readonly fio = new InstancedMesh(fioComGota(), material(), filetes.length);
  private readonly superficies = new InstancedMesh(soldar([elipsoide([0, 0, 0], [1, 1, 1])]), materialDoLabioEDasPocas(), filetes.length + 2);
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
    const sangue = new Color().setScalar(1), poco = new Color().setScalar(0.48);
    for (let i = 0; i < this.superficies.count; i++) this.superficies.setColorAt(i, i < 2 ? sangue : poco);
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

      this.pose.position.set(x - Math.sign(x) * (0.10 * poca), 0.001, z + 0.024);
      this.pose.scale.set(0.26 * poca, (ALTURA_POCA / 2) * poca, largura * 1.20 * poca);
      this.pose.updateMatrix();
      this.superficies.setMatrixAt(i + 2, this.pose.matrix);
    }
    for (const [i, side] of [-1, 1].entries()) {
      // The narrow inside lip overlaps the roots of all the streams.
      this.pose.position.set(side * (w + 0.038 * labio), top + 0.003, 0);
      this.pose.scale.set((LARGURA_LABIO / 2) * labio, 0.006 * labio, d + 0.02);
      this.pose.updateMatrix();
      this.superficies.setMatrixAt(i, this.pose.matrix);
    }
    this.fio.instanceMatrix.needsUpdate = this.superficies.instanceMatrix.needsUpdate = true;
  }

  hide() { this.root.visible = false; }
}
