import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { BatchedText, Text } from 'troika-three-text';
import { ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { BufferGeometry, Color, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, Object3D, Vector3, type BufferAttribute, type Group, type Material, type MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { customDie, customKind, finishOf, inkColorOf, isCustom, type CustomDie, type Finish } from '../dice/custom';
import { useDice } from '../store';
import { baseOf, polyhedron, type BuiltinKind, type DieKind, type Label, type Polyhedron, type Shape } from '../dice/polyhedra';
import { symbolGeometry } from '../dice/symbols';
import { MATERIAL, type Vec3 } from '../physics/world';
import { vortexCenter } from '../throw/vortex';

// Kept alongside Die as the scene's specified gem palette.
// oxlint-disable-next-line react/only-export-components
export const GEM: Record<BuiltinKind, string> = {
  d4: '#1F9D63', d6: '#C0182E', d8: '#1F4FB8', d10: '#E0A21B',
  d12: '#8B4FC9', d20: '#E8F1F8', d100: '#7FD3D8',
  vtm: '#231C20', hunger: '#8E0F1C', fire: '#E8571B', coin: '#C8962C',
};
// An imported die wears the colour the player picked (STL), or the gem colour of its base.
// oxlint-disable-next-line react/only-export-components
export const gemColor = (kind: DieKind): string => (isCustom(kind) ? customDie(kind)?.color ?? GEM[baseOf(kind) === 'livre' ? 'd20' : (baseOf(kind) as BuiltinKind)] : GEM[kind]);
const EMBER: Partial<Record<string, string>> = { fire: '#FF4D00' }; // the fire die glows a little on its own
export const FONT_URL = '/fonts/bricolage-grotesque-800.woff';
// Sized to each face: d4/d6 were right; the rest were crowding their faces.
// oxlint-disable-next-line react/only-export-components
export const FONT: Record<Shape, number> = { d4: 0.33, d6: 0.48, d8: 0.32, d10: 0.28, d12: 0.29, d20: 0.28, d100: 0.13, coin: 0.27, livre: 0.3 };
export const SYMBOL = 1.35; // height of a face symbol, in numeral font sizes
// Light gems (topaz, crystal, citrine) get dark numerals; dark gems keep gold.
type Ink = { color: string; outline?: string };
const DARK: Ink = { color: '#1B1A16' }; // no outline: at this size a dark outline turns into noise
const INK: Partial<Record<string, Ink>> = {
  d10: DARK, d20: DARK, d100: DARK,
  vtm: { color: '#C8102E' }, hunger: { color: '#0E0A0B' }, fire: { color: '#FFF1A8', outline: '#7A1E00' },
  coin: { color: '#4A2F06' }, // struck into the gold
};
const GOLD: Ink = { color: '#D4A93F', outline: '#140E10' };

// Sits `o` on its face, upright; tests read what the face shows from userData.
function place<T extends Object3D>(o: T, label: Label): T {
  const normal = new Vector3(...label.normal), up = new Vector3(...label.up);
  o.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(new Vector3().crossVectors(up, normal), up, normal));
  o.position.set(...label.position).addScaledVector(normal, 0.002);
  Object.assign(o.userData, { text: label.symbol ?? label.text, value: label.value });
  return o;
}

// One object per die, so its faces cost a single draw call (was one draw per number):
// a BatchedText with every number or, on a symbol die, one mesh with every symbol merged.
function useNumbers(model: Polyhedron, size: number, ink: Ink, printed: boolean) {
  const batch = useMemo((): Object3D & { dispose(): void } => {
    if (printed) {
      // The model carries its own numerals: only invisible anchors, so tests and the showcase still find a face by value.
      const anchors = model.labelList.map((label) => place(new Object3D(), label));
      anchors.forEach((a) => a.updateMatrix());
      return Object.assign(new Object3D(), { dispose: () => {}, userData: { labels: anchors } });
    }
    if (model.labelList.some((l) => l.symbol)) {
      const anchors = model.labelList.map((label) => { const o = place(new Object3D(), label); o.scale.setScalar(model.shape === 'coin' ? 1.02 : size * SYMBOL); o.updateMatrix(); return o; });
      const geometry = mergeGeometries(model.labelList.flatMap((l, i) => (l.symbol ? [symbolGeometry(l.symbol).clone().applyMatrix4(anchors[i].matrix)] : [])));
      const material = new MeshBasicMaterial({ color: ink.color, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const mesh = Object.assign(new Mesh(geometry, material), { dispose: () => { geometry.dispose(); material.dispose(); } });
      mesh.userData.labels = anchors;
      return mesh;
    }
    const b = new BatchedText();
    const texts: Text[] = [];
    b.depthOffset = -1;
    b.material = new MeshBasicMaterial({ toneMapped: false });
    for (const label of model.labelList) {
      const t = place(new Text(), label);
      Object.assign(t, { text: label.text, font: FONT_URL, fontSize: size, color: ink.color, anchorX: 'center', anchorY: 'middle', outlineWidth: ink.outline ? '2%' : 0, outlineColor: ink.outline ?? 0 });
      texts.push(t);
      b.add(t);
    }
    b.userData.labels = texts; // BatchedText keeps members out of the scene graph; tests read them here
    b.sync();
    return b;
  }, [model, size, ink, printed]);
  useEffect(() => () => batch.dispose(), [batch]);
  return batch;
}

// The player's model, parsed from the saved file (the loaders are a separate chunk) while the ideal solid stands in.
// STL gives a geometry for the gem material; GLB gives its own meshes, cloned so each die owns its materials.
function useModel(die: CustomDie | undefined) {
  const [model, setModel] = useState<{ id: string; geometry?: BufferGeometry; object?: Object3D } | null>(null);
  useEffect(() => {
    if (!die) return;
    let live = true, clone: Object3D | undefined;
    void import('../dice/importer').then((m) => m.modelObject(die)).then((source) => {
      if (!live) return;
      if (die.file.format === 'stl') { setModel({ id: die.id, geometry: (source as Mesh).geometry }); return; }
      clone = source.clone(true);
      clone.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        o.castShadow = o.receiveShadow = true;
        const own = (Array.isArray(o.material) ? o.material : [o.material]).map((m: Material) => { const c = m.clone(); c.transparent = true; return c; });
        o.material = Array.isArray(o.material) ? own : own[0];
      });
      setModel({ id: die.id, object: clone });
    }, () => { /* keep showing the ideal solid */ });
    return () => {
      live = false;
      clone?.traverse((o) => { if (o instanceof Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) (m as Material).dispose(); });
    };
  }, [die]);
  return die && model?.id === die.id ? model : null;
}

// Colour of every vertex of a model with engraved numerals: `outside` away from them, `ink` on them.
// `mask` has one entry per triangle, and triangle t owns vertices 3t..3t+2 (the model is non-indexed).
function paintInto(attr: BufferAttribute, mask: Uint8Array, outside: string, ink: string) {
  const out = new Color(outside), inside = new Color(ink), a = attr.array as Float32Array;
  mask.forEach((m, t) => { const c = m ? inside : out; for (let v = 0; v < 3; v++) c.toArray(a, (t * 3 + v) * 3); });
  attr.needsUpdate = true;
}

// An STL with painted numerals: its own colour attribute (sharing the model's positions and normals), rewritten when the
// ink or the gem colour changes. Null when there is nothing to paint.
function usePainted(source: BufferGeometry | undefined, outside: string, ink: string | null) {
  const mask = source?.userData.ink as Uint8Array | undefined, inked = !!ink;
  const geometry = useMemo(() => {
    if (!source || !mask || !inked) return null;
    const g = new BufferGeometry();
    for (const name of ['position', 'normal']) { const a = source.getAttribute(name); if (a) g.setAttribute(name, a); }
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(mask.length * 9), 3));
    g.userData.ink = mask; // the same mask (tests read it)
    return g;
  }, [source, mask, inked]); // the colours are filled by the effect below
  useEffect(() => { if (geometry && mask && ink) paintInto(geometry.getAttribute('color') as BufferAttribute, mask, outside, ink); }, [geometry, mask, outside, ink]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry;
}

