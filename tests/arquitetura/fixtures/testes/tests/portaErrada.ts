// Violates: a root test importing a module's store.ts, not one of its doors.
import { store } from '../src/modules/m/store.ts';

export const valor = store.valor;
