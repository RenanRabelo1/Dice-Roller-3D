import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { noisePng } from '../tests/helpers/noisePng';
import { tableGlb } from '../tests/helpers/tableGlb';

// 1x1 PNG: enough for a backdrop / texture fixture.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const png = { name: 'fundo.png', mimeType: 'image/png', buffer: PNG };
const glbFile = (name: string, buffer: ArrayBuffer | Buffer) => ({ name, mimeType: 'model/gltf-binary', buffer: Buffer.from(buffer as ArrayBuffer) });

const table = (p: Page) => p.evaluate(() => window.__dice.table());
const panel = (p: Page) => p.locator('#table-panel');
const openPanel = async (p: Page) => {
  if (await panel(p).getAttribute('data-open') !== 'true') await p.locator('.chat-toggle', { hasText: 'Mesa' }).click();
  await expect(panel(p)).toHaveAttribute('data-open', 'true');
};
// Colour of a patch of felt on screen (average of 12 x 12 px).
const feltPixel = (p: Page) => p.evaluate(() => {
  const src = document.querySelector('canvas')!, c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const d = g.getImageData(Math.floor(c.width * 0.5), Math.floor(c.height * 0.3), 12, 12).data;
  const sum = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; }
  return sum.map((v) => v / (d.length / 4));
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
});

