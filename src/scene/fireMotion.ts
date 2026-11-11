import { MathUtils } from 'three';
import type { Omen } from '../dice/omen';
import type { DieKind } from '../dice/polyhedra';
import { TRAY } from '../physics/world';
import { easeOut } from './highlight';
import { span } from './krakenMotion';

// d20 = 1. The die catches fire, the fire runs over the whole felt, and the die flies to the front still
// burning; the tray burns out, the die burns on until it is picked up.
export const FIRE = { ignite: 500, spread: [300, 2200], trayOut: [2700, 3900] } as const;

export const fireIndices = (omen: Omen | null, dice: DieKind[]) =>
  omen && !omen.crits.length ? omen.fumbles.filter((i) => dice[i] === 'd20') : [];

// How far the fire must run from the burning dice to reach the last corner of the felt.
export const fireReach = (lit: { x: number; z: number }[]) =>
  Math.max(...[-1, 1].flatMap((sx) => [-1, 1].map((sz) =>
    Math.min(...lit.map((p) => Math.hypot(sx * TRAY.halfWidth - p.x, sz * TRAY.halfDepth - p.z))))));

export const fireAt = (t: number, reach: number) => ({
  die: easeOut(span(t, 0, FIRE.ignite)),
  radius: reach * MathUtils.smootherstep(t, FIRE.spread[0], FIRE.spread[1]),
  tray: (t >= FIRE.spread[0] ? 1 : 0) * (1 - MathUtils.smootherstep(t, FIRE.trayOut[0], FIRE.trayOut[1])),
});
