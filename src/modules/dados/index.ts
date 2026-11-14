// Public door of `dados` (domain half): solids, catalogue of kinds, reading, symbols and ink.
export type { CustomDie, Face, Finish, Ink, Label, Numbering, Polyhedron, StdBase, SymbolName } from './contracts.ts';
export { fromTriangles, OPPOSITE_SUM, RADIUS, RAIO_MAXIMO } from './domain/solidos.ts';
export {
  allKinds, baseOf, customDie, customKind, customList, customsOf, paraRegras, polyhedron, registerCustom, registerPoly, sortDice, unregisterCustom,
} from './domain/catalogo.ts';
export { readUp, toResults } from './domain/leitura.ts';
export { symbolGeometry } from './domain/simbolos.ts';
export { finishOf, INK_COLORS, inkColorOf } from './domain/tinta.ts';
