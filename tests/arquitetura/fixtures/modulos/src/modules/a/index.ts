// Violates: a reads an internal file of b. Allowed half of the module cycle a <-> b.
export { interno } from '../b/interno';
