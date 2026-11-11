import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { MATERIAL, TRAY, trayColliders } from '../physics/world';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { omenPlaying, useDice } from '../store';
import { krakenAt, krakenIndices } from './krakenMotion';

export function Tray() {
  const surface = useRef<Group>(null);
  useFrame(() => {
    const s = useDice.getState();
    const live = omenPlaying(s);
    if (surface.current) surface.current.visible = !(live && krakenIndices(s.omen, s.dice).length && krakenAt(performance.now() - s.omenAt).broken);
  });
  return (
    <RigidBody type="fixed" colliders={false}>
      {trayColliders().map(({ kind, center, half }, i) => (
        <CuboidCollider key={i} args={half} position={center}
          {...(kind === 'floor' ? MATERIAL.velvet : MATERIAL.wall)} />
      ))}
      <group ref={surface} name="tray-surface">
        <mesh position={[0, -0.29, 0]} receiveShadow>
          <boxGeometry args={[15, 0.42, 10]} />
          <meshStandardMaterial color="#3B2416" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.04, 0]} receiveShadow>
          <boxGeometry args={[14, 0.08, 9]} />
          <meshStandardMaterial color="#3A0F1A" roughness={1} />
        </mesh>
      </group>
      {trayColliders().filter(({ kind }) => kind === 'wall').map(({ center, half }, i) => (
        <mesh key={i} position={[center[0], TRAY.wallHeight / 2, center[2]]} castShadow receiveShadow>
          <boxGeometry args={[half[0] * 2, TRAY.wallHeight, half[2] * 2]} />
          <meshStandardMaterial color="#3B2416" roughness={0.7} />
        </mesh>
      ))}
    </RigidBody>
  );
}
