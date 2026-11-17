// The window of the die's sheet (OS-0085): one die in a canvas of its own, spinning slowly and draggable.
// When the die changes it materialises (scale and opacity, a fast spin that slows down) over a gold flash; a change of
// any trait gives it a short pulse. Only transform and opacity animate, and nothing animates with reduced motion.
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import { polyhedron, RAIO_MAXIMO } from '../../dados/index.ts';
import { AparenciaDoDado } from '../../dados/cena.ts';
import type { DieKind } from '../../regras/index.ts';
import { movimentoReduzido, perfilLeve } from '../../../shared/plataforma/index.ts';

const FOV = 35;
const GIRO = 0.6; // rad/s, the slow spin
const GIRO_FORJA = 6; // rad/s when it materialises, slowing to GIRO in 700 ms
const FORJA_MS = 700;

function Dado({ kind, parado }: { kind: DieKind; parado: boolean }) {
  const grupo = useRef<Group>(null);
  const desde = useRef(0);
  const { clock, invalidate } = useThree();
  useEffect(() => { desde.current = clock.elapsedTime; invalidate(); }, [kind, clock, invalidate]);
  useFrame((_, dt) => {
    if (parado || !grupo.current) return;
    const t = (clock.elapsedTime - desde.current) * 1000;
    grupo.current.rotation.y += dt * (GIRO + (GIRO_FORJA - GIRO) * Math.max(0, 1 - t / FORJA_MS));
  });
  // The coin lies flat in its own frame: stand it up so its face looks at the camera.
  return <group ref={grupo}><group rotation={[polyhedron(kind).shape === 'coin' ? Math.PI / 2 : 0, 0, 0]}><AparenciaDoDado index={0} kind={kind} /></group></group>;
}

export function JanelaDoDado({ kind, pulso, nome }: { kind: DieKind; pulso: number; nome: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const lampejo = useRef<HTMLDivElement>(null);
  const parado = perfilLeve() || movimentoReduzido();
  const distancia = RAIO_MAXIMO * 3.8;

  // The die changed (and on the first mount): materialise it in the flash of the forge.
  useEffect(() => {
    if (movimentoReduzido()) return;
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const a = caixa.current?.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: ease, fill: 'backwards' });
    const b = lampejo.current?.animate([{ opacity: 0 }, { opacity: 0.5, offset: 0.35 }, { opacity: 0 }], { duration: 600, easing: ease });
    return () => { a?.cancel(); b?.cancel(); };
  }, [kind]);

  // A trait changed: a pulse of confirmation (not on the first render).
  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) { primeiro.current = false; return; }
    if (movimentoReduzido()) return;
    caixa.current?.animate([{ transform: 'none' }, { transform: 'scale(1.04)' }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
  }, [pulso]);

  return (
    <div className="janela-do-dado" role="img" aria-label={`Prévia de ${nome}`}>
      <div className="ficha-lampejo" ref={lampejo} aria-hidden="true" />
      <div className="ficha-dado" ref={caixa}>
        <Canvas camera={{ position: [0, distancia * 0.25, distancia], fov: FOV }} dpr={1} gl={{ alpha: true, antialias: true }} frameloop={perfilLeve() ? 'demand' : 'always'}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[3, 4, 3]} intensity={2.5} color="#fff1dc" />
          <Dado kind={kind} parado={parado} />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>
    </div>
  );
}
