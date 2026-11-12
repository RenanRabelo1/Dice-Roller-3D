import { expect, test, type Page } from '@playwright/test';

test.use({ launchOptions: { args: [] } });
test.setTimeout(180_000);

async function advance(page: Page, ms: number) {
  const elapsed = await page.evaluate(() => window.__dice.state().omenTime);
  await page.clock.runFor(Math.max(0, ms - elapsed) + 32);
}

async function launch(page: Page, naturalOne = false) {
  await page.evaluate((naturalOne) => {
    window.__dice.select(['d100']);
    window.__dice.rigOmen(naturalOne ? null : { crits: [0], fumbles: [] });
  }, naturalOne);
  await page.waitForFunction(() => window.__dice.state().dice[0] === 'd100' && window.__dice.state().ready);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.clock.runFor(300); await page.keyboard.up('Space');
  if (naturalOne) {
    // Choose a real physical roll, without changing a face or publishing a fabricated result.
    const seed = await page.evaluate(async ({ storePath, presimPath }) => {
      const { useDice } = await import(storePath), { presimulate } = await import(presimPath);
      const state = useDice.getState(), start = window.__dice.bodies().map(({ p, q }) => ({ p, q }));
      for (let seed = 0; seed < 2000; seed++) {
        const launch = { ...state.launch, seed };
        if (presimulate(state.dice, start, launch).results[0] === 1) {
          useDice.setState({ launch });
          return seed;
        }
      }
      throw new Error('No physical d100=1 fixture found');
    }, { storePath: '/src/store.ts', presimPath: '/src/physics/presim.ts' });
    expect(seed).toBeGreaterThanOrEqual(0);
  }
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

const face = (page: Page) => page.evaluate(() => {
  const cam = window.__dice.camera(), labels = window.__dice.labels(0);
  const toward = (l: (typeof labels)[number]) => {
    const d = l.position.map((v, k) => cam[k] - v), n = Math.hypot(...d);
    return l.normal.reduce((sum, v, k) => sum + v * d[k] / n, 0);
  };
  return labels.reduce((a, b) => toward(a) > toward(b) ? a : b).value;
});

for (const width of [1440, 390]) {
  test(`d100=1: the kraken grabs the die, flings it away and brings it back at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await launch(page, true);
    expect(await page.evaluate(() => window.__dice.state().results)).toEqual([1]);
    const start = await page.evaluate(() => window.__dice.bodies()[0].p);
    await advance(page, 1750); // grabbed and lifted out of the broken tray
    expect(await page.evaluate(() => window.__dice.state().trayBroken)).toBe(true);
    expect((await page.evaluate(() => window.__dice.bodies()[0].p))[1]).toBeGreaterThan(start[1] + 2);
    await page.screenshot({ path: `screens/kraken-grab-${width}.png` });
    await advance(page, 3000); // flung far away, out of sight
    const away = await page.evaluate(() => window.__dice.bodies()[0].p);
    expect(away[1]).toBeGreaterThan(9); expect(away[2]).toBeLessThan(-10);
    await page.screenshot({ path: `screens/kraken-thrown-${width}.png` });
    await advance(page, 4700); // brought back to the screen, the 1 toward you, the result still held
    expect(await face(page)).toBe(1);
    const held = await page.evaluate(() => window.__dice.state());
    expect(held.omenDone).not.toBe(held.throwId);
    await expect(page.getByTestId('result')).toBeEmpty();
    await page.screenshot({ path: `screens/kraken-caught-${width}.png` });
    await advance(page, 6600);
    const state = await page.evaluate(() => window.__dice.state());
    expect(state.trayBroken).toBe(false);
    expect(state.omenDone).toBe(state.throwId);
    expect(state.showcased).toBe(state.throwId);
    await expect(page.getByTestId('result')).toHaveText('1');
    await expect(page.locator('.game-area')).not.toHaveAttribute('data-kraken');
    expect(await face(page)).toBe(1);
    const final = await page.evaluate(() => window.__dice.bodies()[0].p);
    await page.clock.runFor(1200);
    expect(await page.evaluate(() => window.__dice.bodies()[0].p)).toEqual(final);
    await page.screenshot({ path: `screens/kraken-restored-${width}.png` });
    expect(errors).toEqual([]);
  });
}

for (const action of ['pickup', 'selection', 'reduced motion']) {
  test(`${action} restores the broken tray immediately`, async ({ page }) => {
    await launch(page);
    await advance(page, 1100);
    expect(await page.evaluate(() => window.__dice.state().trayBroken)).toBe(true);
    if (action === 'pickup') await page.keyboard.press('Space');
    else if (action === 'selection') await page.evaluate(() => window.__dice.select(['d6']));
    else {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      // The media-query event reaches the app asynchronously; wait for the state before moving the simulated clock.
      await page.waitForFunction(() => window.__dice.state().reducedMotion === true);
    }
    await page.clock.runFor(500);
    expect(await page.evaluate(() => window.__dice.state().trayBroken)).toBe(false);
    await expect(page.locator('.omen')).toHaveCount(0);
    await expect(page.locator('.game-area')).not.toHaveAttribute('data-kraken');
  });
}
