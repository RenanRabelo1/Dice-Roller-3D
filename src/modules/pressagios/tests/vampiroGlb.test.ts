import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimationClip, BoxGeometry, Group, Mesh, Object3D, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3, VectorKeyframeTrack, type WebGLRenderer } from 'three';
import { arremesso, input, publish } from '../../arremesso/index.ts';
import { definir } from '../../selecao/index.ts';
import { definirMovimentoReduzido } from '../../../shared/plataforma/index.ts';
import type { Vec3 } from '../../../shared/math.ts';
import { presagio, reiniciarPresagio } from '../index.ts';
import { PAR } from '../domain/vampiroMotion.ts';
import { Show } from '../scene/PresagiosNaCena.tsx';
import { ANCORA_DO_GLB, ESCALA_DO_GLB, VampiroGlb } from '../scene/VampiroGlb.ts';

// A fake model: a group with a child that the `par` clip moves 1 unit in x over the omen's 5.6 s.
function falso() {
  const objeto = new Group(), filho = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  filho.name = 'filho';
  objeto.add(filho);
  objeto.animations = [new AnimationClip('par', 5.6, [new VectorKeyframeTrack('filho.position', [0, 5.6], [0, 0, 0, 1, 0, 0])])];
  return { objeto, filho };
}
const camera = new PerspectiveCamera(40, 1.6);
camera.position.set(0, 14, 10);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
const alvo = () => new Vector3(0, 0.7, 0);

afterEach(() => {
  vi.unstubAllGlobals();
  definirMovimentoReduzido(false);
  reiniciarPresagio();
});

describe('VampiroGlb', () => {
  it('is visible only for 0 < t < duration', () => {
    const glb = new VampiroGlb();
    glb.anexar(falso().objeto);
    glb.update(0);
    expect(glb.root.visible).toBe(false);
    for (const t of [1, PAR.surge, PAR.cobre, PAR.sai, PAR.duration - 1]) { glb.update(t); expect(glb.root.visible, `${t} ms`).toBe(true); }
    glb.update(PAR.duration);
    expect(glb.root.visible).toBe(false);
  });

  it('stays on the fixed anchor and the clip follows the omen clock, stopping at the end', () => {
    const glb = new VampiroGlb(), { objeto, filho } = falso();
    expect(glb.pronto).toBe(false);
    glb.anexar(objeto);
    expect(glb.pronto).toBe(true);
    for (const t of [PAR.surge, PAR.cobre, PAR.sai]) {
      glb.update(t);
      expect(glb.root.position.toArray()).toEqual(ANCORA_DO_GLB);
      expect(glb.root.scale.x).toBe(ESCALA_DO_GLB);
      expect(filho.position.x).toBeCloseTo(t / 5600, 5);
    }
    glb.update(PAR.duration + 3000);
    expect(filho.position.x).toBeCloseTo(1, 5);
  });

  it('animates again on the second round after the clip ran to the end', () => {
    const glb = new VampiroGlb(), { objeto, filho } = falso();
    glb.anexar(objeto);
    glb.update(PAR.duration);
    glb.update(1000);
    expect(filho.position.x).toBeCloseTo(1000 / PAR.duration, 5);
  });

  it('hides on demand and releases each geometry, material and texture once', () => {
    const glb = new VampiroGlb(), { objeto, filho } = falso();
    glb.anexar(objeto);
    glb.update(PAR.cobre);
    glb.hide();
    expect(glb.root.visible).toBe(false);
    const g = vi.spyOn(filho.geometry, 'dispose'), m = vi.spyOn(filho.material as MeshStandardMaterial, 'dispose');
    glb.dispose();
    expect(g).toHaveBeenCalledTimes(1);
    expect(m).toHaveBeenCalledTimes(1);
  });
});

