// The game's rule types, shared by the browser and the API server (which runs this file in Node).
export type Shape = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100' | 'coin' | 'livre'; // 'livre': a free-form imported die
export type BuiltinKind = Exclude<Shape, 'livre'> | 'vtm' | 'hunger' | 'fire';
export type CustomKind = `custom:${string}`; // a die the player imported
export type DieKind = BuiltinKind | CustomKind; // every kind is one physical die
// The solids an imported die can be recognised as; never a d100 or a coin.
export type CustomBase = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'livre';

export interface Omen { crits: number[]; fumbles: number[] } // die indices
export type OmenKind = 'crit' | 'fumble' | 'duality';

// One die of a throw as the rules see it: an imported one also says its solid and whether it counts for omens.
export interface DieInput { kind: DieKind; value?: number; base?: CustomBase; omens?: boolean }
