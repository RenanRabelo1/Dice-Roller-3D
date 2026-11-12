import type { DieKind } from './dice/polyhedra';
import type { DiceError } from './store';
import type { Omen, OmenKind } from './dice/omen';
import type { Quat, Vec3 } from './physics/world';
import type { Phase } from './throw/gesture';

export interface DiceHook {
  state(): {
    dice: DieKind[]; phase: Phase; throwId: number;
    results: number[] | null; ready: boolean; error: DiceError; aim: Vec3; showcased: number;
    omen: OmenKind | null; omenDone: number; reducedMotion: boolean; // omen: this throw's
    omenTime: number; trayBroken: boolean; burning: boolean;
  };
  rigOmen(omen: Omen | null): void; // the next throws play this omen whatever they roll
  select(dice: DieKind[]): void;
  bodies(): { handle: number; p: Vec3; q: Quat; type: number }[];
  meshes(): { q: Quat }[];
  labels(index: number): { text: string; value: number; position: Vec3; normal: Vec3 }[]; // text: the numeral, the symbol's name, or '' on a blank face
  numbersVisible(index: number): boolean;
  gemLook(index: number): { shown: boolean; material: string; opaque: boolean; painted: boolean; ink: number[] | null }[]; // the visible meshes of a die: material type, opacity, vertex-painted, and the colour of its first inked vertex
  highlights(): { text: string | null; visible: boolean; position: Vec3 }[];
  inkGlow(index: number): { visible: boolean; triangles: number; opacity: number } | null; // the lit engraving of an engraved free-form die in the showcase
  camera(): Vec3;
  launches(): { count: number; last: { before: { p: Vec3; q: Quat }[]; after: { p: Vec3; q: Quat }[] } | null };
  customs(): { kind: DieKind; id: string; name: string; slug: string; base: string; printed: boolean }[]; // the imported dice
  table(): { reflect: boolean | null; programs: number; id: string; name: string; background: 'color' | 'preset' | 'image' | 'panorama'; backgroundColor: string | null; felt: string | null; feltTextured: boolean; wood: string | null; model: boolean; imported: boolean; guide: { size: Vec3; center: Vec3 } | null; saved: number }; // the active table, read off the scene
  shards(): { felt: string; wood: string } | null; // colours of the kraken's first floor shard
  previewSurface(index: number, position: Vec3, quaternion: Quat): void;
}

export function installTestHook(api: DiceHook): void {
  if (import.meta.env.MODE === 'test') {
    (window as unknown as { __dice: DiceHook }).__dice = api;
  }
}
