// Violates: the raw store leaves the module through its door, by name, renamed and as a local import.
import { store as local } from './store.ts';

export { store } from './store.ts';
export { store as cru } from './store.ts';
export { local };
