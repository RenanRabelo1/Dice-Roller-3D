import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: [] } });

// A coin's Cara/Coroa sits just under the coin, not on it and not off in the row.
const expectUnder = (caption: number[], coin: number[]) => {
  expect(caption[1]).toBeLessThan(coin[1] - 0.5);
  expect(Math.hypot(...caption.map((v, k) => v - coin[k]))).toBeLessThan(1.6);
};

test('a coin can be picked up and tossed six times without corrupting its pose', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
  await page.evaluate(() => window.__dice.select(['coin']));
  await page.waitForFunction(() => window.__dice.state().ready && window.__dice.state().dice[0] === 'coin');
  expect(await page.evaluate(() => window.__dice.labels(0).map((l) => l.text))).toEqual(['heads', 'crown']);
  await page.locator('.game-area').focus();
  for (let roll = 0; roll < 6; roll++) {
    if (roll) {
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__dice.state().phase === 'hand');
      const hand = await page.evaluate(() => window.__dice.bodies()[0]);
      expect(Math.abs(hand.p[1] - 3)).toBeLessThan(0.12); expect(hand.p[2]).toBeCloseTo(3, 1);
    }
    await page.keyboard.down('Space'); await page.waitForTimeout(roll % 2 ? 700 : 150); await page.keyboard.up('Space');
    await page.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; });
    const snapshot = await page.evaluate(() => {
      const state = window.__dice.state(), body = window.__dice.bodies()[0], mesh = window.__dice.meshes()[0];
      const labels = window.__dice.labels(0);
      return { state, body, mesh, face: labels.reduce((a, b) => a.normal[1] > b.normal[1] ? a : b).value };
    });
    expect(snapshot.body.p.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...snapshot.body.q)).toBeCloseTo(1, 4);
    expect(Math.abs(snapshot.body.q.reduce((dot, v, i) => dot + v * snapshot.mesh.q[i], 0))).toBeCloseTo(1, 4);
    expect(snapshot.face).toBe(snapshot.state.results![0]);
    expect(snapshot.body.p[1]).toBeGreaterThan(4); // the coin comes up to the front, like a die
    await expect(page.getByTestId('result')).toHaveText(snapshot.face === 1 ? 'Cara' : 'Coroa');
    const captions = await page.evaluate(() => window.__dice.highlights().filter((h) => h.visible));
    expect(captions.map((h) => h.text)).toEqual([snapshot.face === 1 ? 'Cara' : 'Coroa']);
    expectUnder(captions[0].position, snapshot.body.p);
    await page.screenshot({ path: `screens/coin-repeat-${roll + 1}.png` });
  }
  expect(errors).toEqual([]);
});

test('two coins with a d6 can be tossed repeatedly on mobile and come up with their names under them', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
  await page.evaluate(() => window.__dice.select(['d6', 'coin', 'coin']));
  await page.waitForFunction(() => window.__dice.bodies().length === 3 && window.__dice.state().ready);
  await page.locator('.game-area').focus();
  for (let roll = 0; roll < 4; roll++) {
    if (roll) {
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__dice.state().phase === 'hand');
      const hand = await page.evaluate(() => window.__dice.bodies());
      for (const body of hand) { // back in the hand's whirl: lifted, behind the front wall, nowhere near the camera
        expect(body.p[1]).toBeGreaterThan(1.5); expect(body.p[1]).toBeLessThan(5.5);
        expect(body.p[2]).toBeGreaterThan(0); expect(body.p[2]).toBeLessThan(4);
      }
    }
    await page.keyboard.down('Space'); await page.waitForTimeout(250); await page.keyboard.up('Space');
    await page.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; });
    const result = await page.evaluate(() => ({
      values: window.__dice.state().results!, bodies: window.__dice.bodies(),
      faces: [1, 2].map((i) => window.__dice.labels(i).reduce((a, b) => a.normal[1] > b.normal[1] ? a : b).value),
      raised: window.__dice.highlights().filter((h) => h.visible),
    }));
    expect(result.faces).toEqual(result.values.slice(1));
    expect(result.raised.map((h) => h.text)).toEqual(result.values.map((v, i) => i ? v === 1 ? 'Cara' : 'Coroa' : String(v)));
    for (const i of [1, 2]) { expect(result.bodies[i].p[1]).toBeGreaterThan(4); expectUnder(result.raised[i].position, result.bodies[i].p); }
    await expect(page.getByTestId('result').locator('strong')).toHaveText(String(result.values[0]));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  }
  await page.screenshot({ path: 'screens/coin-mixed-mobile.png' });
});
