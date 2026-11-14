import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EnvironmentPortal, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Box3, Color, Group, Mesh, Quaternion, Texture, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import { Text } from 'troika-three-text';

import {
  arremesso, GRAVITY, HAND, handPositions, inspecao as inspecaoDoArremesso, registroDeCorpos, STEP, TRAY, VORTEX, vortexCenter, vortexRadius,
} from '../modules/arremesso/index';
import { CorpoDoDado, LoopDoArremesso, MaoDoArremesso, useArremesso } from '../modules/arremesso/cena';
import type { Vec3 } from '../shared/math';
import { useDice } from '../store';
import { installTestHook } from './testHook';
import { Tray } from '../scene/Tray';
import { Hand } from '../scene/Hand';
import { Omens } from '../scene/Omens';
import { MAX_DICE, omenKind } from '../modules/regras/index';
import { inspecao, RAIO_MAXIMO } from '../modules/dados/index';
import { definir } from '../modules/selecao/index';
import { inspecao as inspecaoDosImportados } from '../modules/meus-dados/index';
import { useTable } from '../scene/tableState';
import { panoramaTexture } from '../scene/tableImages';
import { Guard, falha, marcarRenderizadorPorSoftware, movimentoReduzido } from '../shared/plataforma';

// The test-only surface preview checks numeral pixels, so it keeps the real resolution (no SwiftShader or adaptive DPR drop).
const isPreview = () => import.meta.env.MODE === 'test' && new URLSearchParams(location.search).has('surface-preview');

interface Pano { tex: Texture; rotation: number; intensity: number; blur: number; reflect: boolean }

