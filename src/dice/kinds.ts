// The kinds of dice and what is behind each one, with no 3D code: shared by the scene and the API server.
export type Shape = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100' | 'coin';
export type DieKind = Shape | 'vtm' | 'hunger' | 'fire'; // every kind is one physical die

export const KINDS: DieKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'vtm', 'hunger', 'fire', 'coin'];
// The physical die behind each kind: geometry, collider, radius, numbering and reading.
// Custom dice (Vampire: The Masquerade d10s, Fireball d6) only change how that die looks.
export const BASE: Record<DieKind, Shape> = {
  d4: 'd4', d6: 'd6', d8: 'd8', d10: 'd10', d12: 'd12', d20: 'd20', d100: 'd100', vtm: 'd10', hunger: 'd10', fire: 'd6', coin: 'coin',
};
// Highest result of each shape (a d10 reads 1-10; a coin is 1 heads, 2 tails).
export const SIDES: Record<Shape, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100, coin: 2 };
