// What goes in and out of `pressagios` (rule 3 of the guide).
import type { Omen } from '../regras/index.ts';
import type { OmenTest } from '../arremesso/index.ts';

// The omen's state (owned by `pressagios`, OS-0038): the show of the published result, its clock and the test mode.
export interface EstadoDoPresagio {
  omen: (Omen & { throwId: number }) | null; // the show this throw's result puts on before it appears
  omenDone: number; // throwId whose omen finished playing
  omenAt: number; // shared animation clock, starting when the physical result is published
  omenRig: Omen | null; // test mode only: forces the omen of the next throws
  omenTest: OmenTest | null; // dev test buttons: the next throws land on faces that play this omen (real physics)
  setOmenDone: (throwId: number) => void;
  rigOmen: (omen: Omen | null) => void;
  setOmenTest: (test: OmenTest | null) => void;
}
