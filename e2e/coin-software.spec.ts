import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader'] } });

test('reduces pixel load and keeps ten-coin pickup moving', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
  await page.evaluate(() => window.__dice.select(Array(10).fill('coin')));
  await page.waitForFunction(() => window.__dice.bodies().length === 10 && window.__dice.state().ready);
  const pickups = [];
  for (let roll = 0; roll < 3; roll++) {
    await page.locator('.game-area').focus();
    await page.keyboard.down('Space'); await page.waitForTimeout(350); await page.keyboard.up('Space');
    await page.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; });
    if (!roll) await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas')!;
      return canvas.width / canvas.clientWidth < 0.6;
    }, null, { timeout: 2000 });
    const probe = page.evaluate(() => new Promise<number[]>((resolve) => {
      const frames: number[] = [];
      let previous = performance.now(), returning = false;
      const frame = (at: number) => {
        const phase = window.__dice.state().phase;
        if (phase === 'returning') { returning = true; frames.push(at - previous); }
        else if (returning && phase === 'hand') { resolve(frames); return; }
        previous = at; requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }));
    await page.keyboard.press('Space');
    pickups.push(await probe);
  }
  const medians = pickups.map((p) => p.sort((a, b) => a - b)[Math.floor(p.length / 2)]).sort((a, b) => a - b);
  await testInfo.attach('software-pickup-frames', { body: JSON.stringify(pickups), contentType: 'application/json' });
  expect(pickups[0].length).toBeGreaterThanOrEqual(5);
  expect(pickups.flat().length).toBeGreaterThanOrEqual(15);
  expect(medians[1]).toBeLessThan(125);
});
