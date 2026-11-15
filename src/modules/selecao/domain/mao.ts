// The rules of the hand, pure: each gives the next hand, or null when the call is refused.
import { customDie, sortDice } from '../../dados/index.ts';
import { isCustom, MAX_DICE, type CustomKind, type DieKind } from '../../regras/index.ts';

export const MAO_INICIAL: DieKind[] = ['d20'];

// At the maximum, adding does nothing.
export const comAdicionado = (mao: DieKind[], kind: DieKind): DieKind[] | null =>
  mao.length >= MAX_DICE ? null : sortDice([...mao, kind]);

// Takes the last occurrence of that kind, and never the last die.
export function semRemovido(mao: DieKind[], kind: DieKind): DieKind[] | null {
  const i = mao.lastIndexOf(kind);
  return i < 0 || mao.length === 1 ? null : mao.filter((_, j) => j !== i);
}

// Drops imported kinds out of the catalogue and cuts at MAX_DICE; an empty list is refused.
export function definida(dice: DieKind[]): DieKind[] | null {
  const known = dice.filter((k) => !isCustom(k) || customDie(k)).slice(0, MAX_DICE);
  return known.length ? sortDice(known) : null;
}

// A kind gone from the catalogue leaves the hand; an emptied hand goes back to a d20.
export function semTipo(mao: DieKind[], kind: CustomKind): DieKind[] {
  const dice = mao.filter((k) => k !== kind);
  return dice.length ? dice : [...MAO_INICIAL];
}
