import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Physics, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { Group, Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import { Text } from 'troika-three-text';

import { bodyStates } from '../physics/apply';
import { presimulate, type Recording, type RollRequest, type RollResponse } from '../physics/presim';
import type { DiceHook } from '../testHook';
import { GRAVITY, HAND, MAX_RADIUS, STEP, TRAY, handPositions, type Vec3 } from '../physics/world';
import { useDice } from '../store';
import { installTestHook } from '../testHook';
import { Die, GEM } from './Die';
import { Tray } from './Tray';
import { Hand } from './Hand';
import { Omens } from './Omens';
import { omenKind } from '../dice/omen';
import { MAX_DICE } from '../dice/polyhedra';
import { VORTEX, vortexCenter, vortexRadius } from '../throw/vortex';

const WORKER_TIMEOUT = 2000; // ms; a ten-dice recording takes well under 200 ms

function ThrowLoop({ bodies, recordLaunch }: {
  bodies: RefObject<(RapierRigidBody | null)[]>;
  recordLaunch: (last: NonNullable<ReturnType<DiceHook['launches']>['last']>) => void;
}) {
  const play = useRef<{ throwId: number; request: RollRequest; rec: Recording | null; at: number; sent: number } | null>(null);
  const worker = useRef<Worker | null>(null);
  // A blocked, failed or silent worker still gets a real roll, here; discard cancelled selections.
  // If the engine itself fails, the throw is dropped and the dice go back to the hand.
  const fallback = useCallback(() => {
    worker.current?.terminate(); worker.current = null;
    const pending = play.current, state = useDice.getState();
    if (pending && !pending.rec && pending.throwId === state.throwId && state.gesture.phase === 'rolling') {
      const { dice, start, launch } = pending.request;
      try { pending.rec = presimulate(dice, start, launch); } catch (error) {
        console.error(error);
        state.setDice(state.dice);
        state.setError('physics');
      }
    }
  }, []);
  useEffect(() => {
    try {
      const w = new Worker(new URL('../physics/presim.worker.ts', import.meta.url), { type: 'module' });
      worker.current = w;
      w.onmessage = ({ data }: MessageEvent<RollResponse>) => {
        const pending = play.current, state = useDice.getState();
        if (!pending || data.throwId !== pending.throwId || data.throwId !== state.throwId || state.gesture.phase !== 'rolling') return;
        if ('error' in data) fallback();
        else pending.rec = data.rec;
      };
      w.onerror = (event) => { event.preventDefault(); fallback(); };
      w.onmessageerror = fallback;
    } catch { fallback(); }
    return () => { worker.current?.terminate(); worker.current = null; };
  }, [fallback]);
  const live = () => bodies.current.filter((b): b is RapierRigidBody => b !== null && b.isValid());
  // On release the whole roll is simulated offline from the dice's current poses, then replayed one recorded
  // step per physics step: a real roll in real time, whose result is published the moment it ends.
  useBeforePhysicsStep(() => {
    const { gesture, throwId, launch, dice, publish } = useDice.getState();
    if (gesture.phase !== 'rolling' || !launch) return;
    const current = live();
    if (play.current?.throwId !== throwId) {
      if (current.length !== dice.length) return;
      const start = bodyStates(current).map(({ p, q }) => ({ p, q }));
      const request: RollRequest = { dice, start, launch };
      play.current = { throwId, request, rec: null, at: 0, sent: performance.now() };
      useDice.getState().setError(null);
      if (worker.current) worker.current.postMessage(request);
      else play.current.rec = presimulate(dice, start, launch);
      recordLaunch({ before: start, after: bodyStates(current).map(({ p, q }) => ({ p, q })) });
    }
    const { rec } = play.current;
    if (!rec) { if (performance.now() - play.current.sent > WORKER_TIMEOUT) fallback(); return; }
    rec.frames[play.current.at].forEach(({ p, q }, i) => {
      current[i].setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
      current[i].setNextKinematicRotation({ x: q[0], y: q[1], z: q[2], w: q[3] });
    });
    if (++play.current.at === rec.frames.length) {
      // Subscribers must see the final pose, even before this physics step has run.
      rec.frames.at(-1)!.forEach(({ p, q }, i) => {
        current[i].setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
        current[i].setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
      });
      publish(throwId, rec.results, rec.raw);
    }
  });
  return null;
}

export function Stage({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const selected = useDice((state) => state.dice);
  const key = selected.join(',');
  const { camera, size, scene, gl, setDpr, viewport: { initialDpr, dpr } } = useThree();
  const desiredDpr = useRef(initialDpr), maxDpr = useRef(initialDpr);
  useLayoutEffect(() => {
    const context = gl.getContext(), debug = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER) as string;
    // SwiftShader cannot afford a full-resolution first throw or a late buffer resize on pickup.
    if (/swiftshader/i.test(renderer)) { desiredDpr.current = maxDpr.current = 0.35; setDpr(0.35); }
  }, [gl, setDpr]);
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const launches = useRef<ReturnType<DiceHook['launches']>>({ count: 0, last: null });
  const dice = useRef<Group>(null);
  const recordLaunch = useCallback((last: NonNullable<ReturnType<DiceHook['launches']>['last']>) => {
    launches.current = { count: launches.current.count + 1, last };
  }, []);
  const adjustDpr = (scale: number) => {
    desiredDpr.current = Math.min(maxDpr.current, Math.max(0.35, desiredDpr.current * scale));
  };
  useFrame(() => {
    if (desiredDpr.current === dpr) return;
    const { gesture, showcased, throwId } = useDice.getState();
    // Resizing the backing buffer can stall a software renderer: do it between animations.
    if (gesture.phase !== 'hand' && !(gesture.phase === 'settled' && showcased === throwId)) return;
    setDpr(desiredDpr.current);
  });
  const register = useCallback((index: number, body: RapierRigidBody | null) => {
    bodies.current[index] = body;
  }, []);

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
        for (const x of [-MAX_RADIUS, MAX_RADIUS]) {
          for (const y of [-MAX_RADIUS, MAX_RADIUS]) {
            for (const z of [-MAX_RADIUS, MAX_RADIUS]) corners.push([p[0] + x, p[1] + y, p[2] + z]);
          }
        }
      }
      // ...and the widest whirl, aimed to either side.
      for (const side of [-1, 1]) {
        const c = vortexCenter(MAX_DICE, side * TRAY.halfWidth), R = vortexRadius(MAX_DICE);
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
          corners.push(c.map((v, k) => v + [x, y, z][k] * (R * VORTEX.squash[k] + MAX_RADIUS)) as Vec3);
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

  const numbersOf = (index: number) => dice.current?.getObjectByName(`die-${index}`)?.children.find((o) => o.userData.labels);

  useEffect(() => {
    installTestHook({
      state: () => {
        const state = useDice.getState();
        return {
          dice: state.dice, phase: state.gesture.phase, throwId: state.throwId,
          results: state.results,
          ready: state.ready && state.dice.join(',') === key && bodies.current.filter((b) => b?.isValid()).length === selected.length,
          error: state.error, aim: state.aim, showcased: state.showcased,
          omen: state.omen?.throwId === state.throwId ? omenKind(state.omen) : null, omenDone: state.omenDone,
          omenTime: performance.now() - state.omenAt, trayBroken: scene.getObjectByName('tray-surface')?.visible === false,
          burning: scene.getObjectByName('fire')?.visible === true,
        };
      },
      select: (next) => useDice.getState().setDice(next),
      rigOmen: (omen) => useDice.getState().rigOmen(omen),
      bodies: () => bodies.current.filter((body): body is RapierRigidBody => body !== null && body.isValid()).map((body) => {
        const p = body.translation(), q = body.rotation();
        return { handle: body.handle, p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w], type: body.bodyType() };
      }),
      meshes: () => {
        const result: { q: [number, number, number, number] }[] = [];
        dice.current?.updateWorldMatrix(true, true);
        for (let i = 0; i < bodies.current.length; i++) {
          const gem = dice.current?.getObjectByName(`gem-${i}`);
          if (gem) result.push({ q: gem.getWorldQuaternion(new Quaternion()).toArray() });
        }
        return result;
      },
      labels: (index) => {
        const result: ReturnType<DiceHook['labels']> = [];
        const batch = numbersOf(index);
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
      },
      camera: () => camera.position.toArray(),
      numbersVisible: (index) => numbersOf(index)?.visible ?? false,
      highlights: () => (scene.getObjectByName('result-highlights')?.children ?? []).map((o) => ({
        text: o instanceof Text ? o.text : null, visible: o.visible, position: o.position.toArray(),
      })),
      launches: () => launches.current,
      previewSurface: (index, p, q) => {
        if (import.meta.env.MODE !== 'test' || !new URLSearchParams(location.search).has('surface-preview') || useDice.getState().gesture.phase !== 'hand') throw new Error('Surface preview is only available in the test preview scene');
        const body = bodies.current[index];
        if (!body) throw new Error(`Die ${index} is not registered`);
        body.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
        body.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
        body.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
        body.setNextKinematicRotation({ x: q[0], y: q[1], z: q[2], w: q[3] });
      },
    });
    useDice.getState().setReady();
  }, [camera, gameArea, key, selected, scene]);


  return (
    <>
      {/* Slow GPUs need fewer pixels during tosses and pickup; restore detail when there is headroom. */}
      <PerformanceMonitor ms={200} iterations={3} bounds={() => [28, 55]}
        onDecline={() => adjustDpr(0.75)} onIncline={() => adjustDpr(1.1)} />
      <color attach="background" args={['#140E10']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 10, 5]} intensity={2.5} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9}
        shadow-camera-top={8} shadow-camera-bottom={-8} shadow-normalBias={0.03} />
      <Environment resolution={256}>
        <Lightformer position={[0, 8, -5]} target={[0, 0, 0]} scale={[10, 6, 1]} intensity={3} color="#fff4dd" />
        <Lightformer position={[-8, 3, 4]} target={[0, 0, 0]} scale={[3, 8, 1]} intensity={4} color="#dceaff" />
        <Lightformer position={[6, -2, 6]} target={[0, 0, 0]} scale={[5, 9, 1]} intensity={3} color="#ffdab0" />
      </Environment>
      <Physics gravity={GRAVITY} timeStep={STEP} interpolate={false}>
        <Tray />
        <Hand gameArea={gameArea} bodies={bodies} />
        <ThrowLoop bodies={bodies} recordLaunch={recordLaunch} />
        <group ref={dice}>
          {selected.map((kind, i) => (
            <Die key={`${key}-${i}`} index={i} kind={kind} selection={key} count={selected.length} color={GEM[kind]}
              register={register} />
          ))}
        </group>
      </Physics>
      <Omens bodies={bodies} />
    </>
  );
}
