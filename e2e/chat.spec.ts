import { test, expect } from '@playwright/test';

const dice = (p: import('@playwright/test').Page) => p.evaluate(() => window.__dice.state().dice);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready === true);
});

test('C opens the chat; compact notation + Enter puts those dice in the hand', async ({ page }) => {
  const chat = page.getByRole('complementary', { name: 'Chat de dados' });
  await expect(chat).toBeHidden();
  await page.keyboard.press('c');
  await expect(chat).toBeVisible();
  const input = page.getByRole('textbox', { name: /Dados/ });
  await expect(input).toBeFocused();
  await input.fill('2d10d100d4');
  await page.keyboard.press('Enter');
  expect(await dice(page)).toEqual(['d4', 'd10', 'd10', 'd100']);
  await expect(chat).toContainText('Na mão: 1d4 + 2d10 + 1d100');
  await page.waitForFunction(() => window.__dice.state().ready && window.__dice.bodies().length === 4);
  await expect(input).toHaveValue('');
});

test('the button opens it, Aplicar applies "2d10 + d100", typing c in the box does not close it, Esc does', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /Chat/ });
  await toggle.click();
  const chat = page.getByRole('complementary', { name: 'Chat de dados' });
  await expect(chat).toBeVisible();
  const input = page.getByRole('textbox', { name: /Dados/ });
  await input.pressSequentially('c');
  await expect(chat).toBeVisible();
  await input.fill('2d10 + d100');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  expect(await dice(page)).toEqual(['d10', 'd10', 'd100']);
  await page.keyboard.press('Escape');
  await expect(chat).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('Vampire dice from the chat: symbols on the faces, and the panel value is the face each die shows', async ({ page }) => {
  await page.keyboard.press('c');
  await page.getByRole('textbox', { name: /Dados/ }).fill('2d10v + 1d10fome');
  await page.keyboard.press('Enter');
  expect(await dice(page)).toEqual(['vtm', 'vtm', 'hunger']);
  await expect(page.getByRole('complementary', { name: 'Chat de dados' })).toContainText('Na mão: 2d10 Vampiro + 1d10 Fome');
  await page.waitForFunction(() => window.__dice.state().ready && window.__dice.bodies().length === 3);
  const faces = (i: number) => page.evaluate((i) => Object.fromEntries(window.__dice.labels(i).map((l) => [l.value, l.text])), i);
  const ankhs = { 6: 'ankh', 7: 'ankh', 8: 'ankh', 9: 'ankh' };
  expect(await faces(0)).toEqual({ 1: '', 2: '', 3: '', 4: '', 5: '', ...ankhs, 0: 'crit' });
  expect(await faces(2)).toEqual({ 1: 'skull', 2: '', 3: '', 4: '', 5: '', ...ankhs, 0: 'fangs' });
  await page.keyboard.press('Escape');
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(700); await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.__dice.numbersVisible(0))).toBe(true);
  await page.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; }, null, { timeout: 90_000 });
  const results = (await page.evaluate(() => window.__dice.state().results))!;
  expect(results).toHaveLength(3);
  for (let i = 0; i < 3; i++) {
    const [labels, cam] = await page.evaluate((i) => [window.__dice.labels(i), window.__dice.camera()] as const, i);
    const toward = (l: (typeof labels)[number]) => { const d = l.position.map((v, k) => cam[k] - v), n = Math.hypot(...d); return l.normal.reduce((s, v, k) => s + v * d[k] / n, 0); };
    const shown = labels.reduce((a, b) => (toward(b) > toward(a) ? b : a)); // the rolled face looks at the camera
    expect(shown.value || 10).toBe(results[i]); // the 0 face is the 10
  }
  await expect(page.getByTestId('result')).toContainText(`d10 Vampiro: ${results[0]} + ${results[1]} · d10 Fome: ${results[2]}`);
});

test('"bola de fogo" puts 8 fire d6 in the hand, and the d6 Fogo button adds one more', async ({ page }) => {
  await page.keyboard.press('c');
  await page.getByRole('textbox', { name: /Dados/ }).fill('bola de fogo');
  await page.keyboard.press('Enter');
  expect(await dice(page)).toEqual(Array(8).fill('fire'));
  await expect(page.getByRole('complementary', { name: 'Chat de dados' })).toContainText('Na mão: 8d6 Fogo');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Adicionar d6 Fogo' }).click();
  expect(await dice(page)).toEqual(Array(9).fill('fire'));
  await expect(page.getByRole('button', { name: 'Adicionar d6 Fogo' })).toHaveText('9d6 Fogo');
  await page.waitForFunction(() => window.__dice.state().ready && window.__dice.bodies().length === 9);
  expect(await page.evaluate(() => window.__dice.labels(0).map((l) => l.text).sort())).toEqual(['1', '2', '3', '4', '5', '6']);
});

test('bad notation answers with an error and keeps the dice', async ({ page }) => {
  await page.keyboard.press('c');
  const input = page.getByRole('textbox', { name: /Dados/ });
  await input.fill('2d7');
  await page.keyboard.press('Enter');
  await expect(page.locator('.chat-log [data-error]')).toContainText('Não entendi');
  expect(await dice(page)).toEqual(['d20']);
  await expect(input).toHaveValue('2d7');
});
