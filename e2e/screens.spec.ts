import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { DieKind } from '../src/dice/polyhedra';
import type { Quat } from '../src/physics/world';

const orientations: { name: string; q: Quat }[] = [
  { name: 'identity', q: [0, 0, 0, 1] },
  { name: 'x35', q: [Math.sin(35 * Math.PI / 360), 0, 0, Math.cos(35 * Math.PI / 360)] },
  { name: 'y120', q: [0, Math.sin(Math.PI / 3), 0, Math.cos(Math.PI / 3)] },
];

for (const width of [1440, 390]) {
  for (const shape of ['d4', 'd6', 'd10', 'd20', 'd10-tens'] as const) {
    test(`${shape} surface numerals at ${width}px in three orientations`, async ({ page }) => {
      await mkdir('screens', { recursive: true });
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => message.type() === 'error' && errors.push(`${message.text()} ${message.location().url}`));
      await page.goto('/');
      await page.waitForFunction(() => window.__dice?.state().ready === true);
      const kind: DieKind = shape === 'd10-tens' ? 'd100' : shape;
      await page.evaluate((kind) => window.__dice.select(kind, 1), kind);
      const expectedLabels = shape === 'd4' ? 12 : shape === 'd6' ? 6 : shape === 'd20' ? 20 : 10;
      await expect.poll(() => page.evaluate(() => window.__dice.labels(0).length)).toBe(expectedLabels);
      if (shape === 'd10-tens') {
        await page.evaluate(() => window.__dice.pose(1, [0, -3, 0], [0, 0, 0, 1]));
        expect(await page.evaluate(() => window.__dice.labels(0).some((label) => label.text === '00'))).toBe(true);
      }
      for (const { name, q } of orientations) {
        await page.evaluate((q) => window.__dice.pose(0, [0, 2, 0], q), q);
        await expect.poll(() => page.evaluate((q) => Math.max(...window.__dice.meshes()[0].q.map((v, i) => Math.abs(v - q[i]))), q)).toBeLessThan(1e-5);
        // Wait for the posed scene's render, including asynchronous Text glyph upload.
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        const pixels = await page.evaluate(() => {
          const canvas = document.querySelector('canvas')!;
          const copy = document.createElement('canvas');
          copy.width = canvas.width; copy.height = canvas.height;
          const context = copy.getContext('2d')!;
          context.drawImage(canvas, 0, 0);
          const data = context.getImageData(0, 0, copy.width, copy.height).data;
          let gold = 0;
          let left = copy.width, right = 0, top = copy.height, bottom = 0;
          const colors = new Set<number>();
          for (let i = 0; i < data.length; i += 4) {
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
            if (r > 120 && g > 90 && b < 120 && r > g * 1.05 && g > b * 1.25) gold++;
            colors.add((r << 16) | (g << 8) | b);
            if (Math.max(Math.abs(r - data[0]), Math.abs(g - data[1]), Math.abs(b - data[2])) > 8) {
              const x = (i / 4) % copy.width, y = Math.floor(i / 4 / copy.width);
              left = Math.min(left, x); right = Math.max(right, x);
              top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
          }
          return { gold, colors: colors.size, left, right, top, bottom, width: copy.width, height: copy.height };
        });
        expect(pixels.colors).toBeGreaterThan(50);
        expect(pixels.gold).toBeGreaterThan(0);
        expect(pixels.left).toBeGreaterThan(4);
        expect(pixels.right).toBeLessThan(pixels.width - 5);
        expect(pixels.top).toBeGreaterThan(4);
        expect(pixels.bottom).toBeLessThan(pixels.height - 5);
        await page.screenshot({ path: `screens/one-${shape}-${name}-${width}.png` });
      }
      expect(errors).toEqual([]);
    });
  }
}
