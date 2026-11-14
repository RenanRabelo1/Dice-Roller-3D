// Pure door of `arremesso` (ADR 0010): the gesture's phases, the aim and the charge, the stop, the whirl in the hand,
// the physical tray, the launch applied to the bodies and the pre-simulation with its worker. No React here.
// Only what someone outside uses today is re-exported; the store, the scene and the components are still legacy.
export type {
  ChargeMode, Effect, GestureEvent, GestureState, Launch, OmenTest, Phase, Recording, RollRequest, RollResponse,
} from './contracts.ts';
export { initialGesture, reduce } from './domain/gesture.ts';
export { charge, clampTarget } from './domain/aim.ts';
export { GRAVITY, HAND, handPositions, MATERIAL, STEP, TRAY, trayColliders } from './domain/world.ts';
export { bodyStates, toKinematic } from './domain/apply.ts';
export { BIAS_BUDGET, presimulate, presimulateFor } from './domain/presim.ts';
export { plays } from './domain/vies.ts';
export { newWhirl, ORBITS, restingPlaces, spinAngle, stepWhirl, VORTEX, vortexCenter, vortexRadius } from './domain/vortex.ts';

// The pre-simulation worker. The shell calls this and never points at the module's files itself.
export const criarWorkerDePresimulacao = () => new Worker(new URL('./domain/presim.worker.ts', import.meta.url), { type: 'module' });
