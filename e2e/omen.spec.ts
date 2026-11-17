import { test, expect, type Page } from '@playwright/test';
import type { DieKind, Omen } from '../src/modules/regras/index';
import { ready } from './esperas';

const shown = (page: Page) => page.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; });
const roll = async (page: Page) => {
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(300);
  await page.keyboard.up('Space');
};
const rig = async (page: Page, dice: DieKind[], omen: Omen) => {
  await page.evaluate(({ dice, omen }) => { window.__dice.select(dice); window.__dice.rigOmen(omen); }, { dice, omen });
  await ready(page, dice.length);
};

test.beforeEach(async ({ page }) => { await page.goto('/'); await ready(page, 1); });

for (const { name, dice, omen, kind, overlay } of [
  { name: 'd20 lightning', dice: ['d20'], omen: { crits: [0], fumbles: [] }, kind: 'crit', overlay: '.omen-flash' },
  { name: 'd100 kraken', dice: ['d100'], omen: { crits: [0], fumbles: [] }, kind: 'crit', overlay: '.omen-deep' },
  { name: 'fumble fire and storm', dice: ['d20', 'd100'], omen: { crits: [], fumbles: [0, 1] }, kind: 'fumble', overlay: '.omen-rain' },
  { name: 'mixed duality', dice: ['d20', 'd100'], omen: { crits: [0], fumbles: [1] }, kind: 'duality', overlay: '.omen' },
  { name: 'both critical effects', dice: ['d20', 'd100'], omen: { crits: [0, 1], fumbles: [] }, kind: 'crit', overlay: '.omen-deep' },
] as { name: string; dice: DieKind[]; omen: Omen; kind: string; overlay: string }[]) {
  test(`${name} holds the result until the scene is restored`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await rig(page, dice, omen);
    await roll(page);
    await expect(page.locator('.game-area')).toHaveAttribute('data-omen', kind);
    await expect(page.locator(overlay)).toHaveCount(1);
    if (name === 'both critical effects') await expect(page.locator('.omen-flash')).toHaveCount(1);
    if (name === 'fumble fire and storm') await expect(page.locator('.omen-heat')).toHaveCount(1);
    await expect(page.locator('.omen-blood, .omen-heaven')).toHaveCount(0); // no more blood, no more angels
    await expect(page.getByTestId('result')).toBeEmpty();
    const before = await page.evaluate(() => ({ state: window.__dice.state(), bodies: window.__dice.bodies() }));
    expect(before.state.showcased).not.toBe(before.state.throwId);
    await page.waitForTimeout(350);
    await expect(page.getByTestId('result')).toBeEmpty();
    const after = await page.evaluate(() => window.__dice.bodies());
    before.bodies.forEach((body, i) => {
      if (dice[i] !== 'd100') body.p.forEach((v, k) => expect(after[i].p[k]).toBeCloseTo(v, 3));
    });
    await page.screenshot({ path: `screens/omen-${name.replaceAll(' ', '-')}.png` });
    await shown(page);
    const state = await page.evaluate(() => window.__dice.state());
    expect(state.omenDone).toBe(state.throwId);
    await expect(page.locator('.omen')).toHaveCount(0);
    await expect(page.locator('.game-area')).not.toHaveAttribute('data-omen');
    await expect(page.getByTestId('result')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
}

test('reduced motion skips even a forced omen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await rig(page, ['d20', 'd100'], { crits: [0], fumbles: [1] });
  await roll(page);
  await shown(page);
  expect(await page.evaluate(() => window.__dice.state().omen)).toBeNull();
  await expect(page.locator('.omen')).toHaveCount(0);
  await expect(page.getByTestId('result')).not.toBeEmpty();
});

test('enabling reduced motion during an omen releases the result', async ({ page }) => {
  await rig(page, ['d20', 'd100'], { crits: [0], fumbles: [1] });
  await roll(page);
  await expect(page.locator('.game-area')).toHaveAttribute('data-omen', 'duality');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.omen')).toHaveCount(0, { timeout: 800 });
  await expect(page.getByTestId('result')).not.toBeEmpty({ timeout: 800 });
  const before = await page.evaluate(() => window.__dice.bodies());
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => window.__dice.bodies());
  before.forEach((body, i) => body.p.forEach((v, k) => expect(after[i].p[k]).toBeCloseTo(v, 3)));
});

test('picking up during an omen cancels it and the next throw can play it again', async ({ page }) => {
  await rig(page, ['d20', 'd100'], { crits: [0], fumbles: [1] });
  await roll(page);
  await expect(page.locator('.game-area')).toHaveAttribute('data-omen', 'duality');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'hand');
  await expect(page.locator('.omen')).toHaveCount(0);
  await expect(page.locator('.game-area')).not.toHaveAttribute('data-omen');
  await roll(page);
  await expect(page.locator('.game-area')).toHaveAttribute('data-omen', 'duality');
  await shown(page);
  const state = await page.evaluate(() => window.__dice.state());
  expect(state.omenDone).toBe(state.throwId);
});

