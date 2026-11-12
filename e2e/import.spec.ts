import { test, expect, type Page } from '@playwright/test';
import { polyhedron } from '../src/dice/polyhedra';
import { asFile, glb, modelTriangles, prismTriangles, shardTriangles, stl, subdivided } from '../tests/helpers/models';

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
  await expect(page.getByText('Esse modelo já vem com números gravados nas faces?')).toBeVisible();
  await expect(page.getByTestId('import-hint')).toHaveCount(0); // a smooth model gets no suggestion
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
  await open(page, file('d6.stl', stl(modelTriangles(polyhedron('d6'), { bevel: 0.04, engrave: 0.04 }))));
  await expect(page.getByTestId('import-shape')).toContainText('d6');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByTestId('import-hint')).toHaveText('Parece que esse modelo já tem números.');
  await page.getByRole('button', { name: 'Sim, calibrar' }).click();
  const ask = page.getByLabel('Que número está nesta face?');
  await ask.fill('1'); await ask.press('Enter');
  await expect(ask).toHaveValue('6'); // the opposite face comes suggested, and says so
  await expect(page.getByTestId('import-suggestion')).toContainText('Sugestão: 6, porque a face oposta é 1');
  await ask.fill('1'); await ask.press('Enter'); // a repeat is refused…
  await expect(page.getByRole('alert')).toContainText('já foi usado');
  await ask.fill('5'); await ask.press('Enter');
  await expect(ask).toHaveValue(''); // a face with no suggestion starts empty
  await expect(page.getByTestId('import-suggestion')).toHaveCount(0);
  for (const v of [2, 6, 3, 4]) { await ask.fill(String(v)); await ask.press('Enter'); }
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

test('ten imported dice at the triangle limit still roll and settle', async ({ page }) => {
  const heavy = subdivided(modelTriangles(polyhedron('d20')), 49); // 20 faces × 49² = 48 020 triangles
  expect(heavy.length / 9).toBeLessThanOrEqual(50_000);
  await open(page, file('pesado.stl', stl(heavy)));
  await expect(page.getByTestId('import-shape')).toContainText('48.020');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Não, numerar para mim' }).click();
  await save(page, 'Pesado');
  const [custom] = await page.evaluate(() => window.__dice.customs());
  await page.evaluate((kind) => window.__dice.select(Array(10).fill(kind)), custom.kind); await ready(page, 10);
  const start = Date.now();
  const results = await rollAndCheck(page);
  expect(results).toHaveLength(10);
  console.log(`10 imported dice at 48k triangles: rolled and showcased in ${Date.now() - start} ms`);
});

