import { omenKind, type DieKind, type Omen } from '../../regras/index.ts';
import { paraRegras } from '../../dados/index.ts';

// An omen is the show a roll puts on before its result appears; the rules (crit, fumble, duality) live in `regras`.

// How long each show lasts (ms); the result waits for it.
// d20 = 20: lightning. d100 = 1: the kraken grabs, flings and brings back the die. d20 = 1: fire. d100 = 100: the storm.
export const OMEN_MS = { lightning: 1300, kraken: 6500, fire: 2400, storm: 4600, duality: 2600 };
export const DUALITY_HIT = 1100; // when the two fish collide (and the screen shakes)

// A d20, or an imported d20-shaped die the player asked to count as one (read from the registry of imported dice).
export const isD20 = (kind: DieKind): boolean => paraRegras(kind) === 'd20';

export function omenMs(o: Omen, dice: DieKind[]): number {
  const kind = omenKind(o);
  if (kind === 'duality') return OMEN_MS.duality;
  if (kind === 'fumble') return Math.max(o.fumbles.some((i) => isD20(dice[i])) ? OMEN_MS.fire : 0, o.fumbles.some((i) => dice[i] === 'd100') ? OMEN_MS.storm : 0);
  return o.crits.some((i) => dice[i] === 'd100') ? OMEN_MS.kraken : OMEN_MS.lightning;
}
