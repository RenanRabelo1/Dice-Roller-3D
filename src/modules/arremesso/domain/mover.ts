import type { Pose } from '../../../shared/math.ts';
import { registroDeCorpos } from '../scene/corpos.ts';
import { arremesso } from '../store.ts';
import { moverCorpo } from './apply.ts';

// The only pose write in `settled` (the showcase's flight and pins): die `i` of the registry to `pose`, through
// apply.ts. `fixar` (default) sets the pose at once as well; any other phase, or an empty slot, does nothing.
// Kept out of apply.ts so the worker (presim → apply) never pulls in the store.
export function moverDado(i: number, pose: Pose, fixar = true): void {
  if (arremesso().gesture.phase !== 'settled') return;
  const body = registroDeCorpos.current[i];
  if (!body) return;
  moverCorpo(body, pose.p, pose.q, fixar);
}
