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
  for (const shape of ['d4', 'd6', 'd10', 'd20', 'd100'] as const) {
    test(`${shape} surface numerals at ${width}px in three orientations`, async ({ page }) => {
      await mkdir('screens', { recursive: true });
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => message.type() === 'error' && errors.push(`${message.text()} ${message.location().url}`));
      await page.goto('/?surface-preview');
      await page.waitForFunction(() => window.__dice?.state().ready === true);
      const kind: DieKind = shape;
      await page.evaluate((kind) => window.__dice.select([kind]), kind);
      const expectedLabels = shape === 'd4' ? 12 : shape === 'd6' ? 6 : shape === 'd20' ? 20 : shape === 'd100' ? 100 : 10;
      await expect.poll(() => page.evaluate(() => window.__dice.labels(0).length)).toBe(expectedLabels);
      for (const { name, q } of orientations) {
        await page.evaluate((q) => window.__dice.previewSurface(0, [0, 2, 0], q), q);
        await expect.poll(() => page.evaluate((q) => 1 - Math.abs(window.__dice.meshes()[0].q.reduce((dot, v, i) => dot + v * q[i], 0)), q)).toBeLessThan(1e-5);
        // Wait for the posed scene's render, including asynchronous Text glyph upload.
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        const pixels = await page.evaluate(() => {
          const canvas = document.querySelector('canvas')!;
          const copy = document.createElement('canvas');
          copy.width = canvas.width; copy.height = canvas.height;
          const context = copy.getContext('2d')!;
          context.drawImage(canvas, 0, 0);
          const data = context.getImageData(0, 0, copy.width, copy.height).data;
          let left = copy.width, right = 0, top = copy.height, bottom = 0;
          const colors = new Set<number>();
          for (let i = 0; i < data.length; i += 4) {
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
            colors.add((r << 16) | (g << 8) | b);
            if (Math.max(Math.abs(r - data[0]), Math.abs(g - data[1]), Math.abs(b - data[2])) > 8) {
              const x = (i / 4) % copy.width, y = Math.floor(i / 4 / copy.width);
              left = Math.min(left, x); right = Math.max(right, x);
              top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
          }
          return { colors: colors.size, left, right, top, bottom, width: copy.width, height: copy.height, dpr: canvas.width / canvas.clientWidth };
        });
        expect(pixels.colors).toBeGreaterThan(50);
        // No colour check: numeral ink varies by gem (dark on light gems since af88d47) and blurs at 0.35 DPR; see the screenshots.
        // Nothing touches the edges: 4 CSS px, whatever the pixel density (software rendering runs at 0.35).
        const m = 4 * pixels.dpr;
        expect(pixels.left).toBeGreaterThan(m);
        expect(pixels.right).toBeLessThan(pixels.width - m - 1);
        expect(pixels.top).toBeGreaterThan(m);
        expect(pixels.bottom).toBeLessThan(pixels.height - m - 1);
        await page.screenshot({ path: `screens/one-${shape}-${name}-${width}.png` });
      }
      expect(errors).toEqual([]);
    });
  }
}
