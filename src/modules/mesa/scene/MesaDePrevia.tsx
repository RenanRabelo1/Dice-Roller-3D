import { useEffect, useRef, useState } from 'react';
import { Box3, Sphere, Vector3, type PerspectiveCamera } from 'three';
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
  const { scene, invalidate, camera, size } = useThree();
  const controles = useRef<{ update: () => void } | null>(null);
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

  // Frames the built table (base, frame and felt; not the backdrop plane, which is far bigger), seen from above at 35° of
  // elevation: its bounding sphere fits the narrower of the two view angles, so it never spills, whatever the window's shape
  // or the turn. Before the table is built, the play area (GUIDE) stands in. Re-frames on resize and when the table changes.
  const aspecto = size.width / size.height || 1;
  const fov = (camera as PerspectiveCamera).fov;
  useEffect(() => {
    const caixa = new Box3();
    if (table) table.traverse((o) => { if ('isMesh' in o && o.visible && !/^fundo/i.test(o.name)) caixa.expandByObject(o); });
    if (caixa.isEmpty()) caixa.setFromCenterAndSize(new Vector3(...GUIDE.center), new Vector3(...GUIDE.size));
    const esfera = caixa.getBoundingSphere(new Sphere());
    const elevacao = 35 * Math.PI / 180;
    const meioV = fov * Math.PI / 360, meioH = Math.atan(Math.tan(meioV) * aspecto);
    const d = (esfera.radius / Math.sin(Math.min(meioV, meioH))) * 0.95;
    const c = esfera.center;
    camera.position.set(c.x, c.y + d * Math.sin(elevacao), c.z + d * Math.cos(elevacao));
    camera.lookAt(c);
    (controles.current as { target?: Vector3 } | null)?.target?.copy(c);
    controles.current?.update();
    invalidate();
  }, [camera, aspecto, fov, table, invalidate]);

  useEffect(() => { invalidate(); }, [table, bg, invalidate]);

  return (
    <>
      {bg.kind === 'color' && <color attach="background" args={[bg.color]} />}
      <ambientLight intensity={0.9} /> {/* the scene also has an environment map (the shell's Lightformers); the window has none, so more ambient */}
      <directionalLight position={[4, 10, 6]} intensity={2.5} color="#fff1dc" />
      {table && <primitive object={table} />}
      <OrbitControls ref={controles as never} enableZoom={false} enablePan={false} autoRotate={gira} autoRotateSpeed={0.6}
        onChange={leve ? () => invalidate() : undefined} />
    </>
  );
}
