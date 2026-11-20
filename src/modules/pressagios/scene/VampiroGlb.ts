import { AnimationAction, AnimationClip, AnimationMixer, Group, LoopOnce, Mesh, MathUtils, Quaternion, Vector3, type BufferGeometry, type Material, type Object3D, type Texture } from 'three';
import type { Vec3 } from '../../../shared/math.ts';
import { PAR } from '../domain/vampiroMotion.ts';
import { dobrarBraco, pesoDoBote } from '../domain/ikDoBraco.ts';

// The pair's vampire as a GLB (public/modelos/vampiro.glb, rigged in Blender). Clip time = omen clock: `t` ms of the pair
// is `t / 1000` s of the clip named `par`. The procedural `Vampiro` stays as the fallback.

// Fixed anchor: the clip holds ALL the motion (rise, lunge, exit), so the root never moves and the hands stay on the
// table edge. Do not retune: the hands, the die and the wall were placed in Blender from these values.
export const ESCALA_DO_GLB = 7.5;
export const ANCORA_DO_GLB: Vec3 = [0, -8.67, -6.037];

// The lunge reaches for the real die. The clip stays in charge; an IK correction (rotation only, bone lengths never
// change) is blended over it by `pesoDoBote`. The GLTFLoader strips the dots from bone names: braco.L -> bracoL.
export type AlvosDoBote = { dado: Vec3 | null; dados: Vec3[] };
const PUNHO_NO_DADO = new Vector3(0, 0.62, -0.55); // wrist relative to the die, the clip's own relation
const DESVIO_DA_MAO_DIREITA = 1.3, X_LIVRE: [number, number] = [-5.5, -2.0], MAX_OLHAR = MathUtils.degToRad(40);
const Y = new Vector3(0, 1, 0), BAIXO = new Vector3(0, -1, 0);

type Lado = { braco: Object3D; antebraco: Object3D; mao: Object3D; hBraco: Vector3; hAnte: Vector3; palma: Vector3; polo: Vector3 };

export class VampiroGlb {
  readonly root = new Group();
  private mixer: AnimationMixer | null = null;
  private action: AnimationAction | null = null;
  private esq: Lado | null = null;
  private dir: Lado | null = null;
  private cabeca: Object3D | null = null;
  private frente = new Vector3(0, 0, 1);
  constructor() { this.root.name = 'vampiro-glb'; this.root.visible = false; }

  get pronto() { return this.mixer !== null; }

  anexar(objeto: Object3D) {
    objeto.traverse((o) => { o.frustumCulled = false; }); // the skin moves far from its bind-pose bounds
    this.root.add(objeto);
    this.mixer = new AnimationMixer(objeto);
    this.montarOssos(objeto);
    const clip = AnimationClip.findByName(objeto.animations, 'par');
    if (clip) {
      const action = this.action = this.mixer.clipAction(clip);
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
    }
  }

  update(t: number, alvos?: AlvosDoBote) {
    // LoopOnce + clamp pauses the action at the end; wake it so the next round plays again
    if (this.action) { this.action.paused = false; this.action.enabled = true; }
    this.mixer?.setTime(Math.min(t, PAR.duration) / 1000);
    this.root.visible = t > 0 && t < PAR.duration;
    if (!this.root.visible) return;
    this.root.position.set(...ANCORA_DO_GLB);
    this.root.scale.setScalar(ESCALA_DO_GLB);
    if (alvos) this.corrigirBote(t, alvos);
  }

  // The landing point nearest to the left shoulder, the die the left hand goes for.
  maisPertoDoOmbro(pontos: Vec3[]): Vec3 | null {
    const ombro = this.esq?.braco.getWorldPosition(new Vector3());
    if (!ombro || !pontos.length) return null;
    return pontos.reduce((a, b) => (ombro.distanceToSquared(new Vector3(...b)) < ombro.distanceToSquared(new Vector3(...a)) ? b : a));
  }

  // Rest data in bone-local axes: the elbow hinge (world -Y on the left arm, +Y on the right, palm down in the T-pose),
  // the palm normal and the face direction. Without these bones the correction is skipped.
  private montarOssos(objeto: Object3D) {
    objeto.updateMatrixWorld(true);
    const osso = (n: string) => objeto.getObjectByName(n) ?? null;
    const local = (o: Object3D, v: Vector3) => v.clone().applyQuaternion(o.getWorldQuaternion(new Quaternion()).invert());
    const lado = (c: 'L' | 'R'): Lado | null => {
      const braco = osso('braco' + c), antebraco = osso('antebraco' + c), mao = osso('mao' + c);
      if (!braco || !antebraco || !mao) return null;
      const h = new Vector3(0, c === 'L' ? -1 : 1, 0);
      return { braco, antebraco, mao, hBraco: local(braco, h), hAnte: local(antebraco, h), palma: local(mao, BAIXO), polo: new Vector3(c === 'L' ? 1 : -1, 0.75, 0) };
    };
    this.esq = lado('L');
    this.dir = lado('R');
    this.cabeca = osso('cabeca');
    if (this.cabeca) this.frente = local(this.cabeca, new Vector3(0, 0, 1));
  }

