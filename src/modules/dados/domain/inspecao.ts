import { Matrix4, Mesh, Vector3, type Material, type Object3D } from 'three';
import type { AparenciaDaGema, RotuloNaCena } from '../contracts.ts';

// The test inspection of a die as AparenciaDoDado draws it (`die-i` holding `gem-i` and the numerals object).
// Pure, no React: `raiz` is where to look (the dice group or the scene).

const numbersOf = (raiz: Object3D, index: number) => raiz.getObjectByName(`die-${index}`)?.children.find((o) => o.userData.labels);

export function rotulos(raiz: Object3D, index: number): RotuloNaCena[] {
  const result: RotuloNaCena[] = [];
  const batch = numbersOf(raiz, index);
  if (!batch) return result;
  batch.updateWorldMatrix(true, false);
  // BatchedText members are not scene children: world matrix = batch matrix × member matrix.
  for (const label of batch.userData.labels as Object3D[]) {
    label.updateMatrix();
    const world = new Matrix4().multiplyMatrices(batch.matrixWorld, label.matrix);
    result.push({
      text: label.userData.text, value: label.userData.value,
      position: new Vector3().setFromMatrixPosition(world).toArray(),
      normal: new Vector3(0, 0, 1).transformDirection(world).toArray(),
    });
  }
  return result;
}

export const numeraisVisiveis = (raiz: Object3D, index: number): boolean => numbersOf(raiz, index)?.visible ?? false;

export function aparenciaDaGema(raiz: Object3D, index: number): AparenciaDaGema[] {
  const out: AparenciaDaGema[] = [];
  raiz.getObjectByName(`gem-${index}`)?.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const m = (Array.isArray(o.material) ? o.material[0] : o.material) as Material & { vertexColors?: boolean };
    const mask = o.geometry.userData.ink as Uint8Array | undefined, color = o.geometry.getAttribute('color');
    const t = mask ? mask.indexOf(1) : -1;
    out.push({ shown: o.visible, material: m.type, opaque: !m.transparent || m.opacity === 1, painted: !!m.vertexColors, ink: color && t >= 0 ? [color.getX(t * 3), color.getY(t * 3), color.getZ(t * 3)] : null });
  });
  return out;
}
