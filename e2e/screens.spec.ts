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
      // Gold numerals on dark gems (d4, d6); dark numerals on light gems (d10, d20, d100, see INK in Die.tsx).
      const darkInk = shape === 'd10' || shape === 'd20' || shape === 'd100';
      for (const { name, q } of orientations) {
        await page.evaluate((q) => window.__dice.previewSurface(0, [0, 2, 0], q), q);
        await expect.poll(() => page.evaluate((q) => 1 - Math.abs(window.__dice.meshes()[0].q.reduce((dot, v, i) => dot + v * q[i], 0)), q)).toBeLessThan(1e-5);
        // Wait for the posed scene's render, including asynchronous Text glyph upload.
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        const pixels = await page.evaluate((darkInk) => {
          const canvas = document.querySelector('canvas')!;
          const copy = document.createElement('canvas');
          copy.width = canvas.width; copy.height = canvas.height;
          const context = copy.getContext('2d')!;
          context.drawImage(canvas, 0, 0);
          const data = context.getImageData(0, 0, copy.width, copy.height).data;
          let gold = 0, ink = 0;
          let left = copy.width, right = 0, top = copy.height, bottom = 0;
          const colors = new Set<number>();
          const luma = (i: number) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          if (darkInk) {
            // Ink = pixels well darker than the body, between two bright body pixels of the same row (the die's own span).
            for (let y = 0; y < copy.height; y++) {
              let first = -1, last = -1, peak = 0;
              for (let x = 0; x < copy.width; x++) {
                const l = luma((y * copy.width + x) * 4);
                if (l > 140) { if (first < 0) first = x; last = x; peak = Math.max(peak, l); }
              }
              for (let x = first + 1; first >= 0 && x < last; x++) if (luma((y * copy.width + x) * 4) < 0.6 * peak) ink++;
            }
          }
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
          return { gold, ink, colors: colors.size, left, right, top, bottom, width: copy.width, height: copy.height, css: innerWidth / copy.width };
        }, darkInk);
        expect(pixels.colors).toBeGreaterThan(50);
        expect(darkInk ? pixels.ink : pixels.gold).toBeGreaterThan(0);
        // The scene stays clear of the canvas edges; margins in CSS px, since the canvas may run at a lower DPR.
        expect(pixels.left * pixels.css).toBeGreaterThan(4);
        expect((pixels.width - pixels.right) * pixels.css).toBeGreaterThan(5);
        expect(pixels.top * pixels.css).toBeGreaterThan(4);
        expect((pixels.height - pixels.bottom) * pixels.css).toBeGreaterThan(5);
        await page.screenshot({ path: `screens/one-${shape}-${name}-${width}.png` });
      }
      expect(errors).toEqual([]);
    });
  }
}
