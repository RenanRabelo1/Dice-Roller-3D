import { test, expect, type Page } from '@playwright/test';
import { ready, settled, throwWithSpace } from './esperas';

// The physics worker, replaced by addInitScript (no hook in src/): LoopDoArremesso in src/modules/arremesso/scene waits
// WORKER_TIMEOUT (2 s) for an answer, then falls back to the main thread (terminate + local presimulation).
const topValue = async (p: Page, i: number) => {
  const [labels, cam] = await p.evaluate((i) => [window.__dice.labels(i), window.__dice.camera()] as const, i);
  const toward = (l: (typeof labels)[number]) => {
    const d = l.position.map((v, k) => cam[k] - v), n = Math.hypot(...d);
    return l.normal.reduce((s, v, k) => s + v * d[k] / n, 0);
  };
  return String(labels.reduce((a, b) => toward(b) > toward(a) ? b : a).value || 10); // a d10's 0 face is the 10
};
type Silent = { requests: number; sentAt: number | null; terminatedAt: number | null; poisonedReads: number };
const silent = (p: Page) => p.evaluate(() => (window as unknown as { silentWorker: Silent }).silentWorker);

// A presim worker that takes every request and never answers. With `poison`, the request it receives (the very object
// Stage keeps for the local fallback: the fake does not clone it) throws on read, so the local presimulation fails too.
// This depends on Stage passing the same object to `postMessage` and to `presimulateFor`; if it goes red because a
// refactoring cloned the request, redo the simulation, do not loosen the assertions.
const silentWorker = (p: Page, poison: boolean) => p.addInitScript((poison) => {
  const NativeWorker = Worker, log: Silent = { requests: 0, sentAt: null, terminatedAt: null, poisonedReads: 0 };
  Object.assign(window, { silentWorker: log });
  window.Worker = class extends NativeWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      if (!String(url).includes('presim.worker')) return; // other workers (text) stay real
      let asked = false;
      this.postMessage = (request: Record<string, unknown>) => {
        asked = true; log.requests++; log.sentAt = performance.now();
        if (poison) for (const key of ['dice', 'start', 'launch', 'customs']) {
          Object.defineProperty(request, key, { get() { log.poisonedReads++; throw new Error('simulated local physics failure'); } });
        }
      };
      const stop = this.terminate.bind(this);
      // Only the worker that got the request counts: dev StrictMode also mounts and terminates a first, unused one.
      this.terminate = () => { if (asked) log.terminatedAt ??= performance.now(); stop(); };
    }
  };
}, poison);

test('a worker that never answers: after about 2 s the roll is computed locally and the shown faces are the result', async ({ page }) => {
  await silentWorker(page, false);
  await page.goto('/'); await ready(page);
  await page.evaluate(() => window.__dice.select(['d6', 'd20'])); await ready(page, 2);
  await throwWithSpace(page); await settled(page);
  const log = await silent(page);
  expect(log.requests).toBe(1);
  const waited = log.terminatedAt! - log.sentAt!;
  // Nothing falls back before WORKER_TIMEOUT (2000 ms). The fake stamps `sentAt` a moment after Stage's own `sent`,
  // so the measured wait can come out a hair under 2000; 10 ms of slack covers that and still rules out an early fallback.
  expect(waited).toBeGreaterThanOrEqual(1990);
  expect(waited).toBeLessThan(5000); // one physics step past it, with room for software GL
  const results = (await page.evaluate(() => window.__dice.state().results))!;
  expect(results).toHaveLength(2);
  for (let i = 0; i < 2; i++) expect(String(results[i])).toBe(await topValue(page, i));
  await expect(page.getByTestId('result')).toContainText(String(results[0] + results[1]));
  expect(await page.evaluate(() => window.__dice.state().error)).toBeNull();
});

// Characterizes TODAY's behaviour (docs/diagnostico.md §10, item 1), not the desired one: the physics failure takes the
// 3D down with the "could not load" message, while the footer says the dice went back to the hand.
test('worker and local presimulation both fail: physics error, the load-failure message, and no canvas', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await silentWorker(page, true);
  await page.goto('/'); await ready(page, 1);
  await throwWithSpace(page);
  await page.waitForFunction(() => window.__dice.state().phase === 'rolling');
  const thrown = await page.evaluate(() => window.__dice.state().throwId);
  await page.waitForFunction(() => window.__dice.state().error !== null);
  expect(errors.some((e) => e.includes('simulated local physics failure'))).toBe(true); // the local fallback did run, and threw
  const log = await silent(page);
  expect(log.requests).toBe(1);
  expect(log.poisonedReads).toBeGreaterThanOrEqual(1); // the local presimulation read the poisoned request
  const state = await page.evaluate(() => window.__dice.state());
  expect(state.error).toBe('physics');
  expect(state.phase).toBe('hand'); // the store put the same dice back (setDice): new throwId, no result
  expect(state.dice).toEqual(['d20']);
  expect(state.throwId).toBe(thrown + 1);
  expect(state.results).toBeNull();
  await expect(page.getByTestId('failure')).toHaveText('Não foi possível carregar a física. Recarregue a página.');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('footer.status > p')).toHaveText('A física não respondeu; os dados voltaram para a mão. Tente jogar de novo.');
  await expect(page.getByTestId('result')).toBeEmpty();
  await expect(page.getByRole('heading', { name: 'Rolador de dados' })).toBeVisible();
});
