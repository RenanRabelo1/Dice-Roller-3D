import { useCallback, useEffect, useMemo } from 'react';
import { BatchedText, Text } from 'troika-three-text';
import { ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { polyhedron, type DieKind, type Label, type Polyhedron, type Shape } from '../dice/polyhedra';
import { symbolGeometry } from '../dice/symbols';
import { handPositions, MATERIAL } from '../physics/world';

// Kept alongside Die as the scene's specified gem palette.
// oxlint-disable-next-line react/only-export-components
export const GEM: Record<DieKind, string> = {
  d4: '#1F9D63', d6: '#C0182E', d8: '#1F4FB8', d10: '#E0A21B',
  d12: '#8B4FC9', d20: '#E8F1F8', d100: '#7FD3D8',
  vtm: '#231C20', hunger: '#8E0F1C', fire: '#E8571B', coin: '#C8962C',
};
const EMBER: Partial<Record<DieKind, string>> = { fire: '#FF4D00' }; // the fire die glows a little on its own
export const FONT_URL = '/fonts/bricolage-grotesque-800.woff';
// Sized to each face: d4/d6 were right; the rest were crowding their faces.
// oxlint-disable-next-line react/only-export-components
export const FONT: Record<Shape, number> = { d4: 0.33, d6: 0.48, d8: 0.32, d10: 0.28, d12: 0.29, d20: 0.28, d100: 0.13, coin: 0.27 };
export const SYMBOL = 1.35; // height of a face symbol, in numeral font sizes
// Light gems (topaz, crystal, citrine) get dark numerals; dark gems keep gold.
type Ink = { color: string; outline?: string };
const DARK: Ink = { color: '#1B1A16' }; // no outline: at this size a dark outline turns into noise
const INK: Partial<Record<DieKind, Ink>> = {
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
function useNumbers(model: Polyhedron, size: number, ink: Ink) {
  const batch = useMemo(() => {
    if (model.labelList.some((l) => l.symbol)) {
      const anchors = model.labelList.map((label) => { const o = place(new Object3D(), label); o.scale.setScalar(size * SYMBOL); o.updateMatrix(); return o; });
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
  }, [model, size, ink]);
  useEffect(() => () => batch.dispose(), [batch]);
  return batch;
}

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
  const numbers = useNumbers(model, FONT[model.shape], INK[kind] ?? GOLD);
  return (
    <RigidBody ref={registerBody} type="kinematicPosition" colliders={false}
      userData={{ selection }} ccd position={handPositions(count, 0)[index]}>
      <ConvexHullCollider args={[points]} {...MATERIAL.die} />
      <group name={`die-${index}`}>
        <mesh name={`gem-${index}`} geometry={geometry} castShadow receiveShadow>
          {/* Gem look without a refraction pass: clearcoat + env reflections + slight translucency. The coin is solid gold. */}
          {kind === 'coin' ? <meshPhysicalMaterial color={color} metalness={1} roughness={0.32} envMapIntensity={0.75} transparent opacity={1} />
            : <meshPhysicalMaterial color={color} roughness={0.08} clearcoat={1} clearcoatRoughness={0.04}
              ior={1.6} specularIntensity={1} transparent opacity={0.88} emissive={EMBER[kind] ?? '#000000'} emissiveIntensity={0.35} />}
        </mesh>
        <primitive object={numbers} />
      </group>
    </RigidBody>
  );
}
