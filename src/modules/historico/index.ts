// Public port of the client half of `historico` (its CLAUDE.md points to the shared one, on the server half).
import { API, postRoll, type DieIn } from './api.ts';
import { playerId } from './repository.ts';

export type { DieIn };

// Sends one published throw to the history API when the app runs with VITE_API_URL set; with none, nothing is sent.
export function registrarArremesso({ dice, force }: { dice: DieIn[]; force: number }, api = API): void {
  if (!api) return;
  postRoll(api, { playerId: playerId(), dice, force: Math.min(1, Math.max(0, force)) });
}
