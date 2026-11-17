// What goes in and out of `vitrine` (rule 3 of the guide).

// The showcase's state (owned by `vitrine`, OS-0041): which throw's dice finished flying to the front.
export interface EstadoDaVitrine {
  showcased: number; // throwId whose dice finished flying to the front
  setShowcased: (throwId: number) => void;
}

// What the test hook (`window.__dice`) reads of the showcase's scene, through `inspecao(cena)` (OS-0044): the rolled
// numbers over the dice (a symbol has no text) and the lit engraving of die `index`, if it has one.
interface DestaqueInspecionado { text: string | null; visible: boolean; position: [number, number, number] }
interface BrilhoInspecionado { visible: boolean; triangles: number; opacity: number }
export interface VitrineInspecionada {
  highlights(): DestaqueInspecionado[];
  inkGlow(index: number): BrilhoInspecionado | null;
}
