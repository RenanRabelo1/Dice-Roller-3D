// shortcut: troika-three-text 0.52.5 ships types without BatchedText; this declares only the members we use.
declare module 'troika-three-text' {
  import type { Material, Mesh } from 'three';
  export class Text extends Mesh {
    text: string;
    font: string;
    fontSize: number;
    color: string | number;
    anchorX: number | string;
    anchorY: number | string;
    outlineWidth: number | string;
    outlineColor: string | number;
    depthOffset: number;
    material: Material;
    sync(callback?: () => void): void;
    dispose(): void;
  }
  export class BatchedText extends Text {}
}
