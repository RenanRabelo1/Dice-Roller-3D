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

const capitulo = (p: Page, id: string) => p.locator(`#${id}`);
const botao = (p: Page, nome: string) => p.locator('.chat-toggle', { hasText: nome });

test('one chapter at a time: C swaps the table for the chat and only the chat button is expanded', async ({ page }) => {
  await page.locator('.game-area').focus();
  await page.keyboard.press('m');
  await expect(capitulo(page, 'table-panel')).toHaveAttribute('data-open', 'true');
  await page.keyboard.press('c'); // focus is outside any field
  await expect(capitulo(page, 'table-panel')).toHaveAttribute('data-open', 'false');
  await expect(capitulo(page, 'dice-chat')).toHaveAttribute('data-open', 'true');
  for (const [nome, aberto] of [['Mesa', 'false'], ['Meus dados', 'false'], ['Importar dado', 'false'], ['Chat', 'true']])
    await expect(botao(page, nome)).toHaveAttribute('aria-expanded', aberto);
});

test('Esc in the chat gives the focus back to the Chat button', async ({ page }) => {
  await page.locator('.game-area').focus();
  await page.keyboard.press('c');
  await expect(capitulo(page, 'dice-chat')).toHaveAttribute('data-open', 'true');
  await page.keyboard.press('Escape');
  await expect(capitulo(page, 'dice-chat')).toHaveAttribute('data-open', 'false');
  await expect(botao(page, 'Chat')).toBeFocused();
});

test('the wheel starts open, D folds and reopens it, and a "d" typed in the chat leaves it alone', async ({ page }) => {
  const grupo = page.getByRole('group', { name: 'Dados', exact: true });
  const escolher = page.getByRole('button', { name: 'Escolher dados' });
  await expect(grupo).toBeVisible();
  await expect(escolher).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.game-area').focus();
  await page.keyboard.press('d');
  await expect(grupo).not.toBeVisible();
  await expect(escolher).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('d');
  await expect(grupo).toBeVisible();
  await expect(escolher).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('c');
  const input = page.getByRole('textbox', { name: /Dados/ });
  await expect(input).toBeFocused();
  await input.press('d');
  await expect(input).toHaveValue('d');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(escolher).toHaveAttribute('aria-expanded', 'true');
});

test('"Meus dados" with nothing imported says so, and "Forjar um dado novo" turns to the Importar dado chapter', async ({ page }) => {
  await botao(page, 'Meus dados').click();
  const meus = capitulo(page, 'meus-dados');
  await expect(meus).toHaveAttribute('data-open', 'true');
  await expect(meus.getByText('Nenhum dado importado ainda.')).toBeVisible();
  await meus.getByRole('button', { name: 'Forjar um dado novo' }).click();
  await expect(meus).toHaveAttribute('data-open', 'false');
  await expect(capitulo(page, 'import-die')).toHaveAttribute('data-open', 'true');
});
