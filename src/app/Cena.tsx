import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Group, Quaternion } from 'three';

import {
  arremesso, envelopeDaMao, GRAVITY, inspecao as inspecaoDoArremesso, registroDeCorpos, STEP, TRAY,
} from '../modules/arremesso/index.ts';
import { CorpoDoDado, LoopDoArremesso, MaoDoArremesso, useArremesso } from '../modules/arremesso/cena.ts';
import type { Vec3 } from '../shared/math.ts';
import { inspecao as inspecaoDaVitrine, vitrine, vitrineConcluida } from '../modules/vitrine/index.ts';
import { Vitrine } from '../modules/vitrine/cena.ts';
import { inspecao as inspecaoDoPresagio, presagio, rigOmen } from '../modules/pressagios/index.ts';
import { PresagiosNaCena, QuebraDaMesa } from '../modules/pressagios/cena.ts';
import { installTestHook } from './testHook.ts';
import { gemaNaRaiz, inspecao } from '../modules/dados/index.ts';
import { definir } from '../modules/selecao/index.ts';
import { inspecao as inspecaoDosImportados } from '../modules/meus-dados/index.ts';
import { inspecao as inspecaoDaMesa } from '../modules/mesa/index.ts';
import { AmbienteDaMesa, MesaNaCena } from '../modules/mesa/cena.ts';
import { Guard, falha, marcarRenderizadorPorSoftware, movimentoReduzido } from '../shared/plataforma/index.ts';

// The test-only surface preview checks numeral pixels, so it keeps the real resolution (no SwiftShader or adaptive DPR drop).
const isPreview = () => import.meta.env.MODE === 'test' && new URLSearchParams(location.search).has('surface-preview');

// Between animations (phase `hand`, or the showcase done): the DPR and the table's panorama change only then.
const entreAnimacoes = () => {
  const { gesture, throwId } = arremesso();
  return gesture.phase === 'hand' || (gesture.phase === 'settled' && vitrineConcluida(throwId));
};

