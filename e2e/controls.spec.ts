import { test, expect, type Page } from '@playwright/test';

const dice = (p: Page) => p.evaluate(() => window.__dice.state().dice);
const panel = (p: Page) => p.locator('#table-panel');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready === true);
});

test('the hand holds 1 to 10 dice: with 1 the − is disabled, with 10 every Adicionar button is', async ({ page }) => {
  const adds = page.getByRole('group', { name: 'Dados', exact: true }).getByRole('button', { name: /^Adicionar / });
  expect(await dice(page)).toEqual(['d20']);
  await expect(page.getByRole('button', { name: 'Remover d20' })).toBeDisabled();
  expect(await adds.count()).toBeGreaterThan(1);
  for (const add of await adds.all()) await expect(add).toBeEnabled();
  for (let n = 2; n <= 10; n++) {
    await page.getByRole('button', { name: 'Adicionar d6', exact: true }).click();
    expect(await dice(page)).toHaveLength(n);
  }
  for (const add of await adds.all()) await expect(add).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remover d6' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Remover d20' })).toBeEnabled();
});

test('M opens "Personalizar mesa" and Esc closes it', async ({ page }) => {
  await expect(panel(page)).toHaveAttribute('data-open', 'false');
  await page.locator('.game-area').focus();
  await page.keyboard.press('m');
  await expect(panel(page)).toHaveAttribute('data-open', 'true');
  await expect(page.getByRole('complementary', { name: 'Personalizar mesa' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveAttribute('data-open', 'false');
  await expect(page.locator('.chat-toggle', { hasText: 'Mesa' })).toBeFocused();
});

test('M typed in the chat box stays in the box and does not open the table panel', async ({ page }) => {
  await page.keyboard.press('c');
  const input = page.getByRole('textbox', { name: /Dados/ });
  await expect(input).toBeFocused();
  // One key at a time: M toggles the panel, so "mM" in one go would open and close it and could never fail.
  for (const [key, value] of [['m', 'm'], ['M', 'mM']]) {
    await input.press(key);
    await expect(input).toHaveValue(value);
    // The key was handled (the box has it); let React render whatever it caused before reading the panel.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(panel(page)).toHaveAttribute('data-open', 'false');
  }
  await expect(page.getByRole('complementary', { name: 'Chat de dados' })).toBeVisible();
});
