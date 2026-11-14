import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Cena } from './app/Cena';
import { Controls } from './ui/Controls';
import { OmenOverlay } from './ui/OmenOverlay';
import { OmenTests } from './ui/OmenTests';
import { resultadoPublicado } from './modules/arremesso/index.ts';
import { Backdrop } from './scene/Backdrop';
import { Failure, Guard, hasWebGL, observarPreferenciaDoSistema, registrarFalha, useFalha } from './shared/plataforma';
import { load as carregarMesa, warmImageDecoder } from './modules/mesa/index.ts';
import { registrarArremesso } from './modules/historico/index.ts';
import { corpoDosDados } from './app/historico';
import { carregar } from './modules/meus-dados/index.ts';

export default function App() {
  const gameArea = useRef<HTMLDivElement>(null);
  const error = useFalha();
  useState(() => { if (!hasWebGL()) registrarFalha('webgl'); }); // before the first Canvas render
  useEffect(() => { void carregar(); void carregarMesa(); warmImageDecoder(); }, []);
  useEffect(() => observarPreferenciaDoSistema(), []);
  // Every published result goes to the roll history (when the app has an API address; see src/modules/historico).
  // ponte até a fase 6: historico assina arremesso.resultadoPublicado
  useEffect(() => resultadoPublicado.subscribe(({ dice, results, force }) => {
    registrarArremesso({ dice: corpoDosDados(dice, results), force });
  }), []);
  return (
    <main className="app">
    <Controls />
    <div ref={gameArea} className="game-area" tabIndex={0} aria-label="Área de arremesso">
      <Backdrop />
      {!error && (
        <Guard kind="graphics">
          <Canvas shadows camera={{ position: [0, 14, 10], fov: 40 }}
            gl={{ preserveDrawingBuffer: import.meta.env.MODE === 'test' }}>
            <Suspense fallback={null}>
              <Cena gameArea={gameArea} />
            </Suspense>
          </Canvas>
        </Guard>
      )}
      <Failure />
      <OmenOverlay gameArea={gameArea} />
      {import.meta.env.DEV && <OmenTests gameArea={gameArea} />}
    </div>
    </main>
  );
}