test('backdrop by theme, photo and colour; it survives a reload; restore brings back the default', async ({ page }) => {
  expect((await table(page))).toMatchObject({ id: 'padrao', background: 'color', backgroundColor: '#140E10', felt: '#3a0f1a', wood: '#3b2416', model: false });
  await openPanel(page);
  await panel(page).getByRole('button', { name: 'Tema', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Cosmos' }).click();
  await expect(page.locator('.backdrop[data-kind="preset"]')).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => window.__dice?.table().background === 'preset');
  await expect(page.locator('.backdrop[data-kind="preset"] .backdrop-art')).toHaveCSS('background-image', /radial-gradient/);

  await openPanel(page);
  await page.getByTestId('table-photo').setInputFiles(png);
  await expect(page.locator('.backdrop[data-kind="image"]')).toBeVisible();
  await panel(page).getByLabel('Desfoque').fill('6');
  await panel(page).getByLabel('Escurecer').fill('30');
  await expect(page.locator('.backdrop-art')).toHaveCSS('filter', 'blur(6px)');
  await expect(page.locator('.backdrop-dim')).toHaveCSS('opacity', '0.3');
  await page.waitForTimeout(600); // the save is debounced
  await page.reload();
  await page.waitForFunction(() => window.__dice?.table().background === 'image');
  await expect(page.locator('.backdrop-art')).toHaveCSS('filter', 'blur(6px)');
  await expect(page.locator('.backdrop-art')).toHaveCSS('background-image', /^url\("data:/);

  await openPanel(page);
  await panel(page).getByRole('button', { name: 'Cor', exact: true }).click();
  await panel(page).getByLabel('Cor do fundo').fill('#102030');
  await expect.poll(async () => (await table(page)).backgroundColor).toBe('#102030');
  await expect(page.locator('.backdrop')).toHaveCount(0);

  await panel(page).getByRole('button', { name: 'Restaurar mesa padrão' }).click();
  expect(await table(page)).toMatchObject({ id: 'padrao', background: 'color', backgroundColor: '#140E10' });
  await page.reload();
  await page.waitForFunction(() => window.__dice?.state().ready);
  expect((await table(page)).id).toBe('padrao');
});

test('felt and wood colours change what is drawn, at once', async ({ page }) => {
  await page.waitForTimeout(800); // let the first frames paint
  const [r0, g0] = await feltPixel(page);
  expect(r0).toBeGreaterThan(g0); // the wine felt
  await openPanel(page);
  await panel(page).getByLabel('Feltro', { exact: true }).fill('#1f8f3a');
  await panel(page).getByLabel('Madeira').fill('#aa7733');
  await expect.poll(async () => (await table(page)).felt).toBe('#1f8f3a');
  expect((await table(page)).wood).toBe('#aa7733');
  await expect.poll(async () => { const [r, g] = await feltPixel(page); return g - r; }).toBeGreaterThan(15);
  await panel(page).getByLabel('Textura do feltro').selectOption('couro');
  await expect.poll(async () => (await table(page)).feltTextured).toBe(true);
  await page.waitForTimeout(600); // the save is debounced
  await page.reload();
  await page.waitForFunction(() => window.__dice?.table().felt === '#1f8f3a');
  expect(await page.evaluate(() => window.__dice.state().error)).toBeNull();
});

test('a felt image shows in its own colours: the felt colour turns white, and can tint it again', async ({ page }) => {
  await openPanel(page);
  expect((await table(page)).felt).toBe('#3a0f1a');
  await page.getByTestId('table-felt-image').setInputFiles(png);
  await expect.poll(async () => (await table(page)).felt).toBe('#ffffff');
  expect((await table(page)).feltTextured).toBe(true);
  await expect(panel(page).getByText('A cor do feltro tinge a textura')).toBeVisible();
  await panel(page).getByLabel('Feltro', { exact: true }).fill('#2a6f3a');
  await expect.poll(async () => (await table(page)).felt).toBe('#2a6f3a');
  // Generated textures keep the colour they had.
  await panel(page).getByLabel('Textura do feltro').selectOption('veludo');
  await expect.poll(async () => (await table(page)).feltTextured).toBe(true);
  expect((await table(page)).felt).toBe('#2a6f3a');
});

test('opaque textures are exported as JPEG, so a big photo does not balloon the file', async ({ page }) => {
  const big = noisePng(1600); // ~7 MB as PNG
  await openPanel(page);
  await page.getByTestId('table-felt-image').setInputFiles({ name: 'ruido.png', mimeType: 'image/png', buffer: big });
  await expect.poll(async () => (await table(page)).feltTextured).toBe(true);
  const [download] = await Promise.all([page.waitForEvent('download'), panel(page).getByRole('button', { name: 'Exportar mesa' }).click()]);
  const file = readFileSync((await download.path())!);
  expect(file.includes(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true); // a JPEG inside
  expect(file.includes(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false); // and no PNG
  expect(file.length).toBeLessThan(big.length * 0.6);
  // The file still comes back as the same table.
  await panel(page).getByRole('button', { name: 'Restaurar mesa padrão' }).click();
  await page.getByTestId('table-import').setInputFiles(glbFile('ruido.glb', file));
  await expect.poll(async () => (await table(page)).model).toBe(true);
  expect((await table(page)).feltTextured).toBe(true);
});

test('exporting a table and importing it back gives the same table (M13)', async ({ page }) => {
  await openPanel(page);
  await panel(page).getByLabel('Feltro', { exact: true }).fill('#2a6f3a');
  await panel(page).getByLabel('Madeira').fill('#5a3a22');
  await panel(page).getByLabel('Textura do feltro').selectOption('veludo');
  await page.getByTestId('table-photo').setInputFiles(png);
  await panel(page).getByLabel('Desfoque').fill('5');
  await panel(page).getByLabel('Escurecer').fill('35');
  await panel(page).getByLabel('Nome da mesa').fill('Taverna do Zé');
  await expect.poll(async () => (await table(page)).feltTextured).toBe(true);
  const before = await table(page);
  expect(before).toMatchObject({ felt: '#2a6f3a', wood: '#5a3a22', model: false, background: 'image' });

  const [download] = await Promise.all([page.waitForEvent('download'), panel(page).getByRole('button', { name: 'Exportar mesa' }).click()]);
  expect(download.suggestedFilename()).toBe('mesa-taverna-do-ze.glb');
  const file = readFileSync((await download.path())!);
  expect(file.readUInt32LE(0)).toBe(0x46546c67); // "glTF"

  await panel(page).getByRole('button', { name: 'Restaurar mesa padrão' }).click();
  expect((await table(page)).felt).toBe('#3a0f1a');
  await page.getByTestId('table-import').setInputFiles(glbFile('mesa-taverna-do-ze.glb', file));
  await expect.poll(async () => (await table(page)).model).toBe(true); // no warnings: applied straight away
  const after = await table(page);
  expect(after.felt).toBe(before.felt);
  expect(after.wood).toBe(before.wood);
  expect(after.feltTextured).toBe(true);
  expect(after.name).toBe('Taverna do Zé');
  expect(after.background).toBe('image');
  after.guide!.size.forEach((v, i) => expect(v).toBeCloseTo(before.guide!.size[i], 4));
  after.guide!.center.forEach((v, i) => expect(v).toBeCloseTo(before.guide!.center[i], 4));
  await expect(page.locator('.backdrop-art')).toHaveCSS('filter', 'blur(5px)');
  await expect(page.locator('.backdrop-dim')).toHaveCSS('opacity', '0.35');
  await expect(panel(page).getByText('Mesa importada')).toBeVisible();

  // A second trip, from the imported table itself, still exports a valid file.
  const [again] = await Promise.all([page.waitForEvent('download'), panel(page).getByRole('button', { name: 'Exportar mesa' }).click()]);
  expect(readFileSync((await again.path())!).readUInt32LE(0)).toBe(0x46546c67);
  expect(await page.evaluate(() => window.__dice.state().error)).toBeNull();
});

test('a table exported in centimetres, Z up and moved is fitted back, and a frame inside the play area is warned about', async ({ page }) => {
  await openPanel(page);
  const strange = () => glbFile('estranha.glb', tableGlb({ scale: 100, zUp: true, shift: [300, 20, -50], pillar: true }));
  await page.getByTestId('table-import').setInputFiles(strange());
  const warnings = page.getByTestId('table-warnings');
  await expect(warnings).toContainText('A moldura entra na área de jogo');
  expect((await table(page)).model).toBe(false); // nothing applied before the player confirms
  await warnings.getByRole('button', { name: 'Cancelar' }).click();
  await expect(warnings).toHaveCount(0);

  await page.getByTestId('table-import').setInputFiles(strange());
  await warnings.getByRole('button', { name: 'Aplicar mesmo assim' }).click();
  await expect.poll(async () => (await table(page)).model).toBe(true);
  const t = await table(page);
  t.guide!.size.forEach((v, i) => expect(v).toBeCloseTo([14, 1.5, 9][i], 3));
  t.guide!.center.forEach((v, i) => expect(v).toBeCloseTo([0, 0.75, 0][i], 3));
  expect(await page.evaluate(() => window.__dice.state().error)).toBeNull();
  // Physics did not change: the dice are still held above the same floor.
  expect(await page.evaluate(() => window.__dice.bodies()[0].p[1])).toBeGreaterThan(0);

  await panel(page).getByRole('button', { name: 'Restaurar mesa padrão' }).click();
  expect((await table(page)).model).toBe(false);
});

test('files that are not a table are refused, and nothing is saved', async ({ page }) => {
  await openPanel(page);
  const input = page.getByTestId('table-import');
  await input.setInputFiles(glbFile('sem-nada.glb', tableGlb({ guide: false, floor: false })));
  await expect(panel(page).getByRole('alert')).toContainText('guia da área de jogo');
  await input.setInputFiles({ name: 'lixo.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from('not a glb at all') });
  await expect(panel(page).getByRole('alert')).toContainText('Não consegui ler');
  await input.setInputFiles({ name: 'mesa.gltf', mimeType: 'model/gltf+json', buffer: Buffer.from('{}') });
  await expect(panel(page).getByRole('alert')).toContainText('.glb');
  await page.getByTestId('table-photo').setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('nope') });
  await expect(panel(page).getByRole('alert')).toContainText('ler essa imagem');
  expect(await table(page)).toMatchObject({ id: 'padrao', model: false, saved: 0 });
});

test('upgrading IndexedDB v1 to v2 keeps the imported dice store', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // A same-origin page that does not start the app, to plant a v1 database first.
  await page.route('**/legado', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>v1</title>' }));
  await page.goto('/legado');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('dice-roller', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('customDice', { keyPath: 'id' });
    req.onsuccess = () => {
      const tx = req.result.transaction('customDice', 'readwrite');
      tx.objectStore('customDice').put({ id: 'legado', version: 0, name: 'guardado' });
      tx.oncomplete = () => { req.result.close(); resolve(); };
    };
    req.onerror = () => reject(req.error);
  }));
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready);
  const db = await page.evaluate(() => new Promise<{ version: number; stores: string[]; kept: unknown }>((resolve, reject) => {
    const req = indexedDB.open('dice-roller');
    req.onsuccess = () => {
      const d = req.result, get = d.transaction('customDice').objectStore('customDice').get('legado');
      get.onsuccess = () => { resolve({ version: d.version, stores: [...d.objectStoreNames].sort(), kept: get.result }); d.close(); };
    };
    req.onerror = () => reject(req.error);
  }));
  expect(db.version).toBe(2);
  expect(db.stores).toEqual(['customDice', 'tables']);
  expect(db.kept).toEqual({ id: 'legado', version: 0, name: 'guardado' });
  await context.close();
});
