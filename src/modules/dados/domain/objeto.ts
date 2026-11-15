import { Mesh, type Object3D } from 'three';

// The die as AparenciaDoDado draws it in the scene (`die-i` holding `gem-i`): whoever has the scene asks here,
// so the names live only in `dados`. Pure, no React: `raiz` is where to look (the dice group or the scene).

export const dadoNaRaiz = (raiz: Object3D, index: number): Object3D | undefined => raiz.getObjectByName(`die-${index}`);

export const gemaNaRaiz = (raiz: Object3D, index: number): Object3D | undefined => raiz.getObjectByName(`gem-${index}`);

// Every material under the die, its child meshes included (the engraving's glow).
export function definirOpacidade(raiz: Object3D, index: number, opacity: number): void {
  dadoNaRaiz(raiz, index)?.traverse((object) => {
    if (object instanceof Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.opacity = opacity;
  });
}

// An imported die's gem is a group (a GLB has many meshes), so the shadow switch goes on its meshes.
// On a gem already found (gemaNaRaiz), for whoever switches it every frame.
export function sombraNaGema(gema: Object3D | undefined, on: boolean): void {
  gema?.traverse((o) => { if (o instanceof Mesh) o.castShadow = on; });
}

export function definirSombra(raiz: Object3D, index: number, on: boolean): void {
  sombraNaGema(gemaNaRaiz(raiz, index), on);
}
