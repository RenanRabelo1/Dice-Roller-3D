import type { ReactNode } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { MATERIAL, trayColliders } from '../domain/world.ts';

// The tray's fixed body: always trayColliders(). What you see (the table) comes in as children, so it stays a child
// of this same body.
export function ColisoresDaBandeja({ children }: { children?: ReactNode }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {trayColliders().map(({ kind, center, half }, i) => (
        <CuboidCollider key={i} args={half} position={center}
          {...(kind === 'floor' ? MATERIAL.velvet : MATERIAL.wall)} />
      ))}
      {children}
    </RigidBody>
  );
}