const toCamera = (page: Page, i: number) => page.evaluate((i) => {
  const p = window.__dice.bodies()[i].p, c = window.__dice.camera();
  return Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
}, i);

test('a d20 that rolls 1 catches fire, goes to the front burning and burns until picked up', async ({ page }) => {
  await rig(page, ['d20'], { crits: [], fumbles: [0] });
  await roll(page);
  await page.waitForFunction(() => window.__dice.state().burning);
  await expect(page.locator('.omen-heat')).toHaveCount(1);
  const onTray = await toCamera(page, 0);
  await shown(page);
  expect(await toCamera(page, 0)).toBeLessThan(onTray - 3); // at the front now
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__dice.state().burning)).toBe(true); // still on fire after the show
  await page.screenshot({ path: 'screens/omen-fire-front.png' });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'hand');
  expect(await page.evaluate(() => window.__dice.state().burning)).toBe(false);
});

test('a d100 that rolls 100 drifts toward you in the storm', async ({ page }) => {
  await rig(page, ['d100'], { crits: [], fumbles: [0] });
  await roll(page);
  await expect(page.locator('.game-area')).toHaveAttribute('data-storm');
  await expect(page.locator('.omen-rain i').first()).toBeAttached();
  const far = await toCamera(page, 0);
  await page.waitForTimeout(1600);
  const nearer = await toCamera(page, 0);
  expect(nearer).toBeLessThan(far);
  await page.screenshot({ path: 'screens/omen-storm.png' });
  await shown(page);
  expect(await toCamera(page, 0)).toBeLessThan(nearer);
  await expect(page.getByTestId('result')).not.toBeEmpty();
  await expect(page.locator('.game-area')).not.toHaveAttribute('data-storm');
});

// The animation test buttons (dev only), clicked with the dice in the hand as a player would.
const testPanel = async (page: Page) => {
  await page.getByRole('button', { name: 'Testar animações' }).click();
  return page.getByRole('group', { name: 'Animação dos próximos arremessos' });
};
for (const { name, dice, omen, die, value, sign } of [
  { name: 'Raio', dice: ['d20'], omen: 'crit', die: 'd20', value: 20, sign: '.omen-flash' },
  { name: 'Fogo', dice: ['d20'], omen: 'fumble', die: 'd20', value: 1, sign: '.omen-heat' },
  { name: 'Kraken', dice: ['d20', 'd100'], omen: 'crit', die: 'd100', value: 1, sign: '.omen-deep' },
  { name: 'Tempestade', dice: ['d20', 'd100'], omen: 'fumble', die: 'd100', value: 100, sign: '.omen-rain' },
  { name: 'Dualidade', dice: ['d20', 'd20'], omen: 'duality', die: '', value: 0, sign: '.omen' },
]) {
  test(`test button ${name}: two real throws land on its omen, then it turns off`, async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (m) => { if (m.type() === 'warning' && !/THREE|deprecated/.test(m.text())) warnings.push(m.text()); });
    const panel = await testPanel(page);
    const button = panel.getByRole('button', { name: new RegExp(name) });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await ready(page, dice.length);
    expect(await page.evaluate(() => window.__dice.state().dice)).toEqual(dice); // the dice it needs are in the hand
    expect(await page.evaluate(() => window.__dice.state().phase)).toBe('hand'); // the click did not throw
    for (let n = 0; n < 2; n++) {
      if (n) { await page.keyboard.press('Space'); await page.waitForFunction(() => window.__dice.state().phase === 'hand'); }
      await page.keyboard.down('Space'); await page.waitForTimeout(300); await page.keyboard.up('Space'); // focus is back on the table
      await page.waitForFunction(() => window.__dice.state().phase === 'settled', null, { timeout: 60_000 });
      const s = await page.evaluate(() => window.__dice.state());
      expect(s.omen, `results ${s.results} · ${warnings.join(' | ')}`).toBe(omen);
      if (die) expect(s.results![s.dice.lastIndexOf(die as DieKind)]).toBe(value);
      await expect(page.locator(sign)).toHaveCount(1);
      await shown(page);
    }
    await page.screenshot({ path: `screens/omen-test-${name}.png` });
    await page.keyboard.press('Space'); await page.waitForFunction(() => window.__dice.state().phase === 'hand');
    await button.click(); // with the dice in the hand: turns it off, does not throw
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => window.__dice.state().phase)).toBe('hand');
    await expect(page.getByRole('button', { name: 'Testar animações' })).toHaveText('Testar animações');
    expect(warnings).toEqual([]); // no throw fell back or missed its omen
  });
}
