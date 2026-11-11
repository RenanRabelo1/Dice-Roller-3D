import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { MATERIAL, trayColliders } from '../physics/world';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group, Object3D } from 'three';
import { useDice } from '../store';
import { krakenAt, krakenIndices } from './krakenMotion';
import { buildDefault, colorsOf, disposeTable, SURFACE } from './tableBuild';
import { useTable } from './tableState';

// The tray's colliders are always trayColliders(); what you see comes from the active table theme (a default
// build, or an imported .glb fitted to the same play area).
export function Tray() {
  const theme = useTable((s) => s.theme);
  const { gl, camera, scene } = useThree();
  const texture = typeof theme.felt.texture === 'string' ? theme.felt.texture : 'liso';
  const slow = !!theme.model || typeof theme.felt.texture === 'object'; // needs decoding before it can show
  // The default table shows at once (also while a slower one loads, and if that one fails).
  const quick = useMemo(() => buildDefault({ ...theme, felt: { ...theme.felt, texture } }), [theme.felt.color, texture, theme.wood.color]); // eslint-disable-line react-hooks/exhaustive-deps
  const [loaded, setLoaded] = useState<{ theme: typeof theme; group: Group } | null>(null);
  useEffect(() => () => disposeTable(quick), [quick]);
  useEffect(() => {
    if (!slow) return;
    let alive = true;
    // Compile its shaders off the main thread before it replaces the table, so the swap never stalls a frame.
    import('./tableFile').then((m) => m.buildFor(theme)).then(async (group) => { await gl.compileAsync(group, camera, scene).catch(() => {}); return group; }).then((group) => { if (alive) setLoaded({ theme, group }); else disposeTable(group); }, () => { if (alive) setLoaded(null); });
    return () => { alive = false; };
  }, [theme, slow, gl, camera, scene]);
  useEffect(() => () => { if (loaded) disposeTable(loaded.group); }, [loaded]);
  const table: Object3D = slow && loaded?.theme === theme ? loaded.group : quick;
  useEffect(() => { useTable.getState().setColors(colorsOf(table) ?? { felt: theme.felt.color, wood: theme.wood.color }); }, [table, theme]);
  const surface = useRef<Object3D>(table);
  useEffect(() => { surface.current = table.getObjectByName(SURFACE) ?? table; }, [table]);
  useFrame(() => {
    const s = useDice.getState();
    const live = s.gesture.phase === 'settled' && s.omen?.throwId === s.throwId && s.omenDone !== s.throwId;
    surface.current.visible = !(live && krakenIndices(s.omen, s.dice).length && krakenAt(performance.now() - s.omenAt).broken);
  });
  return (
    <RigidBody type="fixed" colliders={false}>
      {trayColliders().map(({ kind, center, half }, i) => (
        <CuboidCollider key={i} args={half} position={center}
          {...(kind === 'floor' ? MATERIAL.velvet : MATERIAL.wall)} />
      ))}
      <primitive object={table} />
    </RigidBody>
  );
}
