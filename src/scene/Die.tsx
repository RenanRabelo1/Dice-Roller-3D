import { useCallback, useEffect, useMemo, useState } from 'react';
import { BatchedText, Text } from 'troika-three-text';
import { ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, Object3D, Vector3, type Material } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { customDie, isCustom, type CustomDie } from '../dice/custom';
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
export const gemColor = (kind: DieKind): string => (isCustom(kind) ? customDie(kind)?.color ?? GEM[baseOf(kind) as BuiltinKind] : GEM[kind]);
const EMBER: Partial<Record<string, string>> = { fire: '#FF4D00' }; // the fire die glows a little on its own
export const FONT_URL = '/fonts/bricolage-grotesque-800.woff';
// Sized to each face: d4/d6 were right; the rest were crowding their faces.
// oxlint-disable-next-line react/only-export-components
export const FONT: Record<Shape, number> = { d4: 0.33, d6: 0.48, d8: 0.32, d10: 0.28, d12: 0.29, d20: 0.28, d100: 0.13, coin: 0.27 };
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

const GemMaterial = ({ kind, color }: { kind: DieKind; color: string }) => (
  // Gem look without a refraction pass: clearcoat + env reflections + slight translucency. The coin is solid gold.
  kind === 'coin' ? <meshPhysicalMaterial color={color} metalness={1} roughness={0.32} envMapIntensity={0.75} transparent opacity={1} />
    : <meshPhysicalMaterial color={color} roughness={0.08} clearcoat={1} clearcoatRoughness={0.04}
      ior={1.6} specularIntensity={1} transparent opacity={0.88} emissive={EMBER[kind] ?? '#000000'} emissiveIntensity={0.35} />
);

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
  const custom = isCustom(kind) ? customDie(kind) : undefined;
  const file = useModel(custom);
  const numbers = useNumbers(model, FONT[model.shape], INK[kind] ?? INK[model.shape] ?? GOLD, !!custom?.printed);
  return (
    <RigidBody ref={registerBody} type="kinematicPosition" colliders={false}
      userData={{ selection }} ccd position={vortexCenter(count, 0)}>
      <ConvexHullCollider args={[points]} {...MATERIAL.die} />
      <group name={`die-${index}`}>
        {custom ? (
          // gem-i is a group here (a GLB has many meshes): shadows are toggled on its meshes with traverse.
          <group name={`gem-${index}`}>
            {file?.object ? <primitive object={file.object} position={custom.fit.center.map((c) => -c * custom.fit.scale)} scale={custom.fit.scale} />
              : file?.geometry ? <mesh geometry={file.geometry} position={custom.fit.center.map((c) => -c * custom.fit.scale) as Vec3} scale={custom.fit.scale} castShadow receiveShadow><GemMaterial kind={kind} color={color} /></mesh>
                : <mesh geometry={geometry} castShadow receiveShadow><GemMaterial kind={kind} color={color} /></mesh>}
          </group>
        ) : (
          <mesh name={`gem-${index}`} geometry={geometry} castShadow receiveShadow><GemMaterial kind={kind} color={color} /></mesh>
        )}
        <primitive object={numbers} />
      </group>
    </RigidBody>
  );
}
