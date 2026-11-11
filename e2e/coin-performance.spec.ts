import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: [] } });

test('ten coins can launch and return repeatedly within the frame budget', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const NativeWorker = Worker, debug: Record<string, unknown> = {};
    Object.assign(window, { coinDebug: debug });
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes('presim.worker')) {
          const send = this.postMessage.bind(this);
          this.postMessage = (request: unknown) => { debug.request = request; send(request); };
          this.addEventListener('message', ({ data }) => { if (data.rec) debug.result = { raw: data.rec.raw, final: data.rec.frames.at(-1) }; });
        }
      }
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
  await page.evaluate(() => window.__dice.select(Array(10).fill('coin')));
  await page.waitForFunction(() => window.__dice.bodies().length === 10 && window.__dice.state().ready);
  await page.evaluate(async (path) => {
    const { useDice } = await import(path);
    useDice.subscribe((s: { gesture: { phase: string } }, previous: { gesture: { phase: string } }) => {
      if (s.gesture.phase === 'settled' && previous.gesture.phase === 'rolling') {
        Object.assign((window as unknown as { coinDebug: object }).coinDebug, { published: window.__dice.bodies() });
      }
    });
  }, '/src/store.ts');
  await expect.poll(() => page.workers().some((w) => w.url().includes('presim.worker'))).toBe(true);
  // Separate warm-up from the interaction budget; no simulated clock in this test.
  await page.waitForTimeout(3000);
  const reports = [];
  for (let roll = 0; roll < 4; roll++) {
    await page.evaluate(() => {
      const samples: { phase: string; ms: number }[] = [];
      let previous = performance.now(), running = true;
      const frame = (at: number) => {
        if (!running) return;
        samples.push({ phase: window.__dice.state().phase, ms: at - previous });
        previous = at; requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      Object.assign(window, { stopCoinProbe: () => { running = false; return samples; } });
    });
    await page.locator('.game-area').focus();
    if (roll) {
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__dice.state().phase === 'hand');
      const hand = await page.evaluate(() => window.__dice.bodies());
      hand.forEach((b) => { // back in the hand's whirl: lifted, behind the front wall, nowhere near the camera
        expect(b.p[1]).toBeGreaterThan(0.5); expect(b.p[1]).toBeLessThan(5.5);
        expect(b.p[2]).toBeGreaterThan(-1); expect(b.p[2]).toBeLessThan(4);
      });
    }
    await page.keyboard.down('Space'); await page.waitForTimeout(350); await page.keyboard.up('Space');
    await page.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; });
    const result = await page.evaluate(() => {
      const samples = (window as unknown as { stopCoinProbe(): { phase: string; ms: number }[] }).stopCoinProbe();
      const debug = (window as unknown as { coinDebug: { result: { final: { p: number[]; q: number[] }[] }; published: { p: number[]; q: number[] }[] } }).coinDebug;
      return {
        values: window.__dice.state().results,
        faces: Array.from({ length: 10 }, (_, i) => window.__dice.labels(i).reduce((a, b) => a.normal[1] > b.normal[1] ? a : b).value),
        highlights: window.__dice.highlights().filter((h) => h.visible).map((h) => h.text),
        moving: samples.filter((s) => s.phase === 'rolling' || s.phase === 'returning').map((s) => s.ms).sort((a, b) => a - b),
        debug: { ...(window as unknown as { coinDebug: object }).coinDebug, bodies: window.__dice.bodies(), meshes: window.__dice.meshes(), normals: Array.from({ length: 10 }, (_, i) => window.__dice.labels(i).map((l) => l.normal[1])) },
        publicationError: Math.max(...debug.result.final.flatMap((pose, i) => [...pose.p.map((v, k) => Math.abs(v - debug.published[i].p[k])), ...pose.q.map((v, k) => Math.abs(v - debug.published[i].q[k]))])),
      };
    });
    expect(result.faces, JSON.stringify(result.debug)).toEqual(result.values);
    expect(result.publicationError).toBeLessThan(1e-5);
    expect(result.highlights).toEqual(result.values!.map((v) => v === 1 ? 'Cara' : 'Coroa'));
    reports.push({ p95: result.moving[Math.floor(result.moving.length * 0.95)], max: result.moving.at(-1)! });
  }
  // Use repeated samples and a generous budget to tolerate scheduler noise on the host.
  await testInfo.attach('coin-frame-times', { body: JSON.stringify(reports), contentType: 'application/json' });
  expect(reports.filter((r) => r.p95 < 70 && r.max < 180).length).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

test('a delayed worker result cannot replace a new selection', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
  await expect.poll(() => page.workers().some((w) => w.url().includes('presim.worker'))).toBe(true);
  const worker = page.workers().find((w) => w.url().includes('presim.worker'))!;
  await worker.evaluate(() => {
    const send = self.postMessage.bind(self);
    self.postMessage = (data: unknown) => { setTimeout(() => send(data), 700); };
  });
  await page.evaluate(() => window.__dice.select(Array(10).fill('coin')));
  await page.waitForFunction(() => window.__dice.bodies().length === 10 && window.__dice.state().ready);
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(100); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__dice.launches().count === 1);
  await page.evaluate(() => window.__dice.select(['d6']));
  await page.waitForFunction(() => window.__dice.bodies().length === 1 && window.__dice.state().ready);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => ({ phase: window.__dice.state().phase, results: window.__dice.state().results }))).toEqual({ phase: 'hand', results: null });
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(100); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'settled');
  expect(await page.evaluate(() => window.__dice.state().results)).toHaveLength(1);
});

test('a worker startup failure falls back to a real roll', async ({ page }) => {
  let blocked = false;
  await page.route('**/presim.worker.ts?worker_file*', (route) => { blocked = true; return route.abort(); });
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
  await page.evaluate(() => window.__dice.select(['coin', 'coin']));
  await page.waitForFunction(() => window.__dice.bodies().length === 2 && window.__dice.state().ready);
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(100); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'settled');
  const result = await page.evaluate(() => ({ values: window.__dice.state().results, faces: [0, 1].map((i) => window.__dice.labels(i).reduce((a, b) => a.normal[1] > b.normal[1] ? a : b).value) }));
  expect(blocked).toBe(true);
  expect(result.values).toEqual(result.faces);
});