test('a free-form prism imports, rolls, reads from below, flies to the front and survives a reload', async ({ page }) => {
  await open(page, file('prisma.stl', stl(asFile(prismTriangles(5, 1.4)))));
  await expect(page.getByRole('alert')).toContainText('Não reconheci um d4–d20');
  await page.getByRole('button', { name: 'Importar como dado de forma livre' }).click();
  await expect(page.getByTestId('import-shape')).toContainText('7 faces de apoio');
  await expect(page.getByText('A física usa o contorno externo do modelo.')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Não, numerar para mim' }).click();
  await save(page, 'Prisma');
  await expect(page.getByRole('button', { name: 'Adicionar Prisma' })).toBeVisible();
  const [custom] = await page.evaluate(() => window.__dice.customs());
  expect(custom).toMatchObject({ name: 'Prisma', slug: 'prisma', base: 'livre' });

  await page.evaluate((kind) => window.__dice.select([kind]), custom.kind); await ready(page, 1);
  await throwWithSpace(page);
  await page.waitForFunction(() => window.__dice.state().phase === 'settled', null, { timeout: 90_000 }); // read before the flight starts (1 s later)
  const { p: landed, q: landedQ } = (await page.evaluate(() => window.__dice.bodies()))[0];
  const [result] = (await page.evaluate(() => window.__dice.state().results))!;
  expect(result).toBeGreaterThanOrEqual(1); expect(result).toBeLessThanOrEqual(7);
  // read from below: the face whose normal points most downwards
  const labels = await page.evaluate(() => window.__dice.labels(0));
  expect(labels.reduce((a, b) => (b.normal[1] < a.normal[1] ? b : a)).value).toBe(result);
  // it flies to the front like any die, the rolled face (the one it rested on) towards the camera
  const throwId = await page.evaluate(() => window.__dice.state().throwId);
  await expect.poll(() => page.evaluate(() => window.__dice.state().showcased)).toBe(throwId);
  const [{ p, q }] = await page.evaluate(() => window.__dice.bodies());
  expect(Math.hypot(...p.map((v, k) => v - landed[k]))).toBeGreaterThan(2);
  const camera = await page.evaluate(() => window.__dice.camera());
  const worldFace = labels.find((l) => l.value === result)!.normal; // labels() are in world space, at rest
  // rotate by a quaternion (v' = v + 2w(u×v) + 2u×(u×v), u = q.xyz, w = q.w)
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const rotate = ([x, y, z, w]: number[], v: number[]) => { const t = cross([x, y, z], v).map((c) => 2 * c); return v.map((c, k) => c + w * t[k] + cross([x, y, z], t)[k]); };
  const face = rotate([-landedQ[0], -landedQ[1], -landedQ[2], landedQ[3]], worldFace); // back to the die's own frame
  const turned = rotate(q, face);
  const toCam = camera.map((v, k) => v - p[k]), length = Math.hypot(...toCam);
  expect(turned.reduce((s, v, k) => s + v * toCam[k] / length, 0)).toBeGreaterThan(0.99);

  await page.reload(); await ready(page);
  await expect(page.getByRole('button', { name: 'Adicionar Prisma' })).toBeVisible();
  await page.keyboard.press('c');
  await page.getByLabel(/^Dados, por exemplo/).fill('2prisma');
  await page.keyboard.press('Enter');
  await expect(page.locator('.pool')).toHaveText('2 Prisma');
});

test('painted numerals: the ink shows on an engraved STL, changes in My dice without reloading, and the matte finish is opaque', async ({ page }) => {
  await open(page, file('d6.stl', stl(modelTriangles(polyhedron('d6'), { bevel: 0.04, engrave: 0.04 }))));
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Sim, calibrar' }).click();
  const ask = page.getByLabel('Que número está nesta face?');
  for (const v of [1, 5, 2, 6, 3, 4]) { await ask.fill(String(v)); await ask.press('Enter'); }
  await save(page, 'Gravado');
  const [custom] = await page.evaluate(() => window.__dice.customs());
  await page.evaluate((kind) => window.__dice.select([kind]), custom.kind); await ready(page, 1);
  const look = () => page.evaluate(() => window.__dice.gemLook(0).filter((m) => m.shown));
  // automatic ink on a dark-red gem is gold (linear sRGB: bright red, dim blue)
  await expect.poll(async () => (await look())[0]?.painted, { timeout: 30_000 }).toBe(true);
  const [auto] = await look();
  expect(auto.ink![0]).toBeGreaterThan(0.5); expect(auto.ink![2]).toBeLessThan(0.2);

  await page.getByText('Tinta', { exact: true }).click();
  await page.getByLabel('Branca').check();
  await expect.poll(async () => (await look())[0]?.ink?.[2] ?? 0).toBeGreaterThan(0.6); // white ink, no reload
  await page.getByLabel('Sem tinta').check();
  await expect.poll(async () => (await look())[0]?.painted, { timeout: 30_000 }).toBe(false);
  await page.getByLabel('Fosco').check();
  await expect.poll(async () => (await look())[0]?.material, { timeout: 30_000 }).toBe('MeshStandardMaterial');
  expect((await look())[0].opaque).toBe(true);

  await page.reload(); await ready(page);
  await page.evaluate((kind) => window.__dice.select([kind]), custom.kind); await ready(page, 1);
  await expect.poll(async () => (await look())[0]?.material, { timeout: 30_000 }).toBe('MeshStandardMaterial'); // the choice was saved
});

test('a shard die: the wizard asks about the big faces and calibrates only those', async ({ page }) => {
  await open(page, file('shard.stl', stl(asFile(shardTriangles(5)))));
  await page.getByRole('button', { name: 'Importar como dado de forma livre' }).click();
  await expect(page.getByTestId('import-tier')).toContainText('Encontrei 5 faces grandes e 10 menores');
  await page.getByRole('button', { name: 'Sim, só as grandes' }).click();
  await expect(page.getByTestId('import-shape')).toContainText('15 faces de apoio, 5 valem como resultado');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Sim, calibrar' }).click();
  await expect(page.getByTestId('import-progress')).toHaveText('1 de 5');
  const ask = page.getByLabel('Que número você lê com ele apoiado assim?');
  for (const v of [1, 2, 3, 4, 5]) { await ask.fill(String(v)); await ask.press('Enter'); }
  await save(page, 'Cristal5');
  const [custom] = await page.evaluate(() => window.__dice.customs());
  await page.evaluate((kind) => window.__dice.select([kind]), custom.kind); await ready(page, 1);
  expect(await page.evaluate(() => window.__dice.labels(0).map((l) => l.value).sort())).toEqual([1, 2, 3, 4, 5]);
  await throwWithSpace(page); await settled(page);
  const [result] = (await page.evaluate(() => window.__dice.state().results))!;
  expect(result).toBeGreaterThanOrEqual(1); expect(result).toBeLessThanOrEqual(5);
});
