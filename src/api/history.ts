import type { DieKind } from '../dice/kinds';

// Sends each throw to the history API (server/) when the app runs with VITE_API_URL set. Fire and forget:
// the table never waits on the network, and with no backend configured nothing is sent.
const API = import.meta.env.VITE_API_URL as string | undefined;
const KEY = 'diceroller.player';
const SESSION = crypto.randomUUID(); // when storage is blocked (private window), one id for this visit

// The anonymous player this browser is, until there are accounts.
export function playerId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
    return id;
  } catch {
    return SESSION;
  }
}

export const rollBody = (player: string, dice: DieKind[], results: number[], force: number) =>
  ({ playerId: player, dice: dice.map((kind, i) => ({ kind, value: results[i] })), force: Math.min(1, Math.max(0, force)) });

export function saveRoll(dice: DieKind[], results: number[], force: number, api = API): void {
  if (!api) return;
  fetch(`${api.replace(/\/+$/, '')}/rolls`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
    body: JSON.stringify(rollBody(playerId(), dice, results, force)),
  }).catch(() => {}); // the history is a bonus: a failed save never disturbs the game
}
