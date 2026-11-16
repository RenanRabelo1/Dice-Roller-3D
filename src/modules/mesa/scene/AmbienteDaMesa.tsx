import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { EnvironmentPortal } from '@react-three/drei';
import type { Texture } from 'three';
import { panoramaTexture } from '../domain/tableImages.ts';
import { useMesa } from '../ui/useMesa.tsx';
import { VelaDaMesa } from './VelaDaMesa.tsx';

interface Pano { tex: Texture; rotation: number; intensity: number; blur: number; reflect: boolean }

/**
 * The table's ambience in the scene: the colour background, the 360° panorama (background and reflections) and the
 * environment map. `podeTrocar` says when a new panorama may be applied (the shell's rule: between animations).
 * `luzes` (the shell's lights) render between the colour and the environment, and `children` (the shell's
 * Lightformers) inside it, so the scene keeps its order.
 */
export function AmbienteDaMesa({ podeTrocar, luzes, children }: { podeTrocar: () => boolean; luzes?: ReactNode; children?: ReactNode }) {
  const background = useMesa((state) => state.theme.background);
  // The 360° panorama (background + reflections). It is applied only between animations, like the DPR: re-capturing the
  // environment cubemap mid-throw would cost a frame.
  const [pano, setPano] = useState<Pano | null>(null);
  const wanted = useRef<Pano | null>(null);
  useEffect(() => {
    if (background.kind !== 'panorama') { wanted.current = null; return; }
    let live = true;
    const { rotation, intensity, blur, reflect } = background;
    panoramaTexture(background).then((tex) => { if (live) wanted.current = { tex, rotation: rotation * Math.PI / 180, intensity, blur, reflect }; }, () => {});
    return () => { live = false; };
  }, [background]);
  useFrame((state) => {
    if (wanted.current === pano) return;
    if (!podeTrocar()) return;
    if (wanted.current) state.scene.background = wanted.current.tex;
    else if (pano && state.scene.background === pano.tex) state.scene.background = null; // a colour background attaches itself
    setPano(wanted.current);
  });
  return (
    <>
      {/* A colour is the scene's background; a photo or ready-made theme sits behind the transparent canvas (FundoCss). */}
      {background.kind === 'color' && <color attach="background" args={[background.color]} />}
      {luzes}
      <VelaDaMesa />
      {/* Same cubemap target for every panorama, so the dice materials do not recompile when it changes. The rotation, intensity and blur props are
          re-applied by drei each time it re-captures, so they have to be passed here rather than set on the scene.
          drei re-captures when its `children` change: the fragment is a new element on every render (as the shell's
          Lightformers were when this lived there), so a new panorama or background is captured at once. */}
      <EnvironmentPortal resolution={256} map={pano?.reflect ? pano.tex : undefined}
        backgroundRotation={[0, pano?.rotation ?? 0, 0]} backgroundIntensity={pano?.intensity ?? 1} backgroundBlurriness={pano?.blur ?? 0}
        environmentRotation={[0, pano?.rotation ?? 0, 0]}>
        <>{children}</>
      </EnvironmentPortal>
    </>
  );
}
