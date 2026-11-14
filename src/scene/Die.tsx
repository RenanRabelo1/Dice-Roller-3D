import { useCallback, useEffect, useMemo } from 'react';
import { ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { polyhedron } from '../modules/dados/index';
import { AparenciaDoDado } from '../modules/dados/cena';
import type { DieKind } from '../modules/regras/index';
import { MATERIAL } from '../physics/world';
import { vortexCenter } from '../throw/vortex';

// The die's physical body; what it looks like is `dados`' AparenciaDoDado.
export function Die({ index, kind, selection, count, register }: {
  index: number; kind: DieKind; selection: string; count: number;
  register: (index: number, body: RapierRigidBody | null) => void;
}) {
  const registerBody = useCallback((body: RapierRigidBody | null) => register(index, body), [index, register]);
  // Rapier's callback ref reports creation only; explicitly remove disposed bodies.
  useEffect(() => () => register(index, null), [index, register]);
  const model = polyhedron(kind);
  const points = useMemo(() => model.points.flat(), [model]);
  // No CCD: the scene's dice are always kinematic (the throw is simulated offline, presim.ts has its own CCD). With CCD a
  // kinematic die stops at the tray's invisible walls on its way back from the result row and then snaps to the hand.
  return (
    <RigidBody ref={registerBody} type="kinematicPosition" colliders={false}
      userData={{ selection }} position={vortexCenter(count, 0)}>
      <ConvexHullCollider args={[points]} {...MATERIAL.die} />
      <AparenciaDoDado index={index} kind={kind} />
    </RigidBody>
  );
}