function cena() {
  const color = { addColorStop: vi.fn() };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ createRadialGradient: () => color, fillRect: vi.fn() }) }) });
  const scene = new Scene(), show = new Show();
  scene.add(show.root);
  const gl = { compile: vi.fn(), render: vi.fn() } as unknown as WebGLRenderer;
  return { scene, show, gl, procedural: scene.getObjectByName('vampiro')!, glb: scene.getObjectByName('vampiro-glb')! };
}
const jogar = (dados: ('vtm' | 'hunger')[], faces: number[]) => {
  const source = { kind: 'key' } as const;
  definir(dados);
  input({ type: 'press', source, at: 0, repeat: false });
  input({ type: 'release', source, at: 550 });
  publish(arremesso().throwId, faces);
};
const par = () => jogar(['vtm', 'vtm'], [10, 10]);

describe('Show com o vampiro em GLB', () => {
  it('shows the GLB in the pair and hides the procedural body', () => {
    const { show, scene, gl, procedural, glb } = cena();
    show.anexarGlb(falso().objeto, gl, scene, camera);
    par();
    const em = (t: number) => show.frame(presagio().omenAt + t, camera, alvo, 800);
    em(PAR.cobre);
    expect(glb.visible).toBe(true);
    expect(procedural.visible).toBe(false);
    em(PAR.duration + 1);
    expect(glb.visible).toBe(false);
    show.dispose();
  });

  it('keeps the procedural body in the pair when no GLB was attached', () => {
    const { show, procedural, glb } = cena();
    par();
    show.frame(presagio().omenAt + PAR.cobre, camera, alvo, 800);
    expect(procedural.visible).toBe(true);
    expect(glb.visible).toBe(false);
    show.dispose();
  });

  it('ignores the GLB in the bestial omens', () => {
    const { show, scene, gl, procedural, glb } = cena();
    show.anexarGlb(falso().objeto, gl, scene, camera);
    jogar(['hunger'], [10]);
    show.frame(presagio().omenAt + 2000, camera, alvo, 800);
    expect(presagio().vampiro?.tipo).toBe('critico-bestial');
    expect(procedural.visible).toBe(true);
    expect(glb.visible).toBe(false);
    show.dispose();
  });

  it('hides the GLB on pickup, selection change and reduced motion', () => {
    const { show, scene, gl, glb } = cena();
    show.anexarGlb(falso().objeto, gl, scene, camera);
    const em = (t: number) => show.frame(presagio().omenAt + t, camera, alvo, 800);
    par(); em(PAR.cobre);
    expect(glb.visible).toBe(true);
    input({ type: 'press', source: { kind: 'key' }, at: 1200, repeat: false });
    em(PAR.cobre + 1);
    expect(glb.visible).toBe(false);
    par(); em(PAR.cobre);
    definir(['d20']);
    em(PAR.cobre + 1);
    expect(glb.visible).toBe(false);
    par(); em(PAR.cobre);
    expect(glb.visible).toBe(true);
    definirMovimentoReduzido(true);
    em(PAR.cobre + 1);
    expect(glb.visible).toBe(false);
    show.dispose();
  });
});

// A fake skeleton with the sanitized names the GLTFLoader gives: the arm bones lie along world x (the local +Y of each
// bone, turned by the rest rotation), each child 1 unit down the parent's +Y, so with the 7.5 scale l1 = l2 = 7.5.
function esqueleto() {
  const objeto = new Group(), peito = new Object3D();
  peito.name = 'peito';
  objeto.add(peito);
  const osso = (nome: string, pai: Object3D, p: [number, number, number], giro = 0) => {
    const o = new Object3D();
    o.name = nome; o.position.set(...p); o.rotation.z = giro;
    pai.add(o);
    return o;
  };
  const bracos = { L: [0.2, 1.5, 0, -Math.PI / 2], R: [-0.2, 1.5, 0, Math.PI / 2] } as const;
  const ossos: Record<string, Object3D> = {};
  for (const c of ['L', 'R'] as const) {
    const [x, y, z, giro] = bracos[c];
    const braco = osso('braco' + c, peito, [x, y, z], giro), ante = osso('antebraco' + c, braco, [0, 1, 0]), mao = osso('mao' + c, ante, [0, 1, 0]);
    Object.assign(ossos, { ['braco' + c]: braco, ['antebraco' + c]: ante, ['mao' + c]: mao });
  }
  ossos.cabeca = osso('cabeca', peito, [0, 1.7, 0.08]);
  return { objeto, ossos };
}
const mundo = (o: Object3D) => o.getWorldPosition(new Vector3());


