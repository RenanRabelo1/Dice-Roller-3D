import { Color } from 'three';
import type { CustomDie, Finish } from '../contracts.ts';

export const INK_COLORS = { ouro: '#D4A93F', escura: '#1B1A16', branca: '#F2EEE4' } as const;

// The paint colour of a die's engraved numerals, or null when it has none (no engraving, or the player chose none).
// Automatic: dark ink on a light gem, gold on a dark one.
export function inkColorOf(die: Pick<CustomDie, 'printed' | 'ink'>, gem: string): string | null {
  const ink = die.ink ?? 'auto';
  if (!die.printed || ink === 'nenhuma') return null;
  if (ink !== 'auto') return INK_COLORS[ink];
  const c = new Color(gem); // linear sRGB
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b > 0.5 ? INK_COLORS.escura : INK_COLORS.ouro;
}
export const finishOf = (die: CustomDie): Finish => die.finish ?? 'gema';
