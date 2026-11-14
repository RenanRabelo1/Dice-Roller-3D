import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { Color, Group, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Vector3, type BufferGeometry, type Object3D, type PerspectiveCamera } from 'three';
import { Text } from 'troika-three-text';
import { customDie, FONT, FONT_URL, gemColor, inkColorOf, polyhedron, RADIUS, SYMBOL, symbolGeometry } from '../modules/dados/index';
import { isCustom, MAX_DICE } from '../modules/regras/index';
import { easeOut, type Pose, type Quat, type Vec3 } from '../shared/math';
import { movimentoReduzido } from '../shared/plataforma';
import { arremesso, registroDeCorpos } from '../modules/arremesso/index';
import { CAPTION, glowMesh, highlightAt, HL_SIZE, setShowcased, showcasePoses, SHOW, vitrine } from '../modules/vitrine/index';
import { indicesComPercurso, movimentoNoPresagio, presagio, presagioTocando } from '../modules/pressagios/index';

type Mark = { local: Vector3; turn: Quaternion; start: Vector3; face: Vector3; scale: number }; // local, turn: the rolled numeral's place and turn in die space

// An imported die's gem is a group (a GLB has many meshes), so the shadow switch goes on its meshes.
const shade = (gem: Object3D | undefined, on: boolean) => gem?.traverse((o) => { if (o instanceof Mesh) o.castShadow = on; });

