import RAPIER from '@dimforge/rapier3d-compat';
import { registerPoly } from '../../dados/index.ts';
import type { CustomKind } from '../../regras/index.ts';
import type { RollRequest, RollResponse } from '../contracts.ts';
import { BIAS_BUDGET, presimulateFor } from './presim.ts';

// Warm the engine while the user aims, and keep the full simulation off the render thread.
const ready = RAPIER.init().then(() => null, (error: unknown) => String(error));
self.onmessage = async ({ data }: MessageEvent<RollRequest>) => {
  const { launch, customs } = data;
  let response: RollResponse;
  try {
    const error = await ready;
    if (error) throw new Error(error);
    for (const kind of Object.keys(customs) as CustomKind[]) registerPoly(kind, customs[kind]);
    response = { throwId: launch.throwId, rec: presimulateFor(data, data.orcamento?.worker ?? BIAS_BUDGET.worker) };
  } catch (error) {
    response = { throwId: launch.throwId, error: String(error) };
  }
  self.postMessage(response);
};
