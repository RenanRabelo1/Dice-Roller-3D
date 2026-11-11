import { expect, test } from '@playwright/test';

// R10: when the 3D side cannot run, the player reads a plain message (not a blank page) and the controls stay.
const message = (page: import('@playwright/test').Page) => page.getByTestId('failure');

test('without WebGL: says so and shows no canvas', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/i.test(type) ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/');
  await expect(message(page)).toHaveText('Este navegador não tem WebGL ativo. Abra no Chrome, Edge ou Firefox atualizados.');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Rolador de dados' })).toBeVisible(); // the page is still there
});

test('when the renderer fails to start: says the 3D failed', async ({ page }) => {
  await page.addInitScript(() => {
    // The first WebGL context (the app's own probe) works; the renderer's own request fails.
    const original = HTMLCanvasElement.prototype.getContext;
    let probes = 0;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type) && ++probes > 1) throw new Error('simulated renderer failure');
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/');
  await expect(message(page)).toHaveText('O 3D falhou neste navegador. Recarregue a página.');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('when the physics cannot load: says so', async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => Promise.reject(new Error('simulated wasm failure'));
    WebAssembly.instantiate = fail as unknown as typeof WebAssembly.instantiate;
    WebAssembly.instantiateStreaming = fail as unknown as typeof WebAssembly.instantiateStreaming;
  });
  await page.goto('/');
  await expect(message(page)).toHaveText('Não foi possível carregar a física. Recarregue a página.');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('a healthy page shows no message', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
  await expect(message(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.__dice.state().error)).toBeNull();
});
