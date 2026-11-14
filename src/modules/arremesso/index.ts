// Pure door of `arremesso` (ADR 0010): the gesture's phases, the aim and the charge, the stop, the whirl in the hand,
// the physical tray, the launch applied to the bodies and the pre-simulation with its worker. No React here.
// Only what someone outside uses today is re-exported; the components (loop, die body, colliders) are in cena.ts.
// The throw's state: `useArremesso` is in cena.ts.
import { resultadoPublicado as sinalDoResultado, store } from './store.ts';
import type { EstadoDoArremesso } from './contracts.ts';

export type {
  ChargeMode, Effect, EstadoDoArremesso, GestureEvent, GestureState, HandMotion, Launch, OmenTest, Phase, Recording,
  ResultadoPublicado, RollRequest, RollResponse, UltimoLancamento,
} from './contracts.ts';
export { arremesso, input, publish, reiniciar, setAim, setChargeMode, setForce, setReady } from './store.ts';
// The module publishes (ADR 0005); outside, only subscribe.
export const resultadoPublicado: Pick<typeof sinalDoResultado, 'subscribe'> = { subscribe: (listener) => sinalDoResultado.subscribe(listener) };
// Every change of the throw's state, with the previous one, for whoever needs the transition.
export const assinarArremesso = (listener: (state: EstadoDoArremesso, previous: EstadoDoArremesso) => void): (() => void) => store.subscribe(listener);
export { initialGesture, reduce } from './domain/gesture.ts';
export { charge, clampTarget } from './domain/aim.ts';
export { GRAVITY, HAND, handPositions, MATERIAL, STEP, TRAY, trayColliders } from './domain/world.ts';
export { bodyStates, toKinematic } from './domain/apply.ts';
export { BIAS_BUDGET, presimulate, presimulateFor } from './domain/presim.ts';
export { omenKinds, plays } from './domain/vies.ts';
export { newWhirl, ORBITS, restingPlaces, spinAngle, stepWhirl, VORTEX, vortexCenter, vortexRadius } from './domain/vortex.ts';

// The pre-simulation worker. The shell calls this and never points at the module's files itself.
export const criarWorkerDePresimulacao = () => new Worker(new URL('./domain/presim.worker.ts', import.meta.url), { type: 'module' });
