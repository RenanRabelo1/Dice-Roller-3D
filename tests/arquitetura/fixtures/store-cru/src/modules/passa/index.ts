// Allowed: the store's functions, and the store used inside a function of the door.
import { store } from './store.ts';

export { ler, escrever as gravar } from './store.ts';
export const dobro = () => store.valor * 2;
