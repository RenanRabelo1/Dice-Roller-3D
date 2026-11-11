import RAPIER from '@dimforge/rapier3d-compat';
import { presimulate, type RollRequest, type RollResponse } from './presim';

// Warm the engine while the user aims, and keep the full simulation off the render thread.
const ready = RAPIER.init().then(() => null, (error: unknown) => String(error));
self.onmessage = async ({ data: { dice, start, launch } }: MessageEvent<RollRequest>) => {
  let response: RollResponse;
  try {
    const error = await ready;
    if (error) throw new Error(error);
    response = { throwId: launch.throwId, rec: presimulate(dice, start, launch) };
  } catch (error) {
    response = { throwId: launch.throwId, error: String(error) };
  }
  self.postMessage(response);
};
