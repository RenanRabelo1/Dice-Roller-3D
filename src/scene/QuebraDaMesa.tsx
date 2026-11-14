import { useFrame } from '@react-three/fiber';
import { arremesso } from '../modules/arremesso/index';
import { ocultarPiso } from '../modules/mesa/index';
import { movimentoReduzido } from '../shared/plataforma';
import { presagio, trayBrokenAt } from '../modules/pressagios/index';

// When the kraken breaks the tray (a rule of `pressagios`, still legacy): every frame it tells `mesa` to hide or show the
// floor. The shell mounts it before <MesaNaCena/>, where <Tray/> was, so the floor is right in the same frame.
const broken = () => {
  const a = arremesso(), s = presagio();
  return trayBrokenAt({ phase: a.gesture.phase, throwId: a.throwId, omen: s.omen, omenDone: s.omenDone, omenAt: s.omenAt, dice: a.dice, reducedMotion: movimentoReduzido() }, performance.now());
};

export function QuebraDaMesa() {
  useFrame(() => ocultarPiso(broken()));
  return null;
}
