import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import { movimentoReduzido, perfilLeve } from '../../../shared/plataforma/index.ts';
import { disposeTable, GUIDE } from '../domain/tableBuild.ts';
import { panoramaTexture } from '../domain/tableImages.ts';
import { useMesa } from '../ui/useMesa.tsx';

// What the preview window of the table chapter draws (OS-0082): the table of the current theme and its backdrop, with its own
// light (an approximation of the scene, not the scene). A photo or ready-made backdrop is the CSS behind the canvas (FundoCss).
export function MesaDePrevia() {
  const theme = useMesa((s) => s.theme);
  const { scene, invalidate } = useThree();
  const [table, setTable] = useState<Group | null>(null);
  const atual = useRef<Group | null>(null);
  const leve = perfilLeve();
  const gira = !leve && !movimentoReduzido();
  const bg = theme.background;

  // The colour picker fires on every move: rebuild 150 ms after the last change, and free the old table.
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      import('../domain/tableFile.ts').then((m) => m.buildFor(theme)).then((group) => {
        if (!alive) { disposeTable(group); return; }
        if (atual.current) disposeTable(atual.current);
        atual.current = group;
        setTable(group);
      }, () => {});
    }, 150);
    return () => { alive = false; clearTimeout(timer); };
  }, [theme]);
  useEffect(() => () => { if (atual.current) disposeTable(atual.current); atual.current = null; }, []);

  // The 360° panorama is the scene's background, with the theme's rotation, brightness and blur.
  useEffect(() => {
    if (bg.kind !== 'panorama') return;
    let alive = true;
    panoramaTexture(bg).then((tex) => {
      if (!alive) return;
      scene.background = tex;
      scene.backgroundRotation.set(0, bg.rotation * Math.PI / 180, 0);
      scene.backgroundIntensity = bg.intensity;
      scene.backgroundBlurriness = bg.blur;
      invalidate();
    }, () => {});
    return () => { alive = false; scene.background = null; };
  }, [bg, scene, invalidate]);

  useEffect(() => { invalidate(); }, [table, bg, invalidate]);

  return (
    <>
      {bg.kind === 'color' && <color attach="background" args={[bg.color]} />}
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 10, 6]} intensity={2.5} color="#fff1dc" />
      {table && <primitive object={table} />}
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={gira} autoRotateSpeed={0.6}
        target={[GUIDE.center[0], GUIDE.center[1], GUIDE.center[2]]} onChange={leve ? () => invalidate() : undefined} />
    </>
  );
}
