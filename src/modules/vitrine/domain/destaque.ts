import { clamp01 } from '../../../shared/math.ts';
// The highlight light's rule: it rises with the flight to the camera (0 at its start, 5 at its end), and is 0 on a
// software renderer. `ms` counts from the flight's start, `voo` is the flight's length.
export const intensidadeDoDestaque = (ms: number, voo: number, software: boolean): number =>
  software ? 0 : 5 * clamp01(ms / voo);
