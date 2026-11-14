// The only client file that imports from server/: the HTTP contract, types only (ADR 0004).
import type { DieIn, RollIn } from '../../../server/src/modules/historico/contracts.ts';

export type { DieIn };

// The history API (server/); unset means the table runs offline.
export const API = import.meta.env.VITE_API_URL as string | undefined;

// Fire and forget: the table never waits on the network.
export function postRoll(api: string, body: RollIn): void {
  fetch(`${api.replace(/\/+$/, '')}/rolls`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
    body: JSON.stringify(body),
  }).catch(() => {}); // the history is a bonus: a failed save never disturbs the game
}
