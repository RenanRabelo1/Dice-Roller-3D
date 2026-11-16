import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Cena } from './app/Cena.tsx';
import { Painel } from './app/Painel.tsx';
import { BotoesDeTeste, OverlayDoPresagio } from './modules/pressagios/cena.ts';
import { Failure, Guard, aoMudarMovimentoReduzido, hasWebGL, movimentoReduzido, observarPreferenciaDoSistema, perfil, registrarFalha, useFalha } from './shared/plataforma/index.ts';
import { arremesso, assinarArremesso } from './modules/arremesso/index.ts';
import type { EstadoDoArremesso } from './modules/arremesso/contracts.ts';
import { carregar as carregarMesa, warmImageDecoder } from './modules/mesa/index.ts';
import { FundoCss } from './modules/mesa/cena.ts';
import { iniciarHistorico } from './modules/historico/index.ts';
import { carregar } from './modules/meus-dados/index.ts';

export default function App() {
  const app = useRef<HTMLElement>(null);
  const gameArea = useRef<HTMLDivElement>(null);
  const error = useFalha();
  useState(() => { if (!hasWebGL()) registrarFalha('webgl'); }); // before the first Canvas render
  useEffect(() => { void carregar(); void carregarMesa(); warmImageDecoder(); }, []);
  useEffect(() => observarPreferenciaDoSistema(), []);
  // Every published result goes to the roll history (when the app has an API address; see src/modules/historico).
  // Subscribed here, last, after the modules that subscribe on load (pressagios).
  useEffect(() => iniciarHistorico(), []);
  // HUD rhythm: gesture phase and charge force go straight to the DOM, so the scene never re-renders on them.
  useEffect(() => {
    const el = app.current!;
    const aplicar = (s: EstadoDoArremesso) => { el.dataset.fase = s.gesture.phase; el.style.setProperty('--forca', String(s.force)); };
    aplicar(arremesso());
    const movimento = (v: boolean) => { if (v) el.dataset.movimento = 'reduzido'; else delete el.dataset.movimento; };
    movimento(movimentoReduzido());
    const sairA = assinarArremesso(aplicar), sairM = aoMudarMovimentoReduzido(movimento);
    return () => { sairA(); sairM(); };
  }, []);
  return (
    <main ref={app} className="app" data-perfil={perfil()}>
    <Painel />
    <div ref={gameArea} className="game-area" tabIndex={0} aria-label="Área de arremesso">
      <FundoCss />
      <div className="faixa faixa-cima" aria-hidden="true" />
      <div className="faixa faixa-baixo" aria-hidden="true" />
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
      <OverlayDoPresagio gameArea={gameArea} />
      {import.meta.env.DEV && <BotoesDeTeste gameArea={gameArea} />}
    </div>
    </main>
  );
}
