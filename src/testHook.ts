import type { DieKind } from './dice/polyhedra';
import type { Quat, Vec3 } from './physics/world';
import type { Phase } from './throw/gesture';

export interface DiceHook {
  state(): {
    kind: DieKind; count: number; phase: Phase; throwId: number;
    results: number[] | null; ready: boolean; error: 'graphics' | 'physics' | null; aim: Vec3;
  };
  select(kind: DieKind, count: number): void;
  bodies(): { handle: number; p: Vec3; q: Quat; type: number }[];
  meshes(): { q: Quat }[];
  labels(index: number): { text: string; position: Vec3; normal: Vec3 }[];
  numbersVisible(index: number): boolean;
  rig(results: number[]): void; // test-only: replaces the hidden results of the throw in progress
  launches(): { count: number; last: { before: { p: Vec3; q: Quat }[]; after: { p: Vec3; q: Quat }[] } | null };
  previewSurface(index: number, position: Vec3, quaternion: Quat): void;
}

export function installTestHook(api: DiceHook): void {
  if (import.meta.env.MODE === 'test') {
    (window as unknown as { __dice: DiceHook }).__dice = api;
  }
}
