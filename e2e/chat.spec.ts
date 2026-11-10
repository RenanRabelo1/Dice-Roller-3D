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

test('bad notation answers with an error and keeps the dice', async ({ page }) => {
  await page.keyboard.press('c');
  const input = page.getByRole('textbox', { name: /Dados/ });
  await input.fill('2d7');
  await page.keyboard.press('Enter');
  await expect(page.locator('.chat-log [data-error]')).toContainText('Não entendi');
  expect(await dice(page)).toEqual(['d20']);
  await expect(input).toHaveValue('2d7');
});
