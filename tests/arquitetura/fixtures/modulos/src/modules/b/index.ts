// Closes the module cycle a -> b -> a through index.ts only (no rule 1 violation here).
export * from '../a';
export const b = 1;
