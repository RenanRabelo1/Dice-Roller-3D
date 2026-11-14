// What goes in and out of `pressagios` (rule 3 of the guide).
import type { Omen, OmenKind } from '../regras/index.ts';
import type { OmenTest } from '../arremesso/index.ts';
import type { Pose } from '../../shared/math.ts';

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

// Which effect plays on which die (OS-0039): die indices per effect, and how long the show lasts (0 with no omen).
export interface PlanoDoPresagio {
  kind: OmenKind | null;
  raios: number[]; // lightning: the d20s of a crit
  kraken: number[]; // the d100 of a crit without fumble
  tempestade: number[]; // the d100 of a fumble without crit
  fogo: number[]; // the d20s of a fumble without crit
  ms: number;
}

// The omen's own path for a die (the kraken's or the storm's): its pose now and how much of its number shows (0 to 1).
export interface MovimentoNoPresagio { pose: Pose; revela: number }