export function Cena({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const selected = useArremesso((state) => state.dice);
  const key = selected.join(',');
  const { camera, size, scene, gl, setDpr, viewport: { initialDpr, dpr } } = useThree();
  const desiredDpr = useRef(initialDpr), maxDpr = useRef(initialDpr);
  useLayoutEffect(() => {
    const context = gl.getContext(), debug = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER) as string;
    // SwiftShader cannot afford a full-resolution first throw or a late buffer resize on pickup.
    if (!isPreview() && /swiftshader/i.test(renderer)) { desiredDpr.current = maxDpr.current = 0.35; setDpr(0.35); marcarRenderizadorPorSoftware(); }
  }, [gl, setDpr]);
  const info = useRef(gl.info);
  const dice = useRef<Group>(null);
  const adjustDpr = (scale: number) => {
    if (isPreview()) return;
    desiredDpr.current = Math.min(maxDpr.current, Math.max(0.35, desiredDpr.current * scale));
  };
  useFrame(() => {
    if (desiredDpr.current === dpr) return;
    // Resizing the backing buffer can stall a software renderer: do it between animations.
    if (!entreAnimacoes()) return;
    setDpr(desiredDpr.current);
  });
  // The dev omen test button lives in `pressagios`; the throw loop reads it through this.
  const omenTestAtual = useCallback(() => presagio().omenTest, []);

  useEffect(() => {
    // Keep the whole tray in portrait view, preserving the camera's fixed viewing angle.
    const aspect = size.width / size.height;
    const distance = Math.hypot(14, 10);
    let fitted = distance;
    if (aspect < 1.6) {
      const corners: Vec3[] = [];
      for (const x of [-TRAY.halfWidth - TRAY.wallThickness, TRAY.halfWidth + TRAY.wallThickness]) {
        for (const y of [-TRAY.wallThickness, TRAY.wallHeight]) {
          for (const z of [-TRAY.halfDepth - TRAY.wallThickness, TRAY.halfDepth + TRAY.wallThickness]) corners.push([x, y, z]);
        }
      }
      // Fit the largest hand (20 bodies) and the widest whirl, so selection never changes the camera (arremesso).
      corners.push(...envelopeDaMao());
      const halfFov = Math.tan(20 * Math.PI / 180) * 0.94;
      for (const [x, y, z] of corners) {
        const depth = (14 * y + 10 * z) / distance;
        const up = (10 * y - 14 * z) / distance;
        fitted = Math.max(fitted, depth + Math.abs(x) / (halfFov * aspect), depth + Math.abs(up) / halfFov);
      }
    }
    const scale = fitted / distance;
    camera.position.set(0, 14 * scale, 10 * scale);
    camera.lookAt(0, 0, 0);
  }, [camera, size.width, size.height]);

  useEffect(() => {
    installTestHook({
      state: () => {
        const state = arremesso(), { showcased } = vitrine();
        const { omen, omenDone, omenTime, trayBroken, burning } = inspecaoDoPresagio(scene); // the omen's fields, from pressagios
        return {
          dice: state.dice, phase: state.gesture.phase, throwId: state.throwId,
          results: state.results,
          ready: state.ready && state.dice.join(',') === key && registroDeCorpos.current.filter((b) => b?.isValid()).length === selected.length,
          error: falha(), aim: state.aim, showcased,
          omen, omenDone, reducedMotion: movimentoReduzido(), omenTime, trayBroken, burning, force: state.force,
        };
      },
      select: (next) => definir(next),
      rigOmen: (omen) => rigOmen(omen),
      bodies: () => inspecaoDoArremesso().corpos(),
      meshes: () => {
        const result: { q: [number, number, number, number] }[] = [];
        dice.current?.updateWorldMatrix(true, true);
        for (let i = 0; i < registroDeCorpos.current.length; i++) {
          const gem = dice.current ? gemaNaRaiz(dice.current, i) : undefined;
          if (gem) result.push({ q: gem.getWorldQuaternion(new Quaternion()).toArray() });
        }
        return result;
      },
      labels: (index) => (dice.current ? inspecao.rotulos(dice.current, index) : []),
      camera: () => camera.position.toArray(),
      numbersVisible: (index) => (dice.current ? inspecao.numeraisVisiveis(dice.current, index) : false),
      gemLook: (index) => inspecao.aparenciaDaGema(scene, index),
      highlights: () => inspecaoDaVitrine(scene).highlights(),
      inkGlow: (index) => inspecaoDaVitrine(scene).inkGlow(index),
      launches: () => inspecaoDoArremesso().lancamentos(),
      customs: () => inspecaoDosImportados(),
      table: () => inspecaoDaMesa(scene, info.current.programs?.length ?? 0),
      shards: () => inspecaoDoPresagio(scene).shards,
      previewSurface: (index, p, q) => {
        if (import.meta.env.MODE !== 'test' || !new URLSearchParams(location.search).has('surface-preview') || arremesso().gesture.phase !== 'hand') throw new Error('Surface preview is only available in the test preview scene');
        const body = registroDeCorpos.current[index];
        if (!body) throw new Error(`Die ${index} is not registered`);
        body.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
        body.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
        body.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
        body.setNextKinematicRotation({ x: q[0], y: q[1], z: q[2], w: q[3] });
      },
    });
    arremesso().setReady();
  }, [camera, gameArea, key, selected, scene]);


  return (
    <>
      {/* Slow GPUs need fewer pixels during tosses and pickup; restore detail when there is headroom. */}
      <PerformanceMonitor ms={200} iterations={3} bounds={() => [28, 55]}
        onDecline={() => adjustDpr(0.75)} onIncline={() => adjustDpr(1.1)} />
      {/* The table's ambience (colour background, 360° panorama, environment map) renders in this order: the colour,
          the shell's lights, then the environment with the shell's Lightformers inside. */}
      <AmbienteDaMesa podeTrocar={entreAnimacoes} luzes={<>
        <ambientLight intensity={0.35} />
        <directionalLight position={[-4, 10, 5]} intensity={2.5} castShadow
          shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9}
          shadow-camera-top={8} shadow-camera-bottom={-8} shadow-normalBias={0.03} />
      </>}>
        <Lightformer position={[0, 8, -5]} target={[0, 0, 0]} scale={[10, 6, 1]} intensity={3} color="#fff4dd" />
        <Lightformer position={[-8, 3, 4]} target={[0, 0, 0]} scale={[3, 8, 1]} intensity={4} color="#dceaff" />
        <Lightformer position={[6, -2, 6]} target={[0, 0, 0]} scale={[5, 9, 1]} intensity={3} color="#ffdab0" />
      </AmbienteDaMesa>
      <Guard kind="physics">
      <Physics gravity={GRAVITY} timeStep={STEP} interpolate={false}>
        <QuebraDaMesa />
        <MesaNaCena />
        <MaoDoArremesso gameArea={gameArea} />
        <Vitrine />
        <LoopDoArremesso omenTest={omenTestAtual} />
        <group ref={dice}>
          {selected.map((kind, i) => (
            <CorpoDoDado key={`${key}-${i}`} index={i} kind={kind} selection={key} count={selected.length} />
          ))}
        </group>
      </Physics>
      </Guard>
      <PresagiosNaCena />
    </>
  );
}
