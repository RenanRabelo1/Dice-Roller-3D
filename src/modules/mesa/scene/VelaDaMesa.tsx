import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PointLight } from 'three';
import { movimentoReduzido, perfilLeve, renderizadorPorSoftware } from '../../../shared/plataforma/index.ts';
import { luzDaMesa, tremorDaVela } from '../domain/luz.ts';
import { store } from '../store.ts';

/**
 * The table's candle. Always mounted in the full profile (not mounted in the light one, ADR 0011), no shadow: the light count never changes at runtime (armadilhas.md). A theme
 * change only changes colour and intensity; the software renderer turns it off with intensity 0.
 */
export function VelaDaMesa() {
  const luz = useRef<PointLight>(null);
  useFrame((state) => {
    const p = luz.current;
    if (!p) return;
    const l = luzDaMesa(store.getState().theme);
    p.color.set(l.cor);
    p.intensity = renderizadorPorSoftware() ? 0 : l.intensidade * (l.tremor && !movimentoReduzido() ? tremorDaVela(state.clock.elapsedTime * 1000) : 1);
  });
  if (perfilLeve()) return null;
  return <pointLight ref={luz} position={[-6, 3.5, -4]} distance={18} decay={2} />;
}
