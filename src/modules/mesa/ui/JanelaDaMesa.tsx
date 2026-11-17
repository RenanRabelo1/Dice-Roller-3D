import { Canvas } from '@react-three/fiber';
import { perfilLeve } from '../../../shared/plataforma/index.ts';
import { MesaDePrevia } from '../scene/MesaDePrevia.tsx';
import { FundoCss } from './FundoCss.tsx';

// The preview window of the table chapter (OS-0082): the table and the backdrop, turning slowly, in its own canvas.
// The chapter mounts it only while open, so the WebGL context goes away with the book page.
export function JanelaDaMesa() {
  return (
    <div className="janela-da-mesa" role="img" aria-label="Prévia da mesa">
      <FundoCss />
      <Canvas dpr={1} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 15, 19], fov: 40 }} frameloop={perfilLeve() ? 'demand' : 'always'} tabIndex={-1}>
        <MesaDePrevia />
      </Canvas>
    </div>
  );
}
