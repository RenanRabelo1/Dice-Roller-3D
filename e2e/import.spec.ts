import { test, expect, type Page } from '@playwright/test';
import { polyhedron } from '../src/dice/polyhedra';
import { glb, modelTriangles, stl } from '../tests/helpers/models';

// Dice models made from the app's own solids (see tests/helpers/models.ts), chamfered and off-centre like a slicer export.
const file = (name: string, buffer: ArrayBuffer, mimeType = 'application/octet-stream') => ({ name, mimeType, buffer: Buffer.from(buffer) });
const d20 = () => file('caveira.stl', stl(modelTriangles(polyhedron('d20'), { bevel: 0.06 })));

const ready = (p: Page, n?: number) => p.waitForFunction((n) => window.__dice?.state().ready && (n === undefined || window.__dice.bodies().length === n), n);
const settled = (p: Page) => p.waitForFunction(() => { const s = window.__dice.state(); return s.phase === 'settled' && s.showcased === s.throwId; }, null, { timeout: 90_000 });
const throwWithSpace = async (p: Page) => {
  await p.locator('.game-area').focus();
  await p.keyboard.down('Space'); await p.waitForTimeout(700); await p.keyboard.up('Space');
};
// The face looking at the camera.
const topValue = async (p: Page, i: number) => {
  const [labels, cam] = await p.evaluate((i) => [window.__dice.labels(i), window.__dice.camera()] as const, i);
  const toward = (l: (typeof labels)[number]) => {
    const d = l.position.map((v, k) => cam[k] - v), n = Math.hypot(...d);
    return l.normal.reduce((s, v, k) => s + v * d[k] / n, 0);
  };
  return labels.reduce((a, b) => (toward(b) > toward(a) ? b : a)).value;
};
const open = async (p: Page, f: ReturnType<typeof file>) => {
  await p.getByRole('button', { name: 'Importar dado' }).click();
  await p.getByTestId('import-file').setInputFiles(f);
};
const save = async (p: Page, name: string) => {
  await p.getByLabel('Nome', { exact: true }).fill(name);
  await p.getByRole('button', { name: 'Salvar' }).click();
  await expect(p.locator('#import-die')).toHaveAttribute('data-open', 'false'); // saved and closed
};
const rollAndCheck = async (p: Page) => {
  await throwWithSpace(p); await settled(p);
  const results = (await p.evaluate(() => window.__dice.state().results))!;
  expect(await p.evaluate(() => window.__dice.state().error)).toBeNull();
  for (let i = 0; i < results.length; i++) expect(await topValue(p, i)).toBe(results[i]);
  return results;
};

test.beforeEach(async ({ page }) => { await page.goto('/'); await ready(page); });

test('import a plain d20 STL → roll → top face is the result → reload keeps it → delete', async ({ page }) => {
  await open(page, d20());
  await expect(page.getByTestId('import-shape')).toContainText('d20');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Não, numerar para mim' }).click();
  await save(page, 'Caveira');
  await expect(page.getByRole('button', { name: 'Adicionar d20 Caveira' })).toBeVisible();
  const [custom] = await page.evaluate(() => window.__dice.customs());
  expect(custom).toMatchObject({ name: 'Caveira', slug: 'caveira', base: 'd20', printed: false });

  await page.evaluate((kind) => window.__dice.select([kind]), custom.kind); await ready(page, 1);
  const [result] = await rollAndCheck(page);
  expect(result).toBeGreaterThanOrEqual(1); expect(result).toBeLessThanOrEqual(20);

  await page.reload(); await ready(page);
  await expect(page.getByRole('button', { name: 'Adicionar d20 Caveira' })).toBeVisible();
  await page.keyboard.press('c');
  await page.getByLabel(/^Dados, por exemplo/).fill('2d20caveira + d6');
  await page.keyboard.press('Enter');
  await expect(page.locator('.pool')).toHaveText('1d6 + 2d20 Caveira');
  await ready(page, 3);
  await rollAndCheck(page);

  await page.keyboard.press('Escape'); // close the chat
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Excluir d20 Caveira' }).click();
  await expect(page.getByRole('button', { name: 'Adicionar d20 Caveira' })).toHaveCount(0);
  expect(await page.evaluate(() => window.__dice.customs())).toEqual([]);
  await page.reload(); await ready(page);
  expect(await page.evaluate(() => window.__dice.customs())).toEqual([]);
});

test('a model with its own numbers is calibrated face by face', async ({ page }) => {
  await open(page, file('d6.stl', stl(modelTriangles(polyhedron('d6'), { bevel: 0.04 }))));
  await expect(page.getByTestId('import-shape')).toContainText('d6');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Sim, calibrar' }).click();
  const ask = page.getByLabel('Que número está nesta face?');
  await ask.fill('1'); await ask.press('Enter');
  await expect(ask).toHaveValue('6'); // the opposite face comes suggested
  await ask.fill('1'); await ask.press('Enter'); // a repeat is refused…
  await expect(page.getByRole('alert')).toContainText('já foi usado');
  for (const v of [5, 2, 6, 3, 4]) { await ask.fill(String(v)); await ask.press('Enter'); }
  await save(page, 'Spindown');
  const [custom] = await page.evaluate(() => window.__dice.customs());
  expect(custom.printed).toBe(true);
  await page.evaluate((kind) => window.__dice.select([kind]), custom.kind); await ready(page, 1);
  expect(await page.evaluate(() => window.__dice.labels(0).map((l) => l.value).sort())).toEqual([1, 2, 3, 4, 5, 6]);
  expect(await page.evaluate(() => window.__dice.numbersVisible(0))).toBe(true);
  await rollAndCheck(page);
});

test('a GLB d8 imports and rolls', async ({ page }) => {
  await open(page, file('d8.glb', glb(modelTriangles(polyhedron('d8'), { bevel: 0.05 })), 'model/gltf-binary'));
  await expect(page.getByTestId('import-shape')).toContainText('d8');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Não, numerar para mim' }).click();
  await save(page, 'Cristal');
  const [custom] = await page.evaluate(() => window.__dice.customs());
  await page.evaluate((kind) => window.__dice.select([kind]), custom.kind); await ready(page, 1);
  await rollAndCheck(page);
});

test('files that are not dice are refused in Portuguese and nothing is saved', async ({ page }) => {
  await open(page, file('notas.txt', new TextEncoder().encode('oi').buffer as ArrayBuffer));
  await expect(page.getByRole('alert')).toContainText('Use um arquivo .stl ou .glb');
  await page.getByTestId('import-file').setInputFiles(file('lixo.stl', new ArrayBuffer(20)));
  await expect(page.getByRole('alert')).toBeVisible();
  const box = await import('three').then(({ BoxGeometry }) => Float32Array.from(new BoxGeometry(2, 2, 0.3).toNonIndexed().getAttribute('position').array));
  await page.getByTestId('import-file').setInputFiles(file('caixa.stl', stl(box)));
  await expect(page.getByRole('alert')).toContainText('Não reconheci um d4–d20');
  expect(await page.evaluate(() => window.__dice.customs())).toEqual([]);
});
