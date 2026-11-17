import type { Page } from '@playwright/test';

// Esperas e leituras repetidas entre os specs. Cada spec que precisa de um timeout ou tempo diferente mantém a sua variante.
export const ready = (p: Page, n?: number) => p.waitForFunction((n) => window.__dice?.state().ready && (n === undefined || window.__dice.bodies().length === n), n);
export const settled = (p: Page) => p.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; }, null, { timeout: 90_000 });
export const throwWithSpace = async (p: Page) => {
  await p.locator('.game-area').focus();
  await p.keyboard.down('Space'); await p.waitForTimeout(700); await p.keyboard.up('Space');
};
// Fake clock: runs until the omen has played `ms`.
export async function advance(page: Page, ms: number) {
  const elapsed = await page.evaluate(() => window.__dice.state().omenTime);
  await page.clock.runFor(Math.max(0, ms - elapsed) + 32);
}
export const dice = (p: Page) => p.evaluate(() => window.__dice.state().dice);
export const panel = (p: Page) => p.locator('#table-panel');
