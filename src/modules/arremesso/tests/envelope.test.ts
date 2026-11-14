import { describe, it, expect } from 'vitest';
import { envelopeDaMao } from '../index.ts';
import { HAND, handPositions, TRAY } from '../domain/world.ts';
import { VORTEX, vortexCenter, vortexRadius } from '../domain/vortex.ts';
import { RAIO_MAXIMO } from '../../dados/index.ts';
import { MAX_DICE } from '../../regras/index.ts';
import type { Vec3 } from '../../../shared/math.ts';

// The points the shell's camera fit computed inline before OS-0043 (app/Cena.tsx), copied as they were.
function pontosDeAntes(): Vec3[] {
  const corners: Vec3[] = [];
  for (const p of handPositions(HAND.cols * 4, 0)) {
    for (const x of [-RAIO_MAXIMO, RAIO_MAXIMO]) {
      for (const y of [-RAIO_MAXIMO, RAIO_MAXIMO]) {
        for (const z of [-RAIO_MAXIMO, RAIO_MAXIMO]) corners.push([p[0] + x, p[1] + y, p[2] + z]);
      }
    }
  }
  for (const side of [-1, 1]) {
    const c = vortexCenter(MAX_DICE, side * TRAY.halfWidth), R = vortexRadius(MAX_DICE);
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      corners.push(c.map((v, k) => v + [x, y, z][k] * (R * VORTEX.squash[k] + RAIO_MAXIMO)) as Vec3);
    }
  }
  return corners;
}

describe('envelopeDaMao', () => {
  it('gives the same points the camera fit used: the largest hand (20 bodies) and the widest whirl to either side', () => {
    const pontos = envelopeDaMao();
    expect(pontos).toHaveLength(20 * 8 + 2 * 8);
    expect(pontos).toEqual(pontosDeAntes());
  });

  it('keeps today\'s extremes (fixed numbers, so a changed constant shows here)', () => {
    const pontos = envelopeDaMao();
    expect(pontos).toHaveLength(176);
    const hoje = [[-6.9, 6.9], [0.665, 5.8], [-0.68, 4.4]];
    for (let k = 0; k < 3; k++) {
      expect(Math.min(...pontos.map((p) => p[k]))).toBeCloseTo(hoje[k][0], 6);
      expect(Math.max(...pontos.map((p) => p[k]))).toBeCloseTo(hoje[k][1], 6);
    }
  });
});
