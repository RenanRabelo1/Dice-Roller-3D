import { createSignal } from '../../shared/events.ts';

// Whether a test-button search (`bias`) is running in the worker. The shell pauses the main render meanwhile:
// nothing on screen moves while the dice wait for their roll, and a software renderer drawing every frame on the
// same cores leaves the worker ~60× slower (3 seeds/s against ~200/s, measured in the E2E browser).
let buscando = false;
const mudou = createSignal<boolean>();
export const buscandoTeste = () => buscando;
export const aoMudarBuscaDoTeste = mudou.subscribe;
export function definirBuscaDoTeste(v: boolean) {
  if (v === buscando) return;
  buscando = v;
  mudou.emit(v);
}
