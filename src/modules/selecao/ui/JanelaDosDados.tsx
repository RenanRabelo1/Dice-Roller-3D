import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import { polyhedron, RAIO_MAXIMO } from '../../dados/index.ts';
import { AparenciaDoDado } from '../../dados/cena.ts';
import type { DieKind } from '../../regras/index.ts';
import { movimentoReduzido, perfilLeve } from '../../../shared/plataforma/index.ts';
import { parseDice } from '../domain/notacao.ts';

const POR_FILEIRA = 5;
const PASSO = RAIO_MAXIMO * 2 + 0.3;
const FOV = 35;

// Lays the dice in rows of up to 5, centred, and frames the widest row.
function Fileiras({ dice }: { dice: DieKind[] }) {
  const { camera, size, invalidate } = useThree();
  const parado = perfilLeve() || movimentoReduzido();
  const grupos = useRef<(Group | null)[]>([]);
  const fileiras = Math.max(1, Math.ceil(dice.length / POR_FILEIRA));
  const largura = Math.max(1, Math.min(dice.length, POR_FILEIRA)) * PASSO, altura = fileiras * PASSO;
  const metade = Math.tan((FOV * Math.PI) / 360);
  const distancia = Math.max(altura / 2, largura / 2 / (size.width / size.height || 1)) / metade + 1;

  useEffect(() => {
    camera.position.setLength(distancia);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, distancia, invalidate]);
  useEffect(() => { invalidate(); }, [dice, invalidate]);
  useFrame((_, dt) => { if (!parado) grupos.current.forEach((g) => { if (g) g.rotation.y += dt * 0.6; }); });

  return <>
    {dice.map((kind, i) => {
      const fila = Math.floor(i / POR_FILEIRA), naFila = Math.min(POR_FILEIRA, dice.length - fila * POR_FILEIRA);
      const x = (i % POR_FILEIRA - (naFila - 1) / 2) * PASSO, y = ((fileiras - 1) / 2 - fila) * PASSO;
      // Each die starts at its own phase.
      return <group key={i} ref={(g) => { grupos.current[i] = g; if (g && g.userData.fase === undefined) { g.userData.fase = 1; g.rotation.y = i * 1.1; } }} position={[x, y, 0]}>
        {/* The coin lies flat in its own frame: stand it up so its face looks at the camera. */}
        <group rotation={[polyhedron(kind).shape === 'coin' ? Math.PI / 2 : 0, 0, 0]}><AparenciaDoDado index={i} kind={kind} /></group>
      </group>;
    })}
  </>;
}

// Live preview of the notation being typed: the dice, spinning, in a small canvas of their own.
// A bad or empty notation shows an empty window; the error only goes to the log on submit.
export function JanelaDosDados({ texto }: { texto: string }) {
  const [dice, setDice] = useState<DieKind[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = texto.trim() ? parseDice(texto) : null;
      setDice(r && 'dice' in r ? r.dice : []);
    }, 150);
    return () => clearTimeout(t);
  }, [texto]);

  return (
    <div className="janela-dos-dados" role="img" aria-label="Prévia dos dados">
      <Canvas camera={{ position: [0, 0, 6], fov: FOV }} dpr={1} gl={{ alpha: true, antialias: true }} frameloop={perfilLeve() ? 'demand' : 'always'}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 3]} intensity={2.5} color="#fff1dc" />
        <Fileiras dice={dice} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
      {dice.length === 0 && <p className="janela-vazia">Digite os dados para vê-los aqui.</p>}
    </div>
  );
}
