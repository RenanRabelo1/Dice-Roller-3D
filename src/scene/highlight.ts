import { Vector3 } from 'three';

// Showcase timeline (ms from the moment the dice settle): the rolled number rises over its die, then
// ~1 s after settling each die flies to the camera (staggered) and the number lands on its face and glows.
export const SHOW = { rise: 550, delay: 1000, duration: 650, stagger: 70 };
export const HL_SIZE = 0.55; // font size of the floating number (world units)
const LIFT = 0.55;
const PULSE_HZ = 0.9;

export const easeOut = (t: number) => 1 - (1 - t) ** 4;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export interface Highlight { p: Vector3; opacity: number; scale: number; glow: number }

// Where the highlighted number of die `i` is `ms` after the dice settled. `start` sits just above the
// settled die, `face` is where the die's rolled numeral is right now (it moves during the flight), and
// `faceScale` is that numeral's size relative to HL_SIZE. Early in the flight the number snaps onto the
// face and rides with it, so the floating number and the die's own numeral never show as two.
export function highlightAt(ms: number, i: number, start: Vector3, face: Vector3, faceScale: number): Highlight {
  const rise = easeOut(clamp01(ms / SHOW.rise));
  const t = clamp01((ms - SHOW.delay - i * SHOW.stagger) / SHOW.duration);
  const fly = easeOut(clamp01(t / 0.35));
  const p = start.clone().add(new Vector3(0, LIFT * rise, 0)).lerp(face, fly);
  const scale = (0.7 + 0.3 * rise) * (1 + (faceScale - 1) * fly);
  // Glow builds while rising, then pulses gently once the die is shown.
  const glow = t < 1 ? rise * (0.6 + 0.4 * fly) : 0.7 + 0.3 * Math.sin((ms / 1000) * 2 * Math.PI * PULSE_HZ);
  return { p, opacity: rise, scale, glow };
}