export function Cena({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const selected = useArremesso((state) => state.dice);
  const background = useTable((state) => state.theme.background);
  const key = selected.join(',');
  const { camera, size, scene, gl, setDpr, viewport: { initialDpr, dpr } } = useThree();
  const desiredDpr = useRef(initialDpr), maxDpr = useRef(initialDpr);
  useLayoutEffect(() => {
    const context = gl.getContext(), debug = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER) as string;
    // SwiftShader cannot afford a full-resolution first throw or a late buffer resize on pickup.
    if (!isPreview() && /swiftshader/i.test(renderer)) { desiredDpr.current = maxDpr.current = 0.35; setDpr(0.35); marcarRenderizadorPorSoftware(); }
  }, [gl, setDpr]);
  // The 360° panorama (background + reflections). It is applied only between animations, like the DPR: re-capturing the
  // environment cubemap mid-throw would cost a frame.
  const [pano, setPano] = useState<Pano | null>(null);
  const wanted = useRef<Pano | null>(null);
  useEffect(() => {
    if (background.kind !== 'panorama') { wanted.current = null; return; }
    let live = true;
    const { rotation, intensity, blur, reflect } = background;
    panoramaTexture(background).then((tex) => { if (live) wanted.current = { tex, rotation: rotation * Math.PI / 180, intensity, blur, reflect }; }, () => {});
    return () => { live = false; };
  }, [background]);
  useFrame((state) => {
    if (wanted.current === pano) return;
    const { gesture, throwId } = arremesso(), { showcased } = useDice.getState();
    if (gesture.phase !== 'hand' && !(gesture.phase === 'settled' && showcased === throwId)) return;
    if (wanted.current) state.scene.background = wanted.current.tex;
    else if (pano && state.scene.background === pano.tex) state.scene.background = null; // a colour background attaches itself
    setPano(wanted.current);
  });
  const info = useRef(gl.info);
  const dice = useRef<Group>(null);
  const adjustDpr = (scale: number) => {
    if (isPreview()) return;
    desiredDpr.current = Math.min(maxDpr.current, Math.max(0.35, desiredDpr.current * scale));
  };
  useFrame(() => {
    if (desiredDpr.current === dpr) return;
    const { gesture, throwId } = arremesso(), { showcased } = useDice.getState();
    // Resizing the backing buffer can stall a software renderer: do it between animations.
    if (gesture.phase !== 'hand' && !(gesture.phase === 'settled' && showcased === throwId)) return;
    setDpr(desiredDpr.current);
  });
  // The dev omen test button lives in the legacy store; the throw loop reads it through this.
  const omenTestAtual = useCallback(() => useDice.getState().omenTest, []);

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
      // Fit the largest hand (20 bodies), so selection never changes the camera.
      for (const p of handPositions(HAND.cols * 4, 0)) {
        for (const x of [-RAIO_MAXIMO, RAIO_MAXIMO]) {
          for (const y of [-RAIO_MAXIMO, RAIO_MAXIMO]) {
            for (const z of [-RAIO_MAXIMO, RAIO_MAXIMO]) corners.push([p[0] + x, p[1] + y, p[2] + z]);
          }
        }
      }
      // ...and the widest whirl, aimed to either side.
      for (const side of [-1, 1]) {
        const c = vortexCenter(MAX_DICE, side * TRAY.halfWidth), R = vortexRadius(MAX_DICE);
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
          corners.push(c.map((v, k) => v + [x, y, z][k] * (R * VORTEX.squash[k] + RAIO_MAXIMO)) as Vec3);
        }
      }
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
        const state = { ...arremesso(), ...useDice.getState() };
        return {
          dice: state.dice, phase: state.gesture.phase, throwId: state.throwId,
          results: state.results,
          ready: state.ready && state.dice.join(',') === key && registroDeCorpos.current.filter((b) => b?.isValid()).length === selected.length,
          error: falha(), aim: state.aim, showcased: state.showcased,
          omen: state.omen?.throwId === state.throwId ? omenKind(state.omen) : null, omenDone: state.omenDone, reducedMotion: movimentoReduzido(),
          omenTime: performance.now() - state.omenAt, trayBroken: scene.getObjectByName('tray-surface')?.visible === false,
          burning: scene.getObjectByName('fire')?.visible === true, force: state.force,
        };
      },
      select: (next) => definir(next),
      rigOmen: (omen) => useDice.getState().rigOmen(omen),
      bodies: () => inspecaoDoArremesso().corpos(),
      meshes: () => {
        const result: { q: [number, number, number, number] }[] = [];
        dice.current?.updateWorldMatrix(true, true);
        for (let i = 0; i < registroDeCorpos.current.length; i++) {
          const gem = dice.current?.getObjectByName(`gem-${i}`);
          if (gem) result.push({ q: gem.getWorldQuaternion(new Quaternion()).toArray() });
        }
        return result;
      },
      labels: (index) => (dice.current ? inspecao.rotulos(dice.current, index) : []),
      camera: () => camera.position.toArray(),
      numbersVisible: (index) => (dice.current ? inspecao.numeraisVisiveis(dice.current, index) : false),
      gemLook: (index) => inspecao.aparenciaDaGema(scene, index),
      highlights: () => (scene.getObjectByName('result-highlights')?.children ?? []).map((o) => ({
        text: o instanceof Text ? o.text : null, visible: o.visible, position: o.position.toArray(),
      })),
      inkGlow: (index) => {
        const glow = scene.getObjectByName(`ink-glow-${index}`) as Mesh | undefined;
        return glow ? { visible: glow.visible, triangles: glow.geometry.getAttribute('position').count / 3, opacity: (glow.material as Material).opacity } : null;
      },
      launches: () => inspecaoDoArremesso().lancamentos(),
      customs: () => inspecaoDosImportados(),
      table: () => {
        const t = useTable.getState().theme, mesh = (name: string) => scene.getObjectByName(name), hex = (o?: Object3D) => {
          const m = o instanceof Mesh ? (Array.isArray(o.material) ? o.material[0] : o.material) as { color?: Color; map?: unknown } : null;
          return m?.color ? { color: `#${m.color.getHexString()}`, textured: !!m.map && !(m.map as { userData?: { placeholder?: boolean } }).userData?.placeholder } : null;
        };
        const guide = mesh('guia-area-de-jogo'), box = guide ? new Box3().setFromObject(guide, true) : null;
        const felt = hex(mesh('feltro') ?? undefined), wood = hex(mesh('base') ?? mesh('madeira') ?? undefined);
        return {
          reflect: t.background.kind === 'panorama' ? t.background.reflect : null, programs: info.current.programs?.length ?? 0,
          id: t.id, name: t.name, background: t.background.kind, backgroundColor: t.background.kind === 'color' ? t.background.color : null,
          felt: felt?.color ?? null, feltTextured: felt?.textured ?? false, wood: wood?.color ?? null, model: !!t.model,
          guide: box ? { size: box.getSize(new Vector3()).toArray(), center: box.getCenter(new Vector3()).toArray() } : null,
          saved: useTable.getState().tables.length,
          imported: (scene.getObjectByName('mesa') ?? scene.getObjectByName('tray-surface'))?.userData.imported === true,
        };
      },
      shards: () => {
        const piece = scene.getObjectByName('kraken-fragments')?.children[0] as Mesh | undefined;
        const c = (piece?.geometry as BufferGeometry | undefined)?.getAttribute('color');
        const hex = (i: number) => (c ? `#${new Color(c.getX(i), c.getY(i), c.getZ(i)).getHexString()}` : null);
        return c ? { felt: hex(0)!, wood: hex(3)! } : null;
      },
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
      {/* A colour is the scene's background; a photo or ready-made theme sits behind the transparent canvas (see App). */}
      {background.kind === 'color' && <color attach="background" args={[background.color]} />}
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 10, 5]} intensity={2.5} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9}
        shadow-camera-top={8} shadow-camera-bottom={-8} shadow-normalBias={0.03} />
      {/* Same cubemap target for every panorama, so the dice materials do not recompile when it changes. The rotation, intensity and blur props are
          re-applied by drei each time it re-captures, so they have to be passed here rather than set on the scene. */}
      <EnvironmentPortal resolution={256} map={pano?.reflect ? pano.tex : undefined}
        backgroundRotation={[0, pano?.rotation ?? 0, 0]} backgroundIntensity={pano?.intensity ?? 1} backgroundBlurriness={pano?.blur ?? 0}
        environmentRotation={[0, pano?.rotation ?? 0, 0]}>
        <Lightformer position={[0, 8, -5]} target={[0, 0, 0]} scale={[10, 6, 1]} intensity={3} color="#fff4dd" />
        <Lightformer position={[-8, 3, 4]} target={[0, 0, 0]} scale={[3, 8, 1]} intensity={4} color="#dceaff" />
        <Lightformer position={[6, -2, 6]} target={[0, 0, 0]} scale={[5, 9, 1]} intensity={3} color="#ffdab0" />
      </EnvironmentPortal>
      <Guard kind="physics">
      <Physics gravity={GRAVITY} timeStep={STEP} interpolate={false}>
        <Tray />
        <MaoDoArremesso gameArea={gameArea} />
        <Hand />
        <LoopDoArremesso omenTest={omenTestAtual} />
        <group ref={dice}>
          {selected.map((kind, i) => (
            <CorpoDoDado key={`${key}-${i}`} index={i} kind={kind} selection={key} count={selected.length} />
          ))}
        </group>
      </Physics>
      </Guard>
      <Omens />
    </>
  );
}
