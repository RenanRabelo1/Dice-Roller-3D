import { AnimationClip, AnimationMixer, Group, LoopOnce, Mesh, type BufferGeometry, type Material, type Object3D, type Texture } from 'three';
import type { Vec3 } from '../../../shared/math.ts';
import { PAR } from '../domain/vampiroMotion.ts';

// The pair's vampire as a GLB (public/modelos/vampiro.glb, rigged in Blender). Clip time = omen clock: `t` ms of the pair
// is `t / 1000` s of the clip named `par`. The procedural `Vampiro` stays as the fallback.

// Fixed anchor: the clip holds ALL the motion (rise, lunge, exit), so the root never moves and the hands stay on the
// table edge. Do not retune: the hands, the die and the wall were placed in Blender from these values.
export const ESCALA_DO_GLB = 7.5;
export const ANCORA_DO_GLB: Vec3 = [0, -8.67, -6.037];

export class VampiroGlb {
  readonly root = new Group();
  private mixer: AnimationMixer | null = null;
  constructor() { this.root.name = 'vampiro-glb'; this.root.visible = false; }

  get pronto() { return this.mixer !== null; }

  anexar(objeto: Object3D) {
    objeto.traverse((o) => { o.frustumCulled = false; }); // the skin moves far from its bind-pose bounds
    this.root.add(objeto);
    this.mixer = new AnimationMixer(objeto);
    const clip = AnimationClip.findByName(objeto.animations, 'par');
    if (clip) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
    }
  }

  update(t: number) {
    this.mixer?.setTime(Math.min(t, PAR.duration) / 1000);
    this.root.visible = t > 0 && t < PAR.duration;
    if (!this.root.visible) return;
    this.root.position.set(...ANCORA_DO_GLB);
    this.root.scale.setScalar(ESCALA_DO_GLB);
  }

  hide() { this.root.visible = false; }

  assets() {
    const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
    this.root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      geometries.add(o.geometry);
      for (const m of ([] as Material[]).concat(o.material)) {
        materials.add(m);
        for (const v of Object.values(m)) if (v && (v as Texture).isTexture) textures.add(v as Texture);
      }
    });
    return { geometries, materials, textures };
  }

  dispose() {
    const { geometries, materials, textures } = this.assets();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((x) => x.dispose());
  }
}
