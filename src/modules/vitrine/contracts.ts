// What goes in and out of `vitrine` (rule 3 of the guide).

// The showcase's state (owned by `vitrine`, OS-0041): which throw's dice finished flying to the front.
export interface EstadoDaVitrine {
  showcased: number; // throwId whose dice finished flying to the front
  setShowcased: (throwId: number) => void;
}

// The text of the result panel: the total and, with more than one die, the detail per kind.
export interface TextoDoPainel { total: string; detail: string }
