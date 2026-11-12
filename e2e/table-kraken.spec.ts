import { expect, test, type Page } from '@playwright/test';
import { tableGlb } from '../tests/helpers/tableGlb';

// The d100 critical (kraken) on a customised table: the floor goes away and comes back, the shards wear the table's colours.
const STATE = '/src/scene/tableState.ts'; // a variable, so TypeScript does not resolve the dev-server path
test.use({ launchOptions: { args: [] } });
test.setTimeout(180_000);

async function advance(page: Page, ms: number) {
  const elapsed = await page.evaluate(() => window.__dice.state().omenTime);
  await page.clock.runFor(Math.max(0, ms - elapsed) + 32);
}

async function launch(page: Page) {
  await page.evaluate(() => { window.__dice.select(['d100']); window.__dice.rigOmen({ crits: [0], fumbles: [] }); });
  await page.waitForFunction(() => window.__dice.state().dice[0] === 'd100' && window.__dice.state().ready);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.clock.runFor(300); await page.keyboard.up('Space');
  for (let i = 0; i < 160; i++) {
    await page.clock.runFor(32);
    if (await page.evaluate(() => window.__dice.state().phase === 'settled')) return;
  }
  throw new Error('Roll did not settle');
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
});

test('the shards wear the felt colour of the table, which breaks and comes back', async ({ page }) => {
  await page.evaluate(async (path) => {
    const { useTable } = await import(path);
    useTable.getState().edit({ felt: { color: '#1f8f3a', texture: 'veludo' }, wood: { color: '#223344' } });
  }, STATE);
  await page.clock.runFor(100);
  await launch(page);
  await advance(page, 1100);
  expect(await page.evaluate(() => window.__dice.state().trayBroken)).toBe(true);
  expect(await page.evaluate(() => window.__dice.shards())).toMatchObject({ felt: '#1f8f3a' });
  await advance(page, 9300);
  expect(await page.evaluate(() => window.__dice.state().trayBroken)).toBe(false);
  expect(await page.evaluate(() => window.__dice.state().error)).toBeNull();
});

test('an imported table without a floor disappears whole while the tray breaks, and returns', async ({ page }) => {
  await page.evaluate(async ({ bytes, path }) => {
    const { useTable } = await import(path);
    useTable.getState().apply({
      version: 1, id: 'sem-piso', name: 'Sem piso', createdAt: 1, background: { kind: 'color', color: '#140E10' },
      felt: { color: '#3A0F1A', texture: 'liso' }, wood: { color: '#3B2416' }, model: { name: 'sem-piso.glb', bytes: new Uint8Array(bytes).buffer },
    });
  }, { bytes: [...new Uint8Array(tableGlb({ floor: false }))], path: STATE });
  await page.waitForFunction(() => window.__dice.table().model);
  await page.clock.runFor(100);
  await launch(page);
  await advance(page, 1100);
  expect(await page.evaluate(() => window.__dice.state().trayBroken)).toBe(true);
  await advance(page, 9300);
  expect(await page.evaluate(() => window.__dice.state().trayBroken)).toBe(false);
});
