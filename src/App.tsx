import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stage } from './scene/Stage';
import { Controls } from './ui/Controls';
import { OmenOverlay } from './ui/OmenOverlay';
import { useDice } from './store';
import { saveRoll } from './api/history';

export default function App() {
  const gameArea = useRef<HTMLDivElement>(null);
  useEffect(() => { void useDice.getState().loadCustoms(); }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => useDice.getState().setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  // Every published result goes to the roll history (when the app has an API address; see src/api/history).
  useEffect(() => useDice.subscribe((s, prev) => {
    if (s.results && s.results !== prev.results) saveRoll(s.dice, s.results, s.force);
  }), []);
  return (
    <main className="app">
    <Controls />
    <div ref={gameArea} className="game-area" tabIndex={0} aria-label="Área de arremesso">
      <Canvas shadows camera={{ position: [0, 14, 10], fov: 40 }}
        gl={{ preserveDrawingBuffer: import.meta.env.MODE === 'test' }}>
        <Suspense fallback={null}>
          <Stage gameArea={gameArea} />
        </Suspense>
      </Canvas>
      <OmenOverlay gameArea={gameArea} />
    </div>
    </main>
  );
}
