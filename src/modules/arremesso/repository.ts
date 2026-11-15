// The roll mode the player chose (owned by `arremesso`), remembered by the browser between visits.
import type { ChargeMode } from './contracts.ts';

const MODE_KEY = 'diceroller.rolagem';

export const savedMode = (): ChargeMode => { try { return localStorage.getItem(MODE_KEY) === 'static' ? 'static' : 'relative'; } catch { return 'relative'; } };

export const saveMode = (mode: ChargeMode): void => {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* a private window: the choice lasts this visit */ }
};
