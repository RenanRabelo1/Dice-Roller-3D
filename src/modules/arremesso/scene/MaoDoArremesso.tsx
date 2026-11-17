import { useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ArrowHelper, Color, Plane, PointLight, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { definirOpacidade, definirSombra, polyhedron } from '../../dados/index.ts';
import type { Quat, Vec3 } from '../../../shared/math.ts';
import { movimentoReduzido, perfilLeve, renderizadorPorSoftware } from '../../../shared/plataforma/index.ts';
import { charge, clampTarget } from '../domain/aim.ts';
import { toKinematic } from '../domain/apply.ts';
import { intensidadeDaCarga, LUZ_DA_CARGA } from '../domain/luz.ts';
import { newWhirl, ORBITS, restingPlaces, spinAngle, stepWhirl, vortexCenter } from '../domain/vortex.ts';
import { HAND } from '../domain/world.ts';
import { arremesso } from '../store.ts';
import { corposVivos } from './corpos.ts';

// The hand in the throw: pointer and keyboard input, the aim and its arrow, the whirl of the dice in the hand, the
// hand's motion handed on to the launch, and the return to the hand. What happens in `settled` is not here.
// The shell mounts it right before the `vitrine`'s `<Vitrine/>`, so this frame runs before the showcase's.
export function MaoDoArremesso({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> }) {
  const { camera, gl, scene } = useThree();
  const motion = useRef<{ center: Vec3; omega: Vec3 }>({ center: [0, HAND.y, HAND.z], omega: [0, 0, 0] });
  const previousAim = useRef<Vec3>([...arremesso().aim]);
  const handX = useRef(0);
  // The dice in the hand swirl as one whirlwind (see arremesso/domain/vortex); it outlives a selection change.
  const whirl = useRef(newWhirl(vortexCenter(1, 0)));
  const whirled = useRef({ identity: '', count: 0 });
  const rotations = useRef<Quaternion[]>([]);
  const mode = useRef('');
  const returning = useRef<{ at: number; poses: { p: Vec3; q: Quat }[] } | null>(null);
  const arrow = useRef<ArrowHelper>(null);
  const luz = useRef<PointLight>(null);
  const preview = import.meta.env.MODE === 'test' && new URLSearchParams(location.search).has('surface-preview');

  useEffect(() => {
    const area = gameArea.current;
    if (!area) return;
    const ray = new Raycaster(), ndc = new Vector2(), hit = new Vector3();
    const floor = new Plane(new Vector3(0, 1, 0), 0);
    const cancel = () => arremesso().input({ type: 'cancel' });
    const cancelPointer = (e: PointerEvent) => {
      const { phase, source } = arremesso().gesture;
      if (phase === 'charging' && source?.kind === 'pointer' && source.id === e.pointerId) cancel();
    };
    const down = (e: PointerEvent) => {
      // Only the table starts a throw: a press on a panel laid over it (the animation tests) belongs to that panel.
      if (e.button !== 0 || !corposVivos() || (e.target !== area && !(e.target instanceof HTMLCanvasElement))) return;
      const state = arremesso();
      if (state.gesture.phase !== 'hand' && state.gesture.phase !== 'settled') return;
      area.focus({ preventScroll: true });
      state.input({ type: 'press', source: { kind: 'pointer', id: e.pointerId }, at: performance.now(), repeat: false });
      const { phase, source } = arremesso().gesture;
      if (phase === 'charging' && source?.kind === 'pointer' && source.id === e.pointerId) area.setPointerCapture(e.pointerId);
    };
    const up = (e: PointerEvent) => {
      arremesso().input({ type: 'release', source: { kind: 'pointer', id: e.pointerId }, at: performance.now() }, motion.current);
      if (area.hasPointerCapture(e.pointerId)) area.releasePointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const state = arremesso();
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
        if (!e.repeat && corposVivos()) arremesso().input({ type: 'press', source: { kind: 'key' }, at: performance.now(), repeat: false });
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const state = arremesso(), aim: Vec3 = [...state.aim];
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
        arremesso().input({ type: 'release', source: { kind: 'key' }, at: performance.now() }, motion.current);
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
  }, [camera, gameArea, gl]);

  useFrame((_, elapsed) => {
    const state = arremesso(), phase = state.gesture.phase;
    const marker = arrow.current!;
    // The charge light has no shadow and mounts once per session: not at all in the light profile (ADR 0011), always in the full one.
    const light = luz.current;
    if (light) {
      light.intensity = intensidadeDaCarga(phase, state.force, renderizadorPorSoftware());
      if (light.intensity > 0) light.position.set(state.aim[0], state.aim[1] + LUZ_DA_CARGA.altura, state.aim[2]);
    }
    const current = corposVivos();
    marker.visible = !preview && !!current && (phase === 'hand' || phase === 'charging');
    if (!current) return;
    const now = performance.now(), dt = Math.max(0.0001, Math.min(elapsed, 0.1));
    const identity = state.dice.join(',');
    const active = phase === 'hand' || phase === 'charging';
    const nextMode = active ? `${identity}-hand` : `${identity}-${phase}`;
    // The die's objects come from `dados`. Shadows switch only on the way into the hand; the opacity also goes
    // every frame of the return (as before, a lookup per die, for the 150-400 ms of it).
    const setOpacity = (opacity: number) => { for (let i = 0; i < current.length; i++) definirOpacidade(scene, i, opacity); };
    const shadows = (on: boolean) => { for (let i = 0; i < current.length; i++) definirSombra(scene, i, on); };
    if (active && mode.current !== nextMode) {
      shadows(true);
      toKinematic(current);
      // A new selection keeps each slot's place in the whirl (the new dice fly out of its middle, where they
      // appear); back from a pickup, the whirl goes on from where the dice are.
      const w = whirl.current, kept = whirled.current.identity === identity ? 0 : Math.min(whirled.current.count, current.length);
      current.forEach((body, i) => {
        if (i < kept) body.setTranslation(new Vector3(...w.pos[i]), true);
        else { const p = body.translation(); w.pos[i] = [p.x, p.y, p.z]; }
      });
      whirled.current = { identity, count: current.length };
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
    mode.current = nextMode;
    if (phase === 'returning' && returning.current) {
      const t = Math.min(1, (now - returning.current.at) / (movimentoReduzido() ? 150 : 400));
      const ease = movimentoReduzido() ? 1 : 1 - (1 - t) ** 3;
      const x = vortexCenter(current.length, state.aim[0])[0];
      const positions = restingPlaces(whirl.current, x, state.dice.map((d) => polyhedron(d).radius));
      current.forEach((body, i) => {
        const from = returning.current!.poses[i];
        const p = new Vector3(...from.p).lerp(new Vector3(...positions[i]), ease);
        const q = new Quaternion(...from.q).slerp(new Quaternion(), ease);
        // Publish "hand" only after Rapier has the exact final pose, even if its last step lagged a frame.
        if (movimentoReduzido() || t === 1) { body.setTranslation(p, true); body.setRotation(q, true); }
        body.setNextKinematicTranslation(p); body.setNextKinematicRotation(q);
      });
      setOpacity(movimentoReduzido() ? t : 1);
      if (t === 1) {
        handX.current = x;
        state.input({ type: 'returned' });
      }
      return;
    }
    if (!active || preview) return;
    const force = phase === 'charging' ? charge(now - state.gesture.chargeStart, state.chargeMode) : 0; // static: holds at 1, the whirl at full speed
    if (phase === 'charging') state.setForce(force);
    handX.current += (vortexCenter(current.length, state.aim[0])[0] - handX.current) * (1 - Math.exp(-12 * dt));
    const vx = (state.aim[0] - previousAim.current[0]) / dt, vz = (state.aim[2] - previousAim.current[2]) / dt;
    const omega: Vec3 = movimentoReduzido() ? [0, 0, 0] : [vz * 1.2 + 0.6, 0.4, -vx * 1.2]; // the hand's swing, handed on to the throw
    previousAim.current = [...state.aim];
    // The whirl: every die on its own orbit and spinning about its own axis, all faster as the charge builds.
    const places = stepWhirl(whirl.current, { x: handX.current, force, dt, radii: state.dice.map((d) => polyhedron(d).radius), still: movimentoReduzido() });
    const center: Vec3 = [0, 0, 0];
    current.forEach((body, i) => {
      const spin = new Quaternion().setFromAxisAngle(new Vector3(...ORBITS[i].axis), spinAngle(i, force, dt, movimentoReduzido()));
      body.setNextKinematicTranslation(new Vector3(...places[i]));
      body.setNextKinematicRotation(rotations.current[i].premultiply(spin).normalize());
      for (let k = 0; k < 3; k++) center[k] += places[i][k] / current.length;
    });
    motion.current = { center, omega };
    const origin = new Vector3(center[0], 0.01, center[2]);
    const direction = new Vector3(...state.aim).sub(origin); direction.y = 0;
    marker.position.copy(origin);
    marker.setDirection(direction.clone().normalize());
    marker.setLength(Math.max(0.01, direction.length()), 0.3 + force * 0.25, 0.18 + force * 0.12);
    marker.setColor(new Color('#D4A93F').lerp(new Color('#F25C3A'), force));
  });

  return (
    <>
      <arrowHelper ref={arrow} />
      {!perfilLeve() && <pointLight ref={luz} intensity={0} color={LUZ_DA_CARGA.cor} distance={LUZ_DA_CARGA.alcance} decay={2} />}
    </>
  );
}
