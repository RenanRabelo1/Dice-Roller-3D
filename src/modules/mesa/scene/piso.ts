// The floor the kraken hides (the visibility is `mesa`'s; when it breaks is `pressagios`'), without React: `ocultarPiso`
// goes out through index.ts, `MesaNaCena` registers the floor of the table it shows.
import type { Object3D } from 'three';

let pisoOculto = false;
let piso: Object3D | null = null;

/** Hide (or show) the table's floor: kept for the next floor, and applied at once to the current one. */
export const ocultarPiso = (on: boolean) => {
  pisoOculto = on;
  if (piso) piso.visible = !on;
};

/** The floor now in the scene (`null` when it leaves): it gets the current visibility at once. */
export const registrarPiso = (next: Object3D | null) => {
  piso = next;
  if (next) next.visible = !pisoOculto;
};

export const pisoEstaOculto = () => pisoOculto;
