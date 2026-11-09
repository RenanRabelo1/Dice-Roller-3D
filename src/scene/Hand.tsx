import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { ArrowHelper, Color, Mesh, Plane, Quaternion, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import { bodiesFor, polyhedron } from '../dice/polyhedra';
import { toKinematic } from '../physics/apply';
import { clampHandX, HAND, handPositions, type Quat, type Vec3 } from '../physics/world';
import { useDice } from '../store';
import { charge, clampTarget } from '../throw/aim';
import { showcasePoses } from './showcase';

// Showcase motion: settle beat, then each die flies to the front, staggered, with a strong ease-out.
const SHOW = { delay: 250, duration: 650, stagger: 70 };
const easeOut = (t: number) => 1 - (1 - t) ** 4;

export function Hand({ gameArea, bodies }: {
  gameArea: RefObject<HTMLDivElement | null>; bodies: RefObject<(RapierRigidBody | null)[]>;
}) {
  const { camera, gl, scene } = useThree();
  const motion = useRef<{ center: Vec3; omega: Vec3 }>({ center: [0, HAND.y, HAND.z], omega: [0, 0, 0] });
  const previousAim = useRef<Vec3>([...useDice.getState().aim]);
  const handX = useRef(0);
  const rotations = useRef<Quaternion[]>([]);
  const mode = useRef('');
  const returning = useRef<{ at: number; poses: { p: Vec3; q: Quat }[] } | null>(null);
  const showcase = useRef<{ at: number; throwId: number; from: { p: Vec3; q: Quat }[]; to: { p: Vec3; q: Quat }[] } | null>(null);
  const arrow = useRef<ArrowHelper>(null);
  const preview = import.meta.env.MODE === 'test' && new URLSearchParams(location.search).has('surface-preview');
  const live = useCallback(() => {
    const state = useDice.getState();
    const expected = bodiesFor(state.kind, state.count).length;
    const registered = bodies.current.filter((b): b is RapierRigidBody => b !== null && b.isValid() && (b.userData as { selection?: string } | undefined)?.selection === `${state.kind}-${state.count}`);
    return state.ready && registered.length === expected ? registered : null;
  }, [bodies]);

  useEffect(() => {
    const area = gameArea.current;
    if (!area) return;
    const ray = new Raycaster(), ndc = new Vector2(), hit = new Vector3();
    const floor = new Plane(new Vector3(0, 1, 0), 0);
    const cancel = () => useDice.getState().input({ type: 'cancel' });
    const cancelPointer = (e: PointerEvent) => {
      const { phase, source } = useDice.getState().gesture;
      if (phase === 'charging' && source?.kind === 'pointer' && source.id === e.pointerId) cancel();
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !live()) return;
      const state = useDice.getState();
      if (state.gesture.phase !== 'hand' && state.gesture.phase !== 'settled') return;
      area.focus({ preventScroll: true });
      state.input({ type: 'press', source: { kind: 'pointer', id: e.pointerId }, at: performance.now(), repeat: false });
      const { phase, source } = useDice.getState().gesture;
      if (phase === 'charging' && source?.kind === 'pointer' && source.id === e.pointerId) area.setPointerCapture(e.pointerId);
    };
    const up = (e: PointerEvent) => {
      useDice.getState().input({ type: 'release', source: { kind: 'pointer', id: e.pointerId }, at: performance.now() }, motion.current);
      if (area.hasPointerCapture(e.pointerId)) area.releasePointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const state = useDice.getState();
      if (state.gesture.phase !== 'hand' && state.gesture.phase !== 'charging') return;
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(floor, hit)) state.setAim(clampTarget(hit.toArray()));
    };
    const keydown = (e: KeyboardEvent) => {
      if (e.target !== area) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat && live()) useDice.getState().input({ type: 'press', source: { kind: 'key' }, at: performance.now(), repeat: false });
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const state = useDice.getState(), aim: Vec3 = [...state.aim];
        if (e.key === 'ArrowLeft') aim[0] -= 0.5;
        if (e.key === 'ArrowRight') aim[0] += 0.5;
        if (e.key === 'ArrowUp') aim[2] -= 0.5;
        if (e.key === 'ArrowDown') aim[2] += 0.5;
        if (state.gesture.phase === 'hand' || state.gesture.phase === 'charging') state.setAim(clampTarget(aim));
      }
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.target === area && e.code === 'Space') {
        e.preventDefault();
        useDice.getState().input({ type: 'release', source: { kind: 'key' }, at: performance.now() }, motion.current);
      }
    };
    area.addEventListener('pointerdown', down); area.addEventListener('pointerup', up);
    area.addEventListener('pointermove', move); area.addEventListener('pointercancel', cancelPointer);
    area.addEventListener('lostpointercapture', cancelPointer); area.addEventListener('blur', cancel);
    area.addEventListener('keydown', keydown); area.addEventListener('keyup', keyup);
    window.addEventListener('blur', cancel);
    return () => {
      area.removeEventListener('pointerdown', down); area.removeEventListener('pointerup', up);
      area.removeEventListener('pointermove', move); area.removeEventListener('pointercancel', cancelPointer);
      area.removeEventListener('lostpointercapture', cancelPointer); area.removeEventListener('blur', cancel);
      area.removeEventListener('keydown', keydown); area.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', cancel);
    };
  }, [camera, gameArea, gl, live]);

  useFrame((_, elapsed) => {
    const state = useDice.getState(), phase = state.gesture.phase;
    const marker = arrow.current!;
    const current = live();
    marker.visible = !preview && !!current && (phase === 'hand' || phase === 'charging');
    if (!current) return;
    const now = performance.now(), dt = Math.max(0.0001, Math.min(elapsed, 0.1));
    const identity = `${state.kind}-${state.count}`;
    const active = phase === 'hand' || phase === 'charging';
    const nextMode = active ? `${identity}-hand` : `${identity}-${phase}`;
    const setOpacity = (opacity: number) => {
      for (let i = 0; i < current.length; i++) scene.getObjectByName(`die-${i}`)?.traverse((object) => {
        if (object instanceof Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.opacity = opacity;
      });
    };
    if (active && mode.current !== nextMode) {
      toKinematic(current);
      rotations.current = current.map((body) => {
        const q = body.rotation();
        return new Quaternion(q.x, q.y, q.z, q.w);
      });
      returning.current = null;
      previousAim.current = [...state.aim];
      setOpacity(1);
    }
    if (phase === 'returning' && mode.current !== nextMode) {
      toKinematic(current);
      returning.current = { at: now, poses: current.map((body) => {
        const p = body.translation(), q = body.rotation();
        return { p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w] };
      }) };
    }
    if (phase === 'settled' && mode.current !== nextMode) {
      showcase.current = null;
      if (state.reducedMotion || !state.raw) state.setShowcased(state.throwId); // dice stay where they landed
      else {
        const polys = bodiesFor(state.kind, state.count).map(({ shape, labels }) => polyhedron(shape, labels));
        const from = current.map((body) => {
          const p = body.translation(), q = body.rotation();
          return { p: [p.x, p.y, p.z] as Vec3, q: [q.x, q.y, q.z, q.w] as Quat };
        });
        const cam = camera as PerspectiveCamera;
        // The values the panel shows, from the simulation: never re-read a die that stopped near an edge.
        const to = showcasePoses(polys, state.raw,
          { position: cam.position, quaternion: cam.quaternion, fov: cam.fov, aspect: cam.aspect }, state.kind === 'd100');
        showcase.current = { at: now, throwId: state.throwId, from, to };
      }
    }
    mode.current = nextMode;
    if (phase === 'settled' && showcase.current) {
      const { at, from, to, throwId } = showcase.current;
      let done = true;
      current.forEach((body, i) => {
        const t = Math.min(1, Math.max(0, (now - at - SHOW.delay - i * SHOW.stagger) / SHOW.duration));
        if (t < 1) done = false;
        const e = easeOut(t);
        const p = new Vector3(...from[i].p).lerp(new Vector3(...to[i].p), e);
        p.y += Math.sin(Math.PI * t) * 0.6; // small lift so the flight reads as an arc, not a slide
        const q = new Quaternion(...from[i].q).slerp(new Quaternion(...to[i].q), e);
        // Landed: pin the exact pose every frame (physics steps can lag frames on slow GPUs).
        if (t === 1) { body.setTranslation(p, false); body.setRotation(q, false); }
        body.setNextKinematicTranslation(p);
        body.setNextKinematicRotation(q);
      });
      if (done && state.showcased !== throwId) state.setShowcased(throwId);
      return;
    }
    if (phase === 'returning' && returning.current) {
      const t = Math.min(1, (now - returning.current.at) / (state.reducedMotion ? 150 : 400));
      const ease = state.reducedMotion ? 1 : 1 - (1 - t) ** 3;
      const positions = handPositions(current.length, clampHandX(state.aim[0], current.length));
      current.forEach((body, i) => {
        const from = returning.current!.poses[i];
        const p = new Vector3(...from.p).lerp(new Vector3(...positions[i]), ease);
        const q = new Quaternion(...from.q).slerp(new Quaternion(), ease);
        if (state.reducedMotion) { body.setTranslation(p, true); body.setRotation(q, true); }
        body.setNextKinematicTranslation(p); body.setNextKinematicRotation(q);
      });
      setOpacity(state.reducedMotion ? t : 1);
      if (t === 1) {
        handX.current = clampHandX(state.aim[0], current.length);
        state.input({ type: 'returned' });
      }
      return;
    }
    if (!active || preview) return;
    const force = phase === 'charging' ? charge(now - state.gesture.chargeStart) : 0;
    if (phase === 'charging') state.setForce(force);
    handX.current += (clampHandX(state.aim[0], current.length) - handX.current) * (1 - Math.exp(-12 * dt));
    const vx = (state.aim[0] - previousAim.current[0]) / dt, vz = (state.aim[2] - previousAim.current[2]) / dt;
    const omega: Vec3 = state.reducedMotion ? [0, 0, 0] : [vz * 1.2 + 0.6, 0.4, -vx * 1.2];
    previousAim.current = [...state.aim];
    const w = new Vector3(...omega), speed = w.length();
    const turn = speed ? new Quaternion().setFromAxisAngle(w.normalize(), speed * dt) : new Quaternion();
    const positions = handPositions(current.length, handX.current);
    const center: Vec3 = [0, 0, 0];
    current.forEach((body, i) => {
      const p = positions[i];
      p[1] += state.reducedMotion ? 0 : 0.08 * Math.sin(2 * Math.PI * now / 1600);
      p[2] += HAND.pull * force;
      const q = rotations.current[i].premultiply(turn).normalize();
      body.setNextKinematicTranslation(new Vector3(...p)); body.setNextKinematicRotation(q);
      const actual = body.translation();
      center[0] += actual.x / current.length; center[1] += actual.y / current.length; center[2] += actual.z / current.length;
    });
    motion.current = { center, omega };
    const origin = new Vector3(center[0], 0.01, center[2]);
    const direction = new Vector3(...state.aim).sub(origin); direction.y = 0;
    marker.position.copy(origin);
    marker.setDirection(direction.clone().normalize());
    marker.setLength(Math.max(0.01, direction.length()), 0.3 + force * 0.25, 0.18 + force * 0.12);
    marker.setColor(new Color('#D4A93F').lerp(new Color('#F25C3A'), force));
  });

  return <arrowHelper ref={arrow} />;
}