  // Points `osso` along `dir` (minimal swing from the clip pose), rolls it until `hinge` (bone-local) matches `alvo` in
  // world, and blends with the clip rotation by `peso`. Only `quaternion` is written.
  private apontar(osso: Object3D, dir: Vector3, hinge: Vector3, alvo: Vector3, peso: number) {
    const clip = osso.quaternion.clone();
    const pai = osso.parent!.getWorldQuaternion(new Quaternion());
    const mundo = pai.clone().multiply(clip);
    const d = dir.clone().normalize();
    let q = new Quaternion().setFromUnitVectors(Y.clone().applyQuaternion(mundo), d).multiply(mundo);
    const plano = (v: Vector3) => v.clone().addScaledVector(d, -v.dot(d));
    const h = plano(hinge.clone().applyQuaternion(q)), a = plano(alvo);
    if (h.lengthSq() > 1e-9 && a.lengthSq() > 1e-9) q = new Quaternion().setFromAxisAngle(d, Math.atan2(d.dot(h.clone().cross(a)), h.dot(a))).multiply(q);
    osso.quaternion.copy(clip.slerp(pai.invert().multiply(q), peso));
    osso.updateMatrixWorld(true);
  }

  private braco(l: Lado, punho: Vector3, peso: number) {
    const S = l.braco.getWorldPosition(new Vector3()), E0 = l.antebraco.getWorldPosition(new Vector3()), W0 = l.mao.getWorldPosition(new Vector3());
    const ik = dobrarBraco(S.toArray(), punho.toArray(), S.distanceTo(E0), E0.distanceTo(W0), S.clone().add(l.polo).toArray());
    const E = new Vector3(...ik.cotovelo), P = new Vector3(...ik.punho);
    const n = E.clone().sub(S).cross(P.clone().sub(E)).normalize(); // bend-plane normal = the anatomical hinge
    this.apontar(l.braco, E.clone().sub(S), l.hBraco, n, peso);
    this.apontar(l.antebraco, P.clone().sub(l.antebraco.getWorldPosition(new Vector3())), l.hAnte, n, peso);
    return P;
  }

  private corrigirBote(t: number, { dado, dados }: AlvosDoBote) {
    const peso = pesoDoBote(t), pesoDir = pesoDoBote(t + 100);
    if (peso <= 0 && pesoDir <= 0) return;
    this.root.updateMatrixWorld(true);
    if (this.esq && dado && peso > 0) {
      const alvo = new Vector3(...dado), punho = this.braco(this.esq, alvo.clone().add(PUNHO_NO_DADO), peso);
      this.apontar(this.esq.mao, alvo.clone().sub(punho), this.esq.palma, BAIXO, peso);
      this.olhar(alvo, peso);
    }
    if (this.dir && pesoDir > 0) {
      const mao = this.dir.mao.getWorldPosition(new Vector3()), perto = (x: number) => Math.min(...dados.map((d) => Math.hypot(d[0] - x, d[2] - mao.z)), Infinity);
      if (perto(mao.x) < DESVIO_DA_MAO_DIREITA) {
        let melhor = mao.x, folga = -1;
        for (let x = X_LIVRE[0]; x <= X_LIVRE[1] + 1e-9; x += 0.05) {
          const livre = perto(x) >= DESVIO_DA_MAO_DIREITA, f = livre ? 1e3 - Math.abs(x - mao.x) : perto(x);
          if (f > folga) { folga = f; melhor = x; }
        }
        const dirDaMao = Y.clone().applyQuaternion(this.dir.mao.getWorldQuaternion(new Quaternion())); // the clip's hand direction
        this.braco(this.dir, new Vector3(melhor, mao.y, mao.z), pesoDir);
        this.apontar(this.dir.mao, dirDaMao, this.dir.palma, BAIXO, pesoDir);
      }
    }
  }

  // The head follows the die inside the window, at most 40° off the clip's own look.
  private olhar(alvo: Vector3, peso: number) {
    const c = this.cabeca;
    if (!c) return;
    const pai = c.parent!.getWorldQuaternion(new Quaternion()), mundo = pai.clone().multiply(c.quaternion);
    const q = new Quaternion().setFromUnitVectors(this.frente.clone().applyQuaternion(mundo), alvo.clone().sub(c.getWorldPosition(new Vector3())).normalize());
    const angulo = 2 * Math.acos(Math.min(1, q.w));
    if (angulo > MAX_OLHAR) q.slerp(new Quaternion(), 1 - MAX_OLHAR / angulo);
    q.slerp(new Quaternion(), 1 - peso); // identity when the weight is 0
    c.quaternion.copy(pai.invert().multiply(q.multiply(mundo)));
    c.updateMatrixWorld(true);
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
