import { test, expect, type Page } from '@playwright/test';

const ready = (p: Page, n?: number) => p.waitForFunction((n) => window.__dice?.state().ready && (n === undefined || window.__dice.bodies().length === n), n);
const settled = (p: Page) => p.waitForFunction(() => window.__dice.state().phase === 'settled', null, { timeout: 90_000 });
const topValue = async (p: Page, i: number, d4 = false) => {
  const labels = await p.evaluate((i) => window.__dice.labels(i), i);
  const best = labels.reduce((a, b) => (d4 ? b.position[1] > a.position[1] : b.normal[1] > a.normal[1]) ? b : a);
  return best.text.replace('.', '');
};
const throwWithSpace = async (p: Page) => {
  await p.locator('.game-area').focus();
  await p.keyboard.down('Space'); await p.waitForTimeout(700); await p.keyboard.up('Space');
};
const equivalent = (a: number[], b: number[]) => expect(Math.abs(a.reduce((dot, v, i) => dot + v * b[i], 0))).toBeCloseTo(1, 5);

test.beforeEach(async ({ page }) => { await page.goto('/'); await ready(page); });

test('the face that lands on top is the published result, numbers visible the whole roll', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d6', 1)); await ready(page, 1);
  await throwWithSpace(page);
  expect(await page.evaluate(() => window.__dice.numbersVisible(0))).toBe(true);
  await settled(page);
  const [result] = (await page.evaluate(() => window.__dice.state().results))!;
  expect(await topValue(page, 0)).toBe(String(result));
  await expect(page.getByTestId('result')).toContainText(String(result));
});

test('d20 × 3 thrown with Space: panel matches the dice on screen', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d20', 3)); await ready(page, 3);
  const before = await page.evaluate(() => window.__dice.bodies().map((b) => b.handle));
  await throwWithSpace(page); await settled(page);
  const tops = await Promise.all([0, 1, 2].map((i) => topValue(page, i)));
  const results = (await page.evaluate(() => window.__dice.state().results))!;
  expect(results.map(String)).toEqual(tops);
  await expect(page.getByTestId('result')).toContainText(String(results.reduce((a, b) => a + b, 0)));
  await expect(page.getByTestId('result')).toContainText(results.join(' + '));
  expect(await page.evaluate(() => window.__dice.bodies().map((b) => b.handle))).toEqual(before);
  const launch = await page.evaluate(() => window.__dice.launches());
  expect(launch.count).toBe(1);
  launch.last!.before.forEach((pose, i) => {
    pose.p.forEach((v, k) => expect(launch.last!.after[i].p[k]).toBeCloseTo(v, 5));
    equivalent(pose.q, launch.last!.after[i].q);
  });
});

test('d100 × 10 uses 20 bodies and 10 results matching the rendered pairs', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d100', 10)); await ready(page, 20);
  await throwWithSpace(page); await settled(page);
  const results = (await page.evaluate(() => window.__dice.state().results))!;
  expect(results).toHaveLength(10);
  for (let i = 0; i < 10; i++) {
    const tens = Number((await topValue(page, 2 * i))[0]), units = Number(await topValue(page, 2 * i + 1));
    expect(results[i]).toBe(tens === 0 && units === 0 ? 100 : tens * 10 + units);
  }
});

test('repeating a throw with the same selection gets a new throwId', async ({ page }) => {
  await throwWithSpace(page); await settled(page);
  const first = await page.evaluate(() => window.__dice.state().throwId);
  const handles = await page.evaluate(() => window.__dice.bodies().map((b) => b.handle));
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'hand');
  await throwWithSpace(page); await settled(page);
  expect(await page.evaluate(() => window.__dice.state().throwId)).toBe(first + 1);
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(2);
  expect(await page.evaluate(() => window.__dice.bodies().map((b) => b.handle))).toEqual(handles);
});

