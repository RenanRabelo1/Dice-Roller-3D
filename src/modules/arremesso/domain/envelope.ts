import { RAIO_MAXIMO } from '../../dados/index.ts';
import { MAX_DICE } from '../../regras/index.ts';
import type { Vec3 } from '../../../shared/math.ts';
import { VORTEX, vortexCenter, vortexRadius } from './vortex.ts';
import { HAND, handPositions, TRAY } from './world.ts';

// The extreme points of the hand, for the shell's camera fit: the largest hand (20 bodies), so selection never
// changes the camera, and the widest whirl, aimed to either side. Pure.
export function envelopeDaMao(): Vec3[] {
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
