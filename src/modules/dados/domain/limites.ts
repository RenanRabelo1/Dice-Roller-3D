// The limits a saved die was accepted with when it was imported. They must follow meus-dados' import limits
// (`LIMITS` in src/modules/meus-dados/domain/importador.ts), so a saved die always reads again. Kept apart from modelo.ts so index.ts can export it without pulling that lazy chunk.
export const LIMITES_DO_MODELO_SALVO = { bytes: 10 * 1024 * 1024, triangles: 50_000, texture: 2048 };