// What the hand does once the dice have settled: the flight, the rolled numbers, the engraving's glow and the omen's
// wait. The throw part (input, aim, whirl, arrow, return) is arremesso's MaoDoArremesso, mounted right before this.
export function Hand() {
  const { camera, scene } = useThree();
  const mode = useRef('');
  const showcase = useRef<{ at: number; throwId: number; from: Pose[]; to: Pose[]; kraken: number[]; storm: number[]; omenAt: number; gems: (Object3D | undefined)[]; marks: Mark[]; above: boolean[]; glows: (Mesh | null)[]; still?: boolean; landed?: boolean } | null>(null);
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
  // The engraving that lights up on an engraved free-form die (see inkGlow); it lasts as long as the showcase.
  const dropGlows = () => {
    const glows = showcase.current?.glows;
    glows?.forEach((g, i) => { if (g) { g.removeFromParent(); (g.material as MeshBasicMaterial).dispose(); glows[i] = null; } });
  };
  const live = useCallback(() => {
    const state = arremesso();
    const expected = state.dice.length, selection = state.dice.join(',');
    const registered = registroDeCorpos.current.filter((b): b is RapierRigidBody => b !== null && b.isValid() && (b.userData as { selection?: string } | undefined)?.selection === selection);
    return state.ready && registered.length === expected ? registered : null;
  }, []);

  useFrame(() => {
    const numbers = numbersRef.current, glyphs = glyphsRef.current;
    const state = { ...arremesso(), ...presagio(), ...vitrine() }, phase = state.gesture.phase;
    const current = live();
    if (!current) return;
    const now = performance.now();
    const identity = state.dice.join(',');
    const active = phase === 'hand' || phase === 'charging';
    const nextMode = active ? `${identity}-hand` : `${identity}-${phase}`;
    if (phase !== 'settled') { for (const o of [...numbers, ...glyphs]) o.visible = false; dropGlows(); }
    if (phase === 'settled' && (mode.current !== nextMode || (movimentoReduzido() && showcase.current?.still === false))) {
      // Reduced motion switched on mid-show: the dice go back to where they landed instead of hanging mid-flight.
      const landed = mode.current === nextMode ? showcase.current?.from : undefined;
      dropGlows();
      showcase.current = null;
      if (!state.raw) setShowcased(state.throwId);
      else {
        const raw = state.raw;
        const polys = state.dice.map((d) => polyhedron(d));
        const from = landed ?? current.map((body) => {
          const p = body.translation(), q = body.rotation();
          return { p: [p.x, p.y, p.z] as Vec3, q: [q.x, q.y, q.z, q.w] as Quat };
        });
        const cam = camera as PerspectiveCamera;
        // The values the panel shows, from the simulation: never re-read a die that stopped near an edge.
        // Reduced motion: dice stay where they landed and the number only fades in above them.
        const still = movimentoReduzido();
        // An engraved free-form die is seen from above, as it lay, and its engraving lights up.
        const above = state.dice.map((k, i) => !still && isCustom(k) && !!customDie(k)?.printed && !!polys[i].readsDown);
        const to = still ? from : showcasePoses(polys, raw,
          { position: cam.position, quaternion: cam.quaternion, fov: cam.fov, aspect: cam.aspect }, above);
        // A d100 1 is carried off and brought back by the kraken; a d100 100 drifts to you in the storm.
        const omenNow = state.omen?.throwId === state.throwId ? state.omen : null;
        const { kraken, tempestade: storm } = indicesComPercurso(omenNow, state.dice);
        const marks = polys.map((poly, i) => {
          const label = poly.labelList.find((l) => l.value === raw[i])!;
          const normal = new Vector3(...label.normal), up = new Vector3(...label.up);
          const local = new Vector3(...label.position).addScaledVector(normal, 0.03);
          const turn = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(up, normal), up, normal));
          // Coins show their name (under the coin); Vampire faces raise their symbol, or the value on a blank face.
          const symbol = poly.shape !== 'coin' && label.symbol;
          if (symbol) glyphs[i].geometry = symbolGeometry(symbol);
          else numbers[i].text = label.text || String(raw[i]);
          numbers[i].visible = !symbol; glyphs[i].visible = !!symbol;
          return {
            local, turn,
            start: new Vector3(...from[i].p).add(new Vector3(0, poly.radius + 0.35, 0)),
            face: new Vector3(...from[i].p).add(new Vector3(0, poly.radius + 0.35, 0)),
            scale: still ? 1 : poly.shape === 'coin' ? CAPTION.scale : (poly.font ?? FONT[poly.shape]) / HL_SIZE,
          };
        });
        const gems = current.map((_, i) => scene.getObjectByName(`gem-${i}`));
        const glows = above.map((a, i) => {
          if (!a) return null;
          const die = customDie(state.dice[i] as `custom:${string}`)!, group = scene.getObjectByName(`die-${i}`);
          const ink = inkColorOf(die, gemColor(state.dice[i]));
          const down = polys[i].labelList.find((l) => l.value === raw[i])!.normal;
          const glow = gems[i] && group ? glowMesh(gems[i], group, polys[i].faces, down, ink ? `#${new Color(ink).lerp(new Color('#FFE38A'), 0.6).getHexString()}` : '#FFE38A', `${state.dice[i]}|${raw[i]}`) : null;
          if (glow) { glow.name = `ink-glow-${i}`; group!.add(glow); numbers[i].visible = glyphs[i].visible = false; }
          else marks[i].scale = FONT.livre / HL_SIZE; // no engraving found: the number floats in front of the die
          return glow;
        });
        showcase.current = { at: now, throwId: state.throwId, from, to, kraken, storm, omenAt: state.omenAt, marks, above, glows, still, gems };
        if (still) setShowcased(state.throwId);
      }
    }
    mode.current = nextMode;
    if (phase === 'settled' && showcase.current) {
      // An omen plays first: the numbers wait, unrisen, and the dice stay where they landed until it is over.
      const waiting = presagioTocando();
      if (waiting) showcase.current.at = now;
      const { at, from, to, throwId, gems, marks, above, glows, still, kraken, storm, omenAt } = showcase.current;
      const draw = (i: number, face: Vector3, q?: Quaternion, ride = 0, reveal?: number) => {
        const n = numbers[i], g = glyphs[i], m = marks[i];
        const h = still ? { p: m.start, opacity: Math.min(1, (now - at) / 150), glow: 0.6, scale: 1 } : highlightAt(now - at, i, m.start, face, m.scale);
        if (reveal !== undefined) { // carried in by the kraken: the number lights up on the face as it arrives
          h.p = face; h.opacity = reveal; h.scale = m.scale + (1.4 - m.scale) * reveal; h.glow = reveal * 0.85;
        }
        Object.assign(n, { fillOpacity: h.opacity, outlineOpacity: h.glow });
        g.material.opacity = h.opacity;
        n.scale.setScalar(h.scale); g.scale.setScalar(h.scale * HL_SIZE * SYMBOL); // a symbol is 1 unit tall, a numeral HL_SIZE
        // Faces the viewer while it floats; once it rides the die it lies on the face, exactly over the die's own mark.
        const facing = q ? camera.quaternion.clone().slerp(q.clone().multiply(m.turn), ride) : camera.quaternion;
        for (const o of [n, g]) { o.position.copy(h.p); o.quaternion.copy(facing); }
      };
      const pin = (body: RapierRigidBody, p: Vector3, q: Quaternion) => {
        body.setTranslation(p, false); body.setRotation(q, false); body.setNextKinematicTranslation(p); body.setNextKinematicRotation(q);
      };
      if (still) {
        current.forEach((body, i) => { pin(body, new Vector3(...from[i].p), new Quaternion(...from[i].q)); shade(gems[i], true); });
        marks.forEach((m, i) => draw(i, m.face));
        return;
      }
      let done = !waiting;
      const under = new Vector3(0, -1, 0).applyQuaternion(camera.quaternion); // straight down the screen
      current.forEach((body, i) => {
        const ms = now - omenAt, movimento = movimentoNoPresagio(i, ms, from[i], to[i], kraken, storm);
        if (movimento) { // the omen moves this die, and leaves it at its result pose
          const p = new Vector3(...movimento.pose.p), q = new Quaternion(...movimento.pose.q);
          shade(gems[i], ms <= movimento.sombra);
          pin(body, p, q);
          draw(i, marks[i].local.clone().applyQuaternion(q).add(p), q, 1, movimento.revela);
          if (ms < movimento.fim) done = false;
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
        if (above[i]) { // seen from above: its engraving glows, or (none found) the number floats in front of it
          const glow = glows[i];
          if (glow) (glow.material as MeshBasicMaterial).opacity = t * highlightAt(now - at, i, marks[i].start, marks[i].face, marks[i].scale).glow;
          else draw(i, p.clone().addScaledVector(camera.position.clone().sub(p).normalize(), polyhedron(state.dice[i]).radius + 0.35));
          return;
        }
        // A coin comes up showing its drawing, and its Cara/Coroa stays under it, facing you.
        if (state.dice[i] === 'coin') draw(i, p.clone().addScaledVector(under, RADIUS.coin + CAPTION.gap));
        else draw(i, marks[i].local.clone().applyQuaternion(q).add(p), q, Math.min(1, t / 0.35)); // the rolled numeral where the die is now
      });
      // Report "shown" one frame after landing, once the scene has rendered the pinned poses.
      if (done && showcase.current.landed && state.showcased !== throwId) setShowcased(throwId);
      if (done) showcase.current.landed = true;
      return;
    }
  });

  return <group ref={numbersGroup} name="result-highlights" />;
}