// A GLB with painted numerals: white outside them (the material's own colour shows), the ink inside, as a colour attribute
// on the geometry (the clones share it). A model that already has vertex colours of its own is left alone.
function paintGlb(root: Object3D, ink: string | null) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry as BufferGeometry, mask = g.userData.ink as Uint8Array | undefined, own = g.getAttribute('color');
    const paint = !!ink && !!mask && (!own || !!g.userData.painted);
    if (paint) {
      if (!own) { g.setAttribute('color', new Float32BufferAttribute(new Float32Array(mask.length * 9), 3)); g.userData.painted = true; }
      paintInto(g.getAttribute('color') as BufferAttribute, mask, '#ffffff', ink);
    }
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if ((m as MeshStandardMaterial).vertexColors !== paint) { (m as MeshStandardMaterial).vertexColors = paint; m.needsUpdate = true; }
    }
  });
}

const GemMaterial = ({ kind, color, finish = 'gema', painted = false }: { kind: DieKind; color: string; finish?: Finish; painted?: boolean }) => {
  // With painted numerals the colour lives in the vertices (white here), so the paint is not tinted.
  const tone = painted ? '#ffffff' : color, key = `${finish}${painted}`;
  // Gem look without a refraction pass: clearcoat + env reflections + slight translucency. The coin is solid gold.
  if (kind === 'coin') return <meshPhysicalMaterial color={color} metalness={1} roughness={0.32} envMapIntensity={0.75} transparent opacity={1} />;
  // Matte: opaque and rough, so a numeral cut into it reads. `transparent` stays on because the return animation fades opacity.
  if (finish === 'fosco') return <meshStandardMaterial key={key} color={tone} vertexColors={painted} roughness={0.8} metalness={0} transparent opacity={1} />;
  return (
    <meshPhysicalMaterial key={key} color={tone} vertexColors={painted} roughness={0.08} clearcoat={1} clearcoatRoughness={0.04}
      ior={1.6} specularIntensity={1} transparent opacity={0.88} emissive={EMBER[kind] ?? '#000000'} emissiveIntensity={0.35} />
  );
};

