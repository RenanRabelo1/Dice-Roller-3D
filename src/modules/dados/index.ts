// Pure door of `dados` (ADR 0010): solids, catalogue of kinds, reading, symbols, ink, engraving and how a kind shows.
// No React here, not even through a file it reaches: the components and hooks are in cena.ts.
import { catalogoAlterado as sinalDoCatalogo } from './domain/catalogo.ts';
import { aparenciaDaGema, numeraisVisiveis, rotulos } from './domain/inspecao.ts';

export type {
  AparenciaDaGema, CustomDie, Face, Finish, Ink, Label, Numbering, Polyhedron, RotuloNaCena, StdBase, SymbolName,
} from './contracts.ts';
export { fromTriangles, OPPOSITE_SUM, RADIUS, RAIO_MAXIMO } from './domain/solidos.ts';
export {
  allKinds, baseOf, customDie, customKind, customList, customsOf, paraRegras, polyhedron, registerCustom, registerPoly, sortDice, unregisterCustom,
} from './domain/catalogo.ts';
// The catalogue publishes (ADR 0005); outside, only subscribe.
export const catalogoAlterado: Pick<typeof sinalDoCatalogo, 'subscribe'> = { subscribe: (listener) => sinalDoCatalogo.subscribe(listener) };
export { readUp, toResults } from './domain/leitura.ts';
export { symbolGeometry } from './domain/simbolos.ts';
export { finishOf, INK_COLORS, inkColorOf } from './domain/tinta.ts';
// carregarModelo loads domain/modelo.ts (and the GLB/STL loaders) on demand; never re-export that file here.
export { carregarModelo, FONT, FONT_URL, GEM, gemColor, nomeDoTipo, SYMBOL } from './domain/aparencia.ts';
export { dentTester, hasTexture, inkTriangles, markInk } from './domain/gravacao.ts';
export { LIMITES_DO_MODELO_SALVO } from './domain/limites.ts';
// Test inspection of a die in the scene (window.__dice): pass the dice group or the scene to look in.
export const inspecao = { rotulos, numeraisVisiveis, aparenciaDaGema };
