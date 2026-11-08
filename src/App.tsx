import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stage } from './scene/Stage';

export default function App() {
  const gameArea = useRef<HTMLDivElement>(null);
  return (
    <div ref={gameArea} className="game-area" tabIndex={0} aria-label="Área de arremesso">
      <Canvas shadows camera={{ position: [0, 14, 10], fov: 40 }}
        gl={{ preserveDrawingBuffer: import.meta.env.MODE === 'test' }}>
        <Suspense fallback={null}>
          <Stage gameArea={gameArea} />
        </Suspense>
      </Canvas>
    </div>
  );
}
