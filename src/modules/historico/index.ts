// Public port of the client half of `historico` (its CLAUDE.md points to the shared one, on the server half).
import { resultadoPublicado } from '../arremesso/index.ts';
import { API, postRoll, type DieIn } from './api.ts';
import { corpoDosDados } from './domain/corpo.ts';
import { clamp01 } from '../../shared/math.ts';
import { playerId } from './repository.ts';

export type { DieIn };

// Sends one published throw to the history API when the app runs with VITE_API_URL set; with none, nothing is sent.
export function registrarArremesso({ dice, force }: { dice: DieIn[]; force: number }, api = API): void {
  if (!api) return;
  postRoll(api, { playerId: playerId(), dice, force: clamp01(force) });
}

// Every published result goes to the history. Not on load: the shell calls it once, after the modules that subscribe
// on load (pressagios), and gets back the cancel.
export const iniciarHistorico = (api = API): (() => void) =>
  resultadoPublicado.subscribe(({ dice, results, force }) => registrarArremesso({ dice: corpoDosDados(dice, results), force }, api));
