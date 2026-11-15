// The module owns `localStorage['diceroller.player']`: the anonymous player this browser is, until there are accounts.
const KEY = 'diceroller.player';
const SESSION = crypto.randomUUID(); // when storage is blocked (private window), one id for this visit

export function playerId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
    return id;
  } catch {
    return SESSION;
  }
}
