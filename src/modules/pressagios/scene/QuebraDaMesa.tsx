import { useFrame } from '@react-three/fiber';
import { arremesso } from '../../arremesso/index.ts';
import { ocultarPiso } from '../../mesa/index.ts';
import { movimentoReduzido } from '../../../shared/plataforma/index.ts';
import { presagio } from '../store.ts';
import { trayBrokenAt } from '../domain/krakenMotion.ts';

// When the kraken breaks the tray: every frame it tells `mesa` to hide or show the floor. The shell mounts it before
// <MesaNaCena/>, so the floor is right in the same frame.
const broken = () => {
  const a = arremesso(), s = presagio();
  return trayBrokenAt({ phase: a.gesture.phase, throwId: a.throwId, omen: s.omen, omenDone: s.omenDone, omenAt: s.omenAt, dice: a.dice, reducedMotion: movimentoReduzido() }, performance.now());
};

export function QuebraDaMesa() {
  useFrame(() => ocultarPiso(broken()));
  return null;
}
