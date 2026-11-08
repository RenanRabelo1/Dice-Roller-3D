import { useCallback, useEffect, useMemo } from 'react';
import { MeshTransmissionMaterial, Text } from '@react-three/drei';
import { ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Vector3, type Texture } from 'three';
import { bodiesFor, polyhedron, type DieKind, type Label, type LabelSet, type Shape } from '../dice/polyhedra';
import { handPositions, MATERIAL } from '../physics/world';
import { useDice } from '../store';

// Kept alongside Die as the scene's specified gem palette.
// oxlint-disable-next-line react/only-export-components
export const GEM: Record<DieKind, string> = {
  d4: '#1F9D63', d6: '#C0182E', d8: '#1F4FB8', d10: '#E0A21B',
  d12: '#8B4FC9', d20: '#E8F1F8', d100: '#E7B416',
};
const FONT: Record<Shape, number> = { d4: 0.33, d6: 0.48, d8: 0.36, d10: 0.32, d12: 0.34, d20: 0.42 };

function SurfaceLabel({ label, size }: { label: Label; size: number }) {
  const normal = new Vector3(...label.normal);
  const up = new Vector3(...label.up);
  const right = new Vector3().crossVectors(up, normal);
  const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, up, normal));
  const position = new Vector3(...label.position).addScaledVector(normal, 0.002);
  return (
    <Text position={position} quaternion={quaternion} fontSize={size}
      font="/fonts/bricolage-grotesque-800.woff" characters="0123456789."
      color="#D4A93F" depthOffset={-1} userData={{ diceLabel: true }}
      outlineWidth="2%" outlineColor="#140E10"
      material-toneMapped={false}>
      {label.text}
    </Text>
  );
}

export function Die({ index, shape, labels, color, buffer, register, samples = 6 }: {
  index: number; shape: Shape; labels: LabelSet; color: string; buffer: Texture;
  register: (index: number, body: RapierRigidBody | null) => void; samples?: number;
}) {
  const kind = useDice((state) => state.kind);
  const count = useDice((state) => state.count);
  const registerBody = useCallback((body: RapierRigidBody | null) => register(index, body), [index, register]);
  // Rapier's callback ref reports creation only; explicitly remove disposed bodies.
  useEffect(() => () => register(index, null), [index, register]);
  const model = polyhedron(shape, labels);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(model.triangles, 3));
    result.computeVertexNormals();
    return result;
  }, [model]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const points = useMemo(() => model.points.flat(), [model]);
  return (
    <RigidBody ref={registerBody} type="kinematicPosition" colliders={false}
      ccd position={handPositions(bodiesFor(kind, count).length, 0)[index]}>
      <ConvexHullCollider args={[points]} {...MATERIAL.die} />
      <group name={`die-${index}`}>
        <mesh name={`gem-${index}`} geometry={geometry} castShadow receiveShadow>
          <MeshTransmissionMaterial buffer={buffer} color={color} samples={samples}
            transmission={0.9} thickness={0.6} ior={1.6} chromaticAberration={0.06} roughness={0.05} transparent />
        </mesh>
        {model.labelList.map((label, i) => (
          <SurfaceLabel key={i} label={label} size={labels === 'tens' ? 0.39 : FONT[shape]} />
        ))}
      </group>
    </RigidBody>
  );
}
