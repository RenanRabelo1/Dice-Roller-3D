import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: [] } });

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
    expect(snapshot.body.p[1]).toBeLessThan(1.5); // the coin stays in the tray; only the result text flies
    await expect(page.getByTestId('result')).toHaveText(snapshot.face === 1 ? 'Cara' : 'Coroa');
    expect(await page.evaluate(() => window.__dice.highlights().filter((h) => h.visible))).toEqual([
      { text: snapshot.face === 1 ? 'Cara' : 'Coroa', visible: true },
    ]);
    await page.screenshot({ path: `screens/coin-repeat-${roll + 1}.png` });
  }
  expect(errors).toEqual([]);
});

test('two coins with a d6 can be tossed repeatedly on mobile and raise only their names', async ({ page }) => {
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
      for (const body of hand) {
        expect(Math.abs(body.p[1] - 3)).toBeLessThan(0.12);
        expect(body.p[2]).toBeCloseTo(3, 1);
      }
    }
    await page.keyboard.down('Space'); await page.waitForTimeout(250); await page.keyboard.up('Space');
    await page.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; });
    const result = await page.evaluate(() => ({
      values: window.__dice.state().results!, bodies: window.__dice.bodies(),
      faces: [1, 2].map((i) => window.__dice.labels(i).reduce((a, b) => a.normal[1] > b.normal[1] ? a : b).value),
      raised: window.__dice.highlights().filter((h) => h.visible).map((h) => h.text),
    }));
    expect(result.faces).toEqual(result.values.slice(1));
    expect(result.raised).toEqual(result.values.map((v, i) => i ? v === 1 ? 'Cara' : 'Coroa' : String(v)));
    for (const body of result.bodies.slice(1)) expect(body.p[1]).toBeLessThan(2);
    await expect(page.getByTestId('result').locator('strong')).toHaveText(String(result.values[0]));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  }
  await page.screenshot({ path: 'screens/coin-mixed-mobile.png' });
});
