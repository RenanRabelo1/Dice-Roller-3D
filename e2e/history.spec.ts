import { test, expect, type Page, type Route } from '@playwright/test';

// The test server builds the app with VITE_API_URL = http://127.0.0.1:5180, the API stub (playwright.config.ts),
// so every published result is POSTed to its /rolls; here the route answers it instead of the stub.
const ROLLS = 'http://127.0.0.1:5180/rolls';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
type Post = { body: { playerId: string; dice: { kind: string; value: number }[]; force: number }; results: number[] | null; throwId: number };

const ready = (p: Page, n?: number) => p.waitForFunction((n) => window.__dice?.state().ready && (n === undefined || window.__dice.bodies().length === n), n);
const settled = (p: Page) => p.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; }, null, { timeout: 90_000 });
const throwWithSpace = async (p: Page) => {
  await p.locator('.game-area').focus();
  await p.keyboard.down('Space'); await p.waitForTimeout(700); await p.keyboard.up('Space');
};
const backToHand = async (p: Page) => {
  await p.locator('.game-area').focus(); await p.keyboard.press('Space');
  await p.waitForFunction(() => window.__dice.state().phase === 'hand');
};
const state = (p: Page) => p.evaluate(() => window.__dice.state());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Records every POST with the game state seen when it arrives, and answers with `status`.
const intercept = async (page: Page, status = 201) => {
  const posts: Post[] = [];
  await page.route(ROLLS, async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS }); // CORS preflight
    if (request.method() === 'POST') {
      const s = await page.evaluate(() => window.__dice.state());
      posts.push({ body: request.postDataJSON(), results: s.results, throwId: s.throwId });
    }
    await route.fulfill({ status, headers: CORS, contentType: 'application/json', body: status < 300 ? '{"ok":true}' : '{"error":"boom"}' });
  });
  return posts;
};

test('one d20 throw sends exactly one POST, when the result is published, with the current body', async ({ page }) => {
  const posts = await intercept(page);
  await page.goto('/'); await ready(page);
  await page.evaluate(() => window.__dice.select(['d20'])); await ready(page, 1);
  await throwWithSpace(page);
  await expect.poll(() => posts.length, { timeout: 90_000 }).toBe(1);
  await settled(page);
  await page.waitForTimeout(1000); // nothing else goes out after the showcase
  expect(posts).toHaveLength(1);
  const s = await state(page);
  const [{ body, results, throwId }] = posts;
  expect(Object.keys(body).sort()).toEqual(['dice', 'force', 'playerId']);
  expect(body.playerId).toMatch(UUID);
  expect(body.dice).toEqual([{ kind: 'd20', value: s.results![0] }]);
  expect(body.force).toBeGreaterThanOrEqual(0); expect(body.force).toBeLessThanOrEqual(1);
  // Already published when it went out: same throw, same results.
  expect(throwId).toBe(s.throwId); expect(results).toEqual(s.results);
});

test('a mixed selection sends the dice in the order of the selection, with the values of results', async ({ page }) => {
  const posts = await intercept(page);
  await page.goto('/'); await ready(page);
  await page.evaluate(() => window.__dice.select(['d6', 'd10', 'coin'])); await ready(page, 3);
  await throwWithSpace(page); await settled(page);
  await expect.poll(() => posts.length).toBe(1);
  const s = await state(page);
  expect(posts[0].body.dice).toEqual(s.dice.map((kind, i) => ({ kind, value: s.results![i] })));
  expect(posts[0].body.dice.map((d) => d.kind)).toEqual(['d6', 'd10', 'coin']);
});

test('two throws send two POSTs with the same playerId, and it survives a reload', async ({ page }) => {
  const posts = await intercept(page);
  await page.goto('/'); await ready(page);
  await page.evaluate(() => window.__dice.select(['d6'])); await ready(page, 1);
  await throwWithSpace(page); await settled(page);
  await backToHand(page);
  await throwWithSpace(page); await settled(page);
  await expect.poll(() => posts.length).toBe(2);
  expect(posts[1].body.playerId).toMatch(UUID);
  expect(posts[1].body.playerId).toBe(posts[0].body.playerId);
  expect(posts[1].throwId).toBe(posts[0].throwId + 1);
  await page.reload(); await ready(page);
  await page.evaluate(() => window.__dice.select(['d6'])); await ready(page, 1);
  await throwWithSpace(page); await settled(page);
  await expect.poll(() => posts.length).toBe(3);
  expect(posts[2].body.playerId).toBe(posts[0].body.playerId);
});

test('a 500 from the API changes nothing in the game: the result shows and the next throw works', async ({ page }) => {
  const posts = await intercept(page, 500);
  await page.goto('/'); await ready(page);
  await page.evaluate(() => window.__dice.select(['d6'])); await ready(page, 1);
  await throwWithSpace(page); await settled(page);
  await expect.poll(() => posts.length).toBe(1);
  const first = await state(page);
  expect(first.error).toBeFalsy();
  await expect(page.getByTestId('result')).toContainText(String(first.results![0]));
  await backToHand(page);
  await throwWithSpace(page); await settled(page);
  await expect.poll(() => posts.length).toBe(2);
  const second = await state(page);
  expect(second.throwId).toBe(first.throwId + 1);
  expect(second.error).toBeFalsy();
  await expect(page.getByTestId('result')).toContainText(String(second.results![0]));
  expect(posts[1].body.dice).toEqual([{ kind: 'd6', value: second.results![0] }]);
});
