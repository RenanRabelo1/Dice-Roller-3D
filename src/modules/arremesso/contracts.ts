// Types of `arremesso`: the gesture's phases and events, the charge, the launch and the pre-simulation's request
// and recording, and the omen a dev test throw looks for.
import type { Pose, Vec3 } from '../../shared/math.ts';
import type { CustomKind, DieKind } from '../regras/index.ts';
import type { Polyhedron } from '../dados/index.ts';

export type Phase = 'hand' | 'charging' | 'rolling' | 'settled' | 'returning';
export type Source = { kind: 'pointer'; id: number } | { kind: 'key' };
export type GestureEvent =
  | { type: 'press'; source: Source; at: number; repeat: boolean }
  | { type: 'release'; source: Source; at: number; mode?: ChargeMode } // mode: how the charge moved (relative by default)
  | { type: 'cancel' }
  | { type: 'published' }
  | { type: 'returned' }
  | { type: 'selection' };
export interface GestureState { phase: Phase; source: Source | null; chargeStart: number }
export type Effect = { type: 'none' } | { type: 'throw'; force: number } | { type: 'return' };

// How the charge moves while it is held. 'relative': up and down, 0 → 1 → 0 every 1400 ms (time the release).
// 'static': up to 1 in 700 ms, then it stays there until the release. 1 is the strongest throw the tray is
// tuned for (LAUNCH.maxSpeed), the same top the relative charge reaches.
export type ChargeMode = 'relative' | 'static';

export interface Launch { throwId: number; seed: number; target: Vec3; force: number; handCenter: Vec3; handOmega: Vec3 }

// Test buttons (dev only): the next throws land on faces that call the chosen omen (see presimulateFor).
export type OmenTest = 'lightning' | 'fire' | 'kraken' | 'storm' | 'duality';

export interface Recording { frames: Pose[][]; raw: number[]; results: number[]; timedOut: boolean; escaped: boolean; recovered: boolean }
// `customs`: the imported dice of the selection, because the worker has no registry of its own.
// `bias` (dev test buttons only): look for a roll that plays this omen; `kinds` from omenKinds.
export interface RollRequest { dice: DieKind[]; start: Pose[]; launch: Launch; customs: Record<CustomKind, Polyhedron>; bias?: { test: OmenTest; kinds: DieKind[] } }
export type RollResponse = { throwId: number } & ({ rec: Recording } | { error: string });
// The poses of the dice just before and just after a launch was applied (the test hook's `launches().last`).
export interface UltimoLancamento { before: Pose[]; after: Pose[] }

// The hand's motion at the release (its center and its swing), handed on to the throw.
interface HandMotion { center: Vec3; omega: Vec3 }

// What `publish` announces, synchronously, right after the result is in the state (ADR 0005).
// `dice` are the dice of the throw, aligned with `results`/`raw`.
export interface ResultadoPublicado { throwId: number; dice: DieKind[]; results: number[]; raw: number[] | null; force: number }

// The throw's state and actions, owned by the module (store.ts). Read outside through arremesso() and useArremesso().
export interface EstadoDoArremesso {
  dice: DieKind[]; // the dice of the current throw, aligned with results/raw: a copy of the hand, received by selecaoAlterada
  gesture: GestureState;
  throwId: number;
  aim: Vec3;
  force: number;
  chargeMode: ChargeMode; // how the charge moves while held (the player's choice, remembered by the browser)
  launch: Launch | null;
  results: number[] | null;
  raw: number[] | null; // per-body up value behind `results` (d10 digit, d4 vertex)
  ready: boolean;
  reiniciar: () => void; // resets the throw with the same hand (the dice go back to the hand)
  setAim: (aim: Vec3) => void;
  setForce: (force: number) => void;
  setChargeMode: (mode: ChargeMode) => void;
  setReady: () => void;
  input: (event: GestureEvent, hand?: HandMotion) => Effect;
  publish: (throwId: number, results: number[], raw?: number[]) => void;
}
