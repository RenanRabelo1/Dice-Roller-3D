import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimationClip, BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3, VectorKeyframeTrack, type WebGLRenderer } from 'three';
import { arremesso, input, publish } from '../../arremesso/index.ts';
import { definir } from '../../selecao/index.ts';
import { definirMovimentoReduzido } from '../../../shared/plataforma/index.ts';
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
