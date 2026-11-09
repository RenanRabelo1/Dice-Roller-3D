import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics, useAfterPhysicsStep, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { Group, Quaternion, Vector3 } from 'three';
import { bodiesFor, polyhedron } from '../dice/polyhedra';
import { toResults } from '../dice/read';
import { applyLaunch, applyPoses, applySettle, bodyStates } from '../physics/apply';
import { initSettle, stepSettle, type SettleState } from '../throw/settle';
import type { DiceHook } from '../testHook';
import { GRAVITY, HAND, MAX_RADIUS, STEP, TRAY, handPositions, type Vec3 } from '../physics/world';
import { useDice } from '../store';
import { installTestHook } from '../testHook';
import { Die, GEM } from './Die';
import { Tray } from './Tray';
import { Hand } from './Hand';

function ThrowLoop({ bodies, recordLaunch }: {
  bodies: RefObject<(RapierRigidBody | null)[]>; recordLaunch: (last: NonNullable<ReturnType<DiceHook['launches']>['last']>) => void;
}) {
  const applied = useRef(-1);
  const settle = useRef<SettleState | null>(null);
  useBeforePhysicsStep(() => {
    const state = useDice.getState();
    const current = bodies.current.filter((b): b is RapierRigidBody => b !== null && b.isValid());
    if (state.gesture.phase !== 'rolling' || state.throwId === applied.current || current.length !== bodiesFor(state.kind, state.count).length) return;
    const before = bodyStates(current).map(({ p, q }) => ({ p, q }));
    if (state.fixture) applyPoses(current, state.fixture);
    else if (state.launch) applyLaunch(current, state.launch);
    else return;
    applied.current = state.throwId;
    recordLaunch({ before, after: bodyStates(current).map(({ p, q }) => ({ p, q })) });
    settle.current = initSettle(state.throwId, current.length);
  });
  useAfterPhysicsStep(() => {
    const state = useDice.getState();
    if (state.gesture.phase !== 'rolling' || !settle.current || settle.current.throwId !== state.throwId) return;
    const current = bodies.current.filter((b): b is RapierRigidBody => b !== null && b.isValid());
    const next = stepSettle(settle.current, {
      throwId: state.throwId, phase: state.gesture.phase,
      polys: bodiesFor(state.kind, state.count).map(({ shape, labels }) => polyhedron(shape, labels)), bodies: bodyStates(current),
    });
    settle.current = next.state;
    applySettle(current, next.action);
    if (next.action.type === 'publish') state.publish(state.throwId, toResults(state.kind, next.action.raw));
  });
  return null;
}

export function Stage({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const kind = useDice((state) => state.kind);
  const count = useDice((state) => state.count);
  const { camera, size } = useThree();
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const launches = useRef<ReturnType<DiceHook['launches']>>({ count: 0, last: null });
  const dice = useRef<Group>(null);
  const recordLaunch = useCallback((last: NonNullable<ReturnType<DiceHook['launches']>['last']>) => {
    launches.current = { count: launches.current.count + 1, last };
  }, []);
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
        const state = useDice.getState();
        return {
          kind: state.kind, count: state.count, phase: state.gesture.phase, throwId: state.throwId,
          results: state.results,
          ready: state.ready && state.kind === kind && state.count === count && bodies.current.filter((b) => b?.isValid()).length === bodiesFor(kind, count).length,
          error: state.error, aim: state.aim,
        };
      },
      select: (nextKind, nextCount) => {
        useDice.getState().setKind(nextKind);
        useDice.getState().setCount(nextCount);
      },
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
        const result: { text: string; position: Vec3; normal: Vec3 }[] = [];
        const die = dice.current?.getObjectByName(`die-${index}`);
        die?.updateWorldMatrix(true, true);
        die?.traverse((object) => {
          if (object.userData.diceLabel && 'text' in object) {
            result.push({
              text: String(object.text),
              position: object.getWorldPosition(new Vector3()).toArray(),
              normal: new Vector3(0, 0, 1).transformDirection(object.matrixWorld).toArray(),
            });
          }
        });
        return result;
      },
      fixture: (poses) => {
        if (poses.length !== bodiesFor(useDice.getState().kind, useDice.getState().count).length) throw new Error('Fixture must include every body');
        useDice.getState().startFixture(poses);
      },
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
  }, [gameArea, kind, count]);


  return (
    <>
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
          {bodiesFor(kind, count).map(({ shape, labels }, i) => (
            <Die key={`${kind}-${count}-${i}`} index={i} shape={shape} labels={labels} color={GEM[kind]}
              register={register} />
          ))}
        </group>
      </Physics>
    </>
  );
}