test('pointer capture launches once and keyboard controls keep their native scope', async ({ page }) => {
  const area = page.locator('.game-area');
  const before = await page.evaluate(() => window.__dice.state().aim);
  await area.focus(); await page.keyboard.press('ArrowRight');
  expect((await page.evaluate(() => window.__dice.state().aim))[0]).toBeCloseTo(before[0] + 0.5);
  await page.getByRole('button', { name: 'd6', exact: true }).focus();
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.__dice.state().phase)).toBe('hand');
  await ready(page, 1);
  const rect = (await area.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => window.__dice.state().phase === 'charging');
  await expect(page.getByRole('progressbar', { name: 'Força' })).toBeVisible();
  expect(await area.evaluate((el) => el.hasPointerCapture(1))).toBe(true);
  await page.mouse.move(2, 2); await page.mouse.up();
  await settled(page);
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(1);
  expect(await topValue(page, 0)).toBe(String((await page.evaluate(() => window.__dice.state().results))![0]));
});

test('blur cancels charge and reduced motion returns without a flight', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const area = page.locator('.game-area');
  await area.focus(); await page.keyboard.down('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'charging');
  await page.getByRole('button', { name: 'd6', exact: true }).focus();
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.__dice.state().phase)).toBe('hand');
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(0);
  await page.evaluate(() => window.__dice.select('d6', 1)); await ready(page, 1);
  await throwWithSpace(page);
  await settled(page);
  await area.focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'hand');
  const body = (await page.evaluate(() => window.__dice.bodies()))[0];
  expect(body.type).toBe(2); expect(body.p[1]).toBeCloseTo(3, 2); expect(body.p[2]).toBeCloseTo(3, 2);
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(1);
});

for (const source of ['pointer', 'key'] as const) {
  test(`secondary touch release preserves an active ${source} charge`, async ({ page }) => {
    const area = page.locator('.game-area');
    await area.focus();
    await area.evaluate((el) => {
      el.dataset.pointerEvents = '[]';
      for (const type of ['pointerdown', 'pointerup', 'lostpointercapture']) el.addEventListener(type, (event) => {
        const events = JSON.parse(el.dataset.pointerEvents!);
        events.push({ type: event.type, id: (event as PointerEvent).pointerId });
        el.dataset.pointerEvents = JSON.stringify(events);
      });
    });
    const rect = (await area.boundingBox())!;
    const primary = { x: rect.x + rect.width * 0.4, y: rect.y + rect.height * 0.5, id: 1 };
    const secondary = { x: rect.x + rect.width * 0.6, y: rect.y + rect.height * 0.5, id: 2 };
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    if (source === 'pointer') await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [primary] });
    else await page.keyboard.down('Space');
    expect(await page.evaluate(() => window.__dice.state().phase)).toBe('charging');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: source === 'pointer' ? [primary, secondary] : [secondary] });
    const secondaryId = await area.evaluate((el) => JSON.parse(el.dataset.pointerEvents!).filter((e: { type: string }) => e.type === 'pointerdown').at(-1).id as number);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [secondary] });
    await expect.poll(() => area.evaluate((el) => JSON.parse(el.dataset.pointerEvents!)), { timeout: 5000 }).toContainEqual({ type: 'lostpointercapture', id: secondaryId });
    expect(await page.evaluate(() => window.__dice.state().phase)).toBe('charging');
    expect(await page.evaluate(() => window.__dice.launches().count)).toBe(0);
    if (source === 'pointer') await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.keyboard.up('Space');
    await settled(page);
    expect(await page.evaluate(() => window.__dice.launches().count)).toBe(1);
    await cdp.detach();
  });
}

for (const width of [1440, 390]) {
  test(`controls leave the complete game area usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    const area = (await page.locator('.game-area').boundingBox())!;
    const canvas = (await page.locator('canvas').boundingBox())!;
    const header = (await page.locator('header').boundingBox())!, footer = (await page.locator('footer').boundingBox())!;
    expect(canvas).toEqual(area);
    expect(header.y + header.height).toBeLessThanOrEqual(area.y);
    expect(area.y + area.height).toBeLessThanOrEqual(footer.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.getByRole('heading', { name: 'Rolador de dados' })).toBeVisible();
    await page.evaluate(() => window.__dice.select('d6', 1)); await ready(page, 1);
    await throwWithSpace(page);
    await settled(page);
    await expect(page.getByTestId('result')).not.toBeEmpty();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: `screens/controls-${width}.png` });
  });
}
