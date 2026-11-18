// Public door of `regras`. Relative imports with `.ts` and erasable syntax only: the API server runs this in Node.
export type { BuiltinKind, CustomBase, CustomKind, DieKind, Omen, OmenKind, PresagioVampiro, Shape, TipoVampiro } from './contracts.ts';
export { BASE, CUSTOM_BASES, FREE_VALUES, isCustom, KINDS, MAX_DICE, SIDES } from './domain/catalogo.ts';
export { tipoParaPresagio, total, valoresValidos } from './domain/pontuacao.ts';
export { omenKind, omenOf, presagioVampiro } from './domain/pressagio.ts';