export function Die({ index, kind, selection, count, color, register }: {
  index: number; kind: DieKind; selection: string; count: number; color: string;
  register: (index: number, body: RapierRigidBody | null) => void;
}) {
  const registerBody = useCallback((body: RapierRigidBody | null) => register(index, body), [index, register]);
  // Rapier's callback ref reports creation only; explicitly remove disposed bodies.
  useEffect(() => () => register(index, null), [index, register]);
  const model = polyhedron(kind);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(model.triangles, 3));
    result.computeVertexNormals();
    return result;
  }, [model]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const points = useMemo(() => model.points.flat(), [model]);
  // Subscribed, so a change of ink or finish in "Meus dados" reaches the die at once.
  const custom = useDice((s) => (isCustom(kind) ? s.customs.find((d) => customKind(d.id) === kind) : undefined));
  const file = useModel(custom);
  const finish = custom ? finishOf(custom) : 'gema', ink = custom ? inkColorOf(custom, color) : null;
  const painted = usePainted(file?.geometry, color, ink);
  const gem = useRef<Group>(null);
  const { gl, camera, scene } = useThree();
  // A new material variant (painted numerals, matte) is compiled before it shows, so the first throw does not stall on it;
  // the ideal solid stands in meanwhile. The gem look and a plain model need no wait.
  const variant = file ? `${file.id}|${finish}|${!!ink}` : '';
  const [warm, setWarm] = useState('');
  const needsWarm = !!file && (!!ink || finish === 'fosco');
  useEffect(() => {
    if (!needsWarm || warm === variant || !gem.current) return;
    let live = true;
    void gl.compileAsync(gem.current, camera, scene).catch(() => {}).then(() => { if (live) setWarm(variant); });
    return () => { live = false; };
  }, [needsWarm, warm, variant, gl, camera, scene]);
  useEffect(() => { if (file?.object) paintGlb(file.object, ink); }, [file, ink]);
  const shown = !!file && (!needsWarm || warm === variant);
  const numbers = useNumbers(model, model.font ?? FONT[model.shape], INK[kind] ?? INK[model.shape] ?? GOLD, !!custom?.printed);
  return (
    <RigidBody ref={registerBody} type="kinematicPosition" colliders={false}
      userData={{ selection }} ccd position={vortexCenter(count, 0)}>
      <ConvexHullCollider args={[points]} {...MATERIAL.die} />
      <group name={`die-${index}`}>
        {custom ? (
          // gem-i is a group here (a GLB has many meshes): shadows are toggled on its meshes with traverse.
          <group name={`gem-${index}`} ref={gem}>
            {file?.object && <primitive object={file.object} visible={shown} position={custom.fit.center.map((c) => -c * custom.fit.scale)} scale={custom.fit.scale} />}
            {file?.geometry && <mesh geometry={painted ?? file.geometry} visible={shown} position={custom.fit.center.map((c) => -c * custom.fit.scale) as Vec3} scale={custom.fit.scale} castShadow receiveShadow><GemMaterial kind={kind} color={color} finish={finish} painted={!!painted} /></mesh>}
            <mesh geometry={geometry} visible={!shown} castShadow receiveShadow><GemMaterial kind={kind} color={color} /></mesh>
          </group>
        ) : (
          <mesh name={`gem-${index}`} geometry={geometry} castShadow receiveShadow><GemMaterial kind={kind} color={color} /></mesh>
        )}
        <primitive object={numbers} />
      </group>
    </RigidBody>
  );
}
