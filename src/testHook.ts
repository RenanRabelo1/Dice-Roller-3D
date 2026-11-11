import type { DieKind } from './dice/polyhedra';
import type { Omen, OmenKind } from './dice/omen';
import type { Quat, Vec3 } from './physics/world';
import type { Phase } from './throw/gesture';

export interface DiceHook {
  state(): {
    dice: DieKind[]; phase: Phase; throwId: number;
    results: number[] | null; ready: boolean; error: 'graphics' | 'physics' | null; aim: Vec3; showcased: number;
    omen: OmenKind | null; omenDone: number; // omen: this throw's
    omenTime: number; trayBroken: boolean;
  };
  rigOmen(omen: Omen | null): void; // the next throws play this omen whatever they roll
  select(dice: DieKind[]): void;
  bodies(): { handle: number; p: Vec3; q: Quat; type: number }[];
  meshes(): { q: Quat }[];
  labels(index: number): { text: string; value: number; position: Vec3; normal: Vec3 }[]; // text: the numeral, the symbol's name, or '' on a blank face
  numbersVisible(index: number): boolean;
  camera(): Vec3;
  launches(): { count: number; last: { before: { p: Vec3; q: Quat }[]; after: { p: Vec3; q: Quat }[] } | null };
  previewSurface(index: number, position: Vec3, quaternion: Quat): void;
}

export function installTestHook(api: DiceHook): void {
  if (import.meta.env.MODE === 'test') {
    (window as unknown as { __dice: DiceHook }).__dice = api;
  }
}
