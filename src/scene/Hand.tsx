import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { ArrowHelper, Color, Group, Matrix4, Mesh, MeshBasicMaterial, Plane, Quaternion, Raycaster, Vector2, Vector3, type BufferGeometry, type Object3D, type PerspectiveCamera } from 'three';
import { Text } from 'troika-three-text';
import { MAX_DICE, polyhedron } from '../dice/polyhedra';
import { toKinematic } from '../physics/apply';
import { clampHandX, HAND, handPositions, type Quat, type Vec3 } from '../physics/world';
import { useDice } from '../store';
import { charge, clampTarget } from '../throw/aim';
import { showcasePoses } from './showcase';
import { easeOut, highlightAt, HL_SIZE, SHOW } from './highlight';
import { symbolGeometry } from '../dice/symbols';
import { FONT, FONT_URL, SYMBOL } from './Die';
import { KRAKEN, krakenAt, krakenFlightAt, krakenHeroPoses, krakenIndices, span } from './krakenMotion';
import type { Pose } from './showcase';

type Mark = { local: Vector3; turn: Quaternion; start: Vector3; face: Vector3; scale: number }; // local, turn: the rolled numeral's place and turn in die space

// An imported die's gem is a group (a GLB has many meshes), so the shadow switch goes on its meshes.
const shade = (gem: Object3D | undefined, on: boolean) => gem?.traverse((o) => { if (o instanceof Mesh) o.castShadow = on; });

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
  const showcase = useRef<{ at: number; throwId: number; from: Pose[]; to: Pose[]; hero: Pose[]; kraken: number[]; omenAt: number; gems: (Object3D | undefined)[]; marks: Mark[]; still?: boolean; landed?: boolean } | null>(null);
  // The rolled numbers that rise over the settled dice, ride to their faces and glow (one per die, drawn on top).
  const numbersGroup = useRef<Group>(null);
  const numbersRef = useRef<Text[]>([]);
  const glyphsRef = useRef<Mesh<BufferGeometry, MeshBasicMaterial>[]>([]); // same, for a rolled face that shows a symbol
  useEffect(() => {
    const group = numbersGroup.current!;
    const glyphs = Array.from({ length: MAX_DICE }, () => {
      const g = new Mesh<BufferGeometry, MeshBasicMaterial>(undefined, new MeshBasicMaterial({ color: '#FFE38A', transparent: true, depthTest: false, toneMapped: false }));
      g.renderOrder = 20; g.visible = false;
      group.add(g);
      return g;
    });
    glyphsRef.current = glyphs;
    const list = Array.from({ length: MAX_DICE }, () => {
      const t = new Text();
      Object.assign(t, { font: FONT_URL, fontSize: HL_SIZE, anchorX: 'center', anchorY: 'middle', color: '#FFE38A',
        outlineWidth: 0, outlineBlur: '45%', outlineColor: '#FFB000', fillOpacity: 0, outlineOpacity: 0 });
      t.material = new MeshBasicMaterial({ transparent: true, depthTest: false, toneMapped: false });
      t.renderOrder = 20; t.visible = false;
      group.add(t);
      return t;
    });
    numbersRef.current = list;
    return () => {
      list.forEach((t) => { group.remove(t); t.dispose(); }); numbersRef.current = [];
      glyphs.forEach((g) => { group.remove(g); g.material.dispose(); }); glyphsRef.current = []; // symbol geometries are shared
    };
  }, []);
  const arrow = useRef<ArrowHelper>(null);
  const preview = import.meta.env.MODE === 'test' && new URLSearchParams(location.search).has('surface-preview');
  const live = useCallback(() => {
    const state = useDice.getState();
    const expected = state.dice.length, selection = state.dice.join(',');
    const registered = bodies.current.filter((b): b is RapierRigidBody => b !== null && b.isValid() && (b.userData as { selection?: string } | undefined)?.selection === selection);
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
    const numbers = numbersRef.current, glyphs = glyphsRef.current;
    const state = useDice.getState(), phase = state.gesture.phase;
    const marker = arrow.current!;
    const current = live();
    marker.visible = !preview && !!current && (phase === 'hand' || phase === 'charging');
    if (!current) return;
    const now = performance.now(), dt = Math.max(0.0001, Math.min(elapsed, 0.1));
    const identity = state.dice.join(',');
    const active = phase === 'hand' || phase === 'charging';
    const nextMode = active ? `${identity}-hand` : `${identity}-${phase}`;
    const setOpacity = (opacity: number) => {
      for (let i = 0; i < current.length; i++) scene.getObjectByName(`die-${i}`)?.traverse((object) => {
        if (object instanceof Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.opacity = opacity;
      });
    };
    const shadows = (on: boolean) => { for (let i = 0; i < current.length; i++) shade(scene.getObjectByName(`gem-${i}`), on); };
    if (active && mode.current !== nextMode) {
      shadows(true);
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
    if (phase !== 'settled') for (const o of [...numbers, ...glyphs]) o.visible = false;
    if (phase === 'settled' && (mode.current !== nextMode || (state.reducedMotion && showcase.current?.still === false))) {
      showcase.current = null;
      if (!state.raw) state.setShowcased(state.throwId);
      else {
        const raw = state.raw;
        const polys = state.dice.map((d) => polyhedron(d));
        const from = current.map((body) => {
          const p = body.translation(), q = body.rotation();
          return { p: [p.x, p.y, p.z] as Vec3, q: [q.x, q.y, q.z, q.w] as Quat };
        });
        const cam = camera as PerspectiveCamera;
        // The values the panel shows, from the simulation: never re-read a die that stopped near an edge.
        // Reduced motion: dice stay where they landed and the number only fades in above them.
        const still = state.reducedMotion;
        const to = still ? from : showcasePoses(polys, raw,
          { position: cam.position, quaternion: cam.quaternion, fov: cam.fov, aspect: cam.aspect });
        const kraken = krakenIndices(state.omen?.throwId === state.throwId ? state.omen : null, state.dice);
        const hero = kraken.length ? krakenHeroPoses(kraken.map((i) => polys[i]), kraken.map((i) => raw[i]),
          { position: cam.position, quaternion: cam.quaternion, fov: cam.fov, aspect: cam.aspect }) : [];
        const marks = polys.map((poly, i) => {
          const label = poly.labelList.find((l) => l.value === raw[i])!;
          const normal = new Vector3(...label.normal), up = new Vector3(...label.up);
          const local = new Vector3(...label.position).addScaledVector(normal, 0.03);
          const turn = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(up, normal), up, normal));
          // Coins raise their name; Vampire faces raise their symbol, or the value on a blank face.
          const symbol = poly.shape !== 'coin' && label.symbol;
          if (symbol) glyphs[i].geometry = symbolGeometry(symbol);
          else numbers[i].text = label.text || String(raw[i]);
          numbers[i].visible = !symbol; glyphs[i].visible = !!symbol;
          return {
            local, turn,
            start: new Vector3(...from[i].p).add(new Vector3(0, poly.radius + 0.35, 0)),
            face: new Vector3(...from[i].p).add(new Vector3(0, poly.radius + 0.35, 0)),
            scale: still || poly.shape === 'coin' ? 1 : FONT[poly.shape] / HL_SIZE,
          };
        });
        showcase.current = { at: now, throwId: state.throwId, from, to, hero, kraken, omenAt: state.omenAt, marks, still, gems: current.map((_, i) => scene.getObjectByName(`gem-${i}`)) };
        if (still) state.setShowcased(state.throwId);
      }
    }
    mode.current = nextMode;
    if (phase === 'settled' && showcase.current) {
      // An omen plays first: the numbers wait, unrisen, and the dice stay where they landed until it is over.
      const waiting = state.omen?.throwId === state.throwId && state.omenDone !== state.throwId;
      if (waiting) showcase.current.at = now;
      const { at, from, to, throwId, gems, marks, still, hero, kraken, omenAt } = showcase.current;
      const draw = (i: number, face: Vector3, q?: Quaternion, ride = 0, ascension?: number) => {
        const n = numbers[i], g = glyphs[i], m = marks[i];
        const h = still ? { p: m.start, opacity: Math.min(1, (now - at) / 150), glow: 0.6, scale: 1 } : highlightAt(now - at, i, m.start, face, m.scale);
        if (ascension !== undefined) {
          h.p = face; h.opacity = easeOut(span(ascension, KRAKEN.launch + 200, KRAKEN.reveal));
          h.scale = m.scale + (1.6 - m.scale) * krakenAt(ascension).hero;
          h.glow = h.opacity * 0.85;
        }
        Object.assign(n, { fillOpacity: h.opacity, outlineOpacity: h.glow });
        g.material.opacity = h.opacity;
        n.scale.setScalar(h.scale); g.scale.setScalar(h.scale * HL_SIZE * SYMBOL); // a symbol is 1 unit tall, a numeral HL_SIZE
        // Faces the viewer while it floats; once it rides the die it lies on the face, exactly over the die's own mark.
        const facing = q ? camera.quaternion.clone().slerp(q.clone().multiply(m.turn), ride) : camera.quaternion;
        for (const o of [n, g]) { o.position.copy(h.p); o.quaternion.copy(facing); }
      };
      if (still) { marks.forEach((m, i) => draw(i, m.face)); return; }
      let done = !waiting;
      current.forEach((body, i) => {
        if (state.dice[i] === 'coin') {
          const t = Math.min(1, Math.max(0, (now - at - SHOW.delay - i * SHOW.stagger) / SHOW.duration));
          if (t < 1) done = false;
          // The coin stays on the tray; only its Cara/Coroa caption rises to the result row.
          const p = new Vector3(...from[i].p), q = new Quaternion(...from[i].q);
          body.setTranslation(p, false); body.setRotation(q, false);
          body.setNextKinematicTranslation(p); body.setNextKinematicRotation(q);
          draw(i, new Vector3(...to[i].p));
          return;
        }
        const critical = kraken.indexOf(i);
        if (critical >= 0) {
          const ms = now - omenAt, pose = krakenFlightAt(ms, from[i], hero[critical], to[i]);
          const p = new Vector3(...pose.p), q = new Quaternion(...pose.q);
          shade(gems[i], ms <= KRAKEN.launch);
          body.setTranslation(p, false); body.setRotation(q, false);
          body.setNextKinematicTranslation(p); body.setNextKinematicRotation(q);
          draw(i, marks[i].local.clone().applyQuaternion(q).add(p), q, 1, ms);
          if (ms < KRAKEN.restored) done = false;
          return;
        }
        const t = Math.min(1, Math.max(0, (now - at - SHOW.delay - i * SHOW.stagger) / SHOW.duration));
        if (t < 1) done = false;
        shade(gems[i], t === 0); // the shadow goes away as the die lifts off
        const e = easeOut(t);
        const p = new Vector3(...from[i].p).lerp(new Vector3(...to[i].p), e);
        p.y += Math.sin(Math.PI * t) * 0.6; // small lift so the flight reads as an arc, not a slide
        const q = new Quaternion(...from[i].q).slerp(new Quaternion(...to[i].q), e);
        // Landed: pin the exact pose every frame (physics steps can lag frames on slow GPUs).
        if (t === 1) { body.setTranslation(p, false); body.setRotation(q, false); }
        body.setNextKinematicTranslation(p);
        body.setNextKinematicRotation(q);
        draw(i, marks[i].local.clone().applyQuaternion(q).add(p), q, Math.min(1, t / 0.35)); // the rolled numeral where the die is now
      });
      // Report "shown" one frame after landing, once the scene has rendered the pinned poses.
      if (done && showcase.current.landed && state.showcased !== throwId) state.setShowcased(throwId);
      if (done) showcase.current.landed = true;
      return;
    }
    if (phase === 'returning' && returning.current) {
      // Every die must be here before the hand is declared back: one still registering would be left where it landed.
      if (current.length < state.dice.length) return;
      const t = Math.min(1, (now - returning.current.at) / (state.reducedMotion ? 150 : 400));
      const ease = state.reducedMotion ? 1 : 1 - (1 - t) ** 3;
      const positions = handPositions(current.length, clampHandX(state.aim[0], current.length));
      current.forEach((body, i) => {
        const from = returning.current!.poses[i];
        const p = new Vector3(...from.p).lerp(new Vector3(...positions[i]), ease);
        const q = new Quaternion(...from.q).slerp(new Quaternion(), ease);
        // Publish "hand" only after Rapier has the exact final pose, even if its last step lagged a frame.
        if (state.reducedMotion || t === 1) { body.setTranslation(p, true); body.setRotation(q, true); }
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

  return <>
    <arrowHelper ref={arrow} />
    <group ref={numbersGroup} name="result-highlights" />
  </>;
}
