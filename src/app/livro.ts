import { createSignal } from '../shared/events.ts';

// Whether the book is open. The Painel owns it; App locks the game area and Cena freezes the main scene while it is.
let aberto = false;
const mudou = createSignal<boolean>();
export const livroAberto = () => aberto;
export const aoMudarLivro = mudou.subscribe;
export function definirLivroAberto(v: boolean) {
  if (v === aberto) return;
  aberto = v;
  mudou.emit(v);
}
