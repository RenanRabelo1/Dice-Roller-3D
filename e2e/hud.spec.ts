import { test, expect, type Page } from '@playwright/test';
import type { DieKind, Omen } from '../src/modules/regras/index';
import { ready } from './esperas';

const shown = (page: Page) => page.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; }, null, { timeout: 60_000 });
const roll = async (page: Page) => {
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(300);
  await page.keyboard.up('Space');
};
const rig = async (page: Page, dice: DieKind[], omen: Omen | null) => {
  await page.evaluate(({ dice, omen }) => { window.__dice.select(dice); window.__dice.rigOmen(omen); }, { dice, omen });
  await ready(page, dice.length);
};
const back = async (page: Page) => { await page.keyboard.press('Space'); await page.waitForFunction(() => window.__dice.state().phase === 'hand'); };
const programs = (page: Page) => page.evaluate(() => window.__dice.table().programs);

test.beforeEach(async ({ page }) => { await page.goto('/'); await ready(page, 1); });

test('phase: hand, charging with force, rolling, settled with the caption', async ({ page }) => {
  const app = page.locator('.app');
  await expect(app).toHaveAttribute('data-fase', 'hand');
  await expect(app).toHaveAttribute('data-perfil', 'leve'); // the E2E runs on SwiftShader
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space');
  await expect(app).toHaveAttribute('data-fase', 'charging');
  await expect.poll(() => app.evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--forca')))).toBeGreaterThan(0);
  await page.keyboard.up('Space');
  await expect(app).toHaveAttribute('data-fase', 'rolling');
  await shown(page);
  await expect(app).toHaveAttribute('data-fase', 'settled');
  await expect(page.getByTestId('result')).not.toBeEmpty();
});

test('the caption carries the omen only on an omen throw', async ({ page }) => {
  await rig(page, ['d20'], { crits: [0], fumbles: [] });
  await roll(page);
  await shown(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-presagio', 'crit');
  await back(page);
  await rig(page, ['d20'], null);
  await roll(page);
  await shown(page);
  await expect(page.getByTestId('result')).not.toHaveAttribute('data-presagio');
});

for (const [nome, url] of [['leve', '/'], ['completo', '/?perfil=completo']] as const) {
  test(`the light count never changes after warm-up (${nome})`, async ({ page }) => {
    await page.goto(url); await ready(page, 1);
    if (nome === 'completo') await expect(page.locator('.app')).toHaveAttribute('data-perfil', 'completo');
    await roll(page); await shown(page); await back(page); // warm-up
    const base = await programs(page);
    await roll(page); await shown(page); await back(page);
    await rig(page, ['d20'], { crits: [0], fumbles: [] });
    await roll(page); await shown(page); await back(page);
    await rig(page, ['d100'], { crits: [0], fumbles: [] }); // kraken
    await roll(page); await shown(page);
    expect(await programs(page)).toBeLessThanOrEqual(base); // three may drop an unused program; a light mounting would add one
  });
}

test('the full profile mounts exactly 3 more lights than the light one (candle, charge, highlight)', async ({ page }) => {
  const luzes = async (url: string) => {
    await page.goto(url); await ready(page, 1);
    await roll(page); await shown(page);
    return page.evaluate(() => window.__dice.luzes());
  };
  const leve = await luzes('/?perfil=leve');
  const completo = await luzes('/?perfil=completo');
  console.log(`point lights: leve ${leve}, completo ${completo}`);
  expect(completo - leve).toBe(3);
});

test('rolling closes the cinema bands (a transform, not a gradient)', async ({ page }) => {
  await roll(page);
  await expect(page.locator('.app')).toHaveAttribute('data-fase', 'rolling');
  // scaleY(0) is also a matrix, never 'none': read the vertical scale (4th value) and wait for it to open fully
  await expect.poll(() => page.locator('.faixa').evaluateAll((els) => els.map((el) => new DOMMatrix(getComputedStyle(el).transform).d))).toEqual([1, 1]);
});

test('reduced motion: the app says so and the caption stops animating', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await rig(page, ['d20'], { crits: [0], fumbles: [] });
  await roll(page);
  await shown(page);
  await expect(page.locator('.app')).toHaveAttribute('data-movimento', 'reduzido');
  expect(await page.locator('output strong').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
