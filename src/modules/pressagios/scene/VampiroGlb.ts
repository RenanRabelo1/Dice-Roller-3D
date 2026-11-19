import { AnimationClip, AnimationMixer, Group, LoopOnce, Mesh, type BufferGeometry, type Material, type Object3D, type Texture } from 'three';
import type { Vec3 } from '../../../shared/math.ts';
import { PAR, vampiroAt } from '../domain/vampiroMotion.ts';

// The pair's vampire as a GLB (public/modelos/vampiro.glb, rigged in Blender). The code decides where (the root
// follows `vampiroAt('par-de-criticos', t).corpo.p`) and the clip decides how: clip time = omen clock, `t` ms of the
// pair is `t / 1000` s of the clip named `par`. The procedural `Vampiro` stays as the fallback.

// Calibration, the one place to tune. The model is 1.8 tall with its feet at y = 0; the scale brings it to the
// size of the procedural pair figure, and the offset is added to `corpo.p`.
export const ESCALA_DO_GLB = 8.568 / 1.8; // initial: height of the procedural pair figure (8.568 world units, measured with a Box3) / 1.8
export const DESLOCAMENTO_DO_GLB: Vec3 = [0, -3.5, 0];

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
    const { corpo } = vampiroAt('par-de-criticos', t);
    this.mixer?.setTime(Math.min(t, PAR.duration) / 1000);
    this.root.visible = corpo.visivel;
    if (!corpo.visivel) return;
    this.root.position.set(corpo.p[0] + DESLOCAMENTO_DO_GLB[0], corpo.p[1] + DESLOCAMENTO_DO_GLB[1], corpo.p[2] + DESLOCAMENTO_DO_GLB[2]);
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
