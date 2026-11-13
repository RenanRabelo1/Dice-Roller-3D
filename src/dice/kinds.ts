// ponte até a OS-0015: the kinds of dice now live in `regras`; only omenD20s stays here.
export type { BuiltinKind, CustomBase, CustomKind, DieKind, Shape } from '../modules/regras/index.ts';
export { BASE, CUSTOM_BASES, FREE_VALUES, isCustom, KINDS, SIDES } from '../modules/regras/index.ts';
// Imported d20s the player asked to count as a d20 for omens. custom.ts keeps this in step with its registry.
export const omenD20s = new Set<string>();