describe('VampiroGlb, o bote nos dados reais', () => {
  const preparar = () => {
    const glb = new VampiroGlb(), { objeto, ossos } = esqueleto();
    glb.anexar(objeto);
    glb.update(1000);
    return { glb, ossos };
  };
  const ombro = (ossos: Record<string, Object3D>) => mundo(ossos.bracoL);

  it('puts the left wrist on the die offset when it is within reach, without touching bone lengths', () => {
    const { glb, ossos } = preparar();
    const rest = Object.fromEntries(Object.entries(ossos).map(([n, o]) => [n, [o.position.toArray(), o.scale.toArray()]]));
    const S = ombro(ossos), alvoPunho = S.clone().add(new Vector3(3, -4, 5));
    const dado = alvoPunho.clone().sub(new Vector3(0, 0.62, -0.55));
    glb.update(3450, { dado: dado.toArray(), dados: [dado.toArray()] });
    expect(mundo(ossos.maoL).distanceTo(alvoPunho)).toBeLessThan(1e-4);
    for (const [n, o] of Object.entries(ossos)) expect([n, o.position.toArray(), o.scale.toArray()]).toEqual([n, ...rest[n]]);
  });

  it('stretches to 0.999 of the reach and stops, toward a die that is too far', () => {
    const { glb, ossos } = preparar();
    const S = ombro(ossos), dado = S.clone().add(new Vector3(0, -2, 40));
    glb.update(3450, { dado: dado.toArray(), dados: [dado.toArray()] });
    expect(mundo(ossos.maoL).distanceTo(S)).toBeCloseTo(0.999 * 15, 3);
    expect(mundo(ossos.antebracoL).distanceTo(S)).toBeCloseTo(7.5, 4);
  });

  it('keeps the clip rotations outside the lunge window', () => {
    const { glb, ossos } = preparar();
    const antes = Object.fromEntries(Object.entries(ossos).map(([n, o]) => [n, o.quaternion.toArray()]));
    const dado: Vec3 = [0, 0.8, 0];
    for (const t of [500, 2900, 3900, 5000]) {
      glb.update(t, { dado, dados: [dado] });
      for (const [n, o] of Object.entries(ossos)) expect([t, n, o.quaternion.toArray()]).toEqual([t, n, antes[n]]);
    }
  });

  it('does nothing without a die, or when the model lacks the arm bones', () => {
    const { glb, ossos } = preparar();
    const antes = ossos.bracoL.quaternion.toArray();
    glb.update(3450, { dado: null, dados: [] });
    expect(ossos.bracoL.quaternion.toArray()).toEqual(antes);
    const sem = new VampiroGlb();
    sem.anexar(falso().objeto);
    expect(() => sem.update(3450, { dado: [0, 0, 0], dados: [[0, 0, 0]] })).not.toThrow();
  });

  it('moves the right wrist off any die closer than 1.3 units, within x -5.5..-2', () => {
    const { glb, ossos } = preparar();
    const mao = mundo(ossos.maoR), dado: Vec3 = [mao.x, 0.8, mao.z];
    glb.update(3450, { dado: null, dados: [dado] });
    const depois = mundo(ossos.maoR);
    expect(depois.x).toBeGreaterThanOrEqual(-5.5 - 1e-3);
    expect(depois.x).toBeLessThanOrEqual(-2 + 1e-3);
    expect(Math.hypot(depois.x - dado[0], depois.z - dado[2])).toBeGreaterThanOrEqual(1.3 - 1e-3);
  });
});
