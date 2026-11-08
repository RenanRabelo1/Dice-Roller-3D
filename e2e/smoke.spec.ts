import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready === true);
});

test('WebGL context exists and the renderer is reported', async ({ page }, info) => {
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : null;
  });
  expect(renderer).toBeTruthy();
  info.annotations.push({ type: 'renderer', description: renderer! });
});

test('canvas paints a non-uniform image without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.reload();
  await page.waitForFunction(() => window.__dice?.state().ready === true);
  const colours = await page.evaluate(() => {
    const src = document.querySelector('canvas')!, c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0, 64, 64);
    const data = g.getImageData(0, 0, 64, 64).data, set = new Set<number>();
    for (let i = 0; i < data.length; i += 4) set.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return set.size;
  });
  expect(colours).toBeGreaterThan(50);
  expect(errors).toEqual([]);
});

test('a d6 at identity shows 1 on top and 6 below; mesh and body agree', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d6', 1));
  await expect.poll(() => page.evaluate(() => window.__dice.labels(0).length)).toBe(6);
  await page.evaluate(() => window.__dice.pose(0, [0, 2, 0], [0, 0, 0, 1]));
  await expect.poll(() => page.evaluate(() => window.__dice.bodies()[0].p[1])).toBeCloseTo(2);
  const labels = await page.evaluate(() => window.__dice.labels(0));
  const byText = (text: string) => labels.find((label) => label.text === text)!.normal;
  expect(byText('1')[1]).toBeGreaterThan(0.999);
  expect(byText('6')[1]).toBeLessThan(-0.999);
  const [body] = await page.evaluate(() => window.__dice.bodies());
  const [mesh] = await page.evaluate(() => window.__dice.meshes());
  body.q.forEach((v, i) => expect(Math.abs(Math.abs(v) - Math.abs(mesh.q[i]))).toBeLessThan(1e-4));
});

test('every supported selection creates the expected bodies and surface numerals', async ({ page }) => {
  const cases = [
    ['d4', 1, 12], ['d6', 1, 6], ['d8', 1, 8], ['d10', 1, 10],
    ['d12', 1, 12], ['d20', 1, 20], ['d100', 2, 10],
  ] as const;
  for (const [kind, bodyCount, labelCount] of cases) {
    await page.evaluate((kind) => window.__dice.select(kind, 1), kind);
    await expect.poll(() => page.evaluate(() => window.__dice.bodies().length)).toBe(bodyCount);
    await expect.poll(() => page.evaluate(() => window.__dice.labels(0).length)).toBe(labelCount);
    const labels = await page.evaluate(() => window.__dice.labels(0));
    expect(labels.every((label) => label.position.every(Number.isFinite))).toBe(true);
    for (const label of labels) expect(Math.hypot(...label.normal)).toBeCloseTo(1, 5);
    const text = labels.map((label) => label.text);
    if (kind === 'd6') expect(text).toContain('6');
    if (kind === 'd10' || kind === 'd12' || kind === 'd20') {
      expect(text).toContain('6.');
      expect(text).toContain('9.');
    }
    if (kind === 'd100') expect(text.sort()).toEqual(['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']);
  }
});

test('rotated Text anchors and gem follow the same physical pose', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d6', 1));
  await expect.poll(() => page.evaluate(() => window.__dice.labels(0).length)).toBe(6);
  await page.evaluate(() => window.__dice.pose(0, [0, 2, 0], [0, 0, 0, 1]));
  await expect.poll(() => page.evaluate(() => window.__dice.labels(0).reduce((sum, label) => sum + label.position[1], 0) / 6)).toBeCloseTo(2, 5);
  const original = await page.evaluate(() => window.__dice.labels(0));
  const angle = 35 * Math.PI / 180;
  await page.evaluate((angle) => window.__dice.pose(0, [1, 3, 1], [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)]), angle);
  await expect.poll(() => page.evaluate(() => window.__dice.meshes()[0].q[0])).toBeCloseTo(Math.sin(angle / 2), 5);
  const rotated = await page.evaluate(() => window.__dice.labels(0));
  const rotate = ([x, y, z]: number[]) => [x, y * Math.cos(angle) - z * Math.sin(angle), y * Math.sin(angle) + z * Math.cos(angle)];
  original.forEach((label, i) => {
    const normal = rotate(label.normal);
    const position = rotate([label.position[0], label.position[1] - 2, label.position[2]]);
    normal.forEach((v, axis) => expect(rotated[i].normal[axis]).toBeCloseTo(v, 5));
    position.forEach((v, axis) => expect(rotated[i].position[axis]).toBeCloseTo(v + [1, 3, 1][axis], 5));
  });
});

test('twenty percentile bodies stay registered and same-selection updates reuse them', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d100', 10));
  await expect.poll(() => page.evaluate(() => window.__dice.bodies().length)).toBe(20);
  await expect.poll(() => page.evaluate(() => window.__dice.meshes().length)).toBe(20);
  const before = await page.evaluate(() => window.__dice.bodies());
  expect(new Set(before.map((body) => body.handle)).size).toBe(20);
  expect(before.every((body) => body.type === 2)).toBe(true);
  await page.evaluate(() => window.__dice.select('d100', 10));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(await page.evaluate(() => window.__dice.bodies().map((body) => body.handle))).toEqual(before.map((body) => body.handle));
  await page.evaluate(() => window.__dice.select('d6', 2));
  await expect.poll(() => page.evaluate(() => window.__dice.bodies().length)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.__dice.meshes().length)).toBe(2);
});
