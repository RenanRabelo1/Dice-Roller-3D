import { ColisoresDaBandeja } from '../../arremesso/cena.ts';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { Group, Object3D } from 'three';
import { buildDefault, colorsOf, disposeTable, SURFACE } from '../domain/tableBuild.ts';
import { setColors } from '../store.ts';
import { useMesa } from '../ui/useMesa.tsx';
import { registrarPiso } from './piso.ts';

// The tray's colliders are always trayColliders() (arremesso's ColisoresDaBandeja); what you see comes from the active table theme (a default
// build, or an imported .glb fitted to the same play area).
export function MesaNaCena() {
  const theme = useMesa((s) => s.theme);
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
    import('../domain/tableFile.ts').then((m) => m.buildFor(theme)).then(async (group) => { await gl.compileAsync(group, camera, scene).catch(() => {}); return group; }).then((group) => { if (alive) setLoaded({ theme, group }); else disposeTable(group); }, () => { if (alive) setLoaded(null); });
    return () => { alive = false; };
  }, [theme, slow, gl, camera, scene]);
  useEffect(() => () => { if (loaded) disposeTable(loaded.group); }, [loaded]);
  const table: Object3D = slow && loaded?.theme === theme ? loaded.group : quick;
  useEffect(() => { setColors(colorsOf(table) ?? { felt: theme.felt.color, wood: theme.wood.color }); }, [table, theme]);
  // The floor that the kraken hides (ocultarPiso): a new table's floor gets the right visibility at once (not a frame
  // later), and the one leaving the scene is left whole.
  useLayoutEffect(() => {
    const next = table.getObjectByName(SURFACE) ?? table;
    registrarPiso(next);
    return () => { registrarPiso(null); next.visible = true; };
  }, [table]);
  return (
    <ColisoresDaBandeja>
      <primitive object={table} />
    </ColisoresDaBandeja>
  );
}
