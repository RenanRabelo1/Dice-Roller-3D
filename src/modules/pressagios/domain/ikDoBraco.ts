import { MathUtils } from 'three';
import type { Vec3 } from '../../../shared/math.ts';

// Two-bone IK in world space, pure: the scene turns the result into bone rotations (rotation only, the bone lengths
// l1 and l2 never change). The wrist stops at 0.999 * (l1 + l2) when the target is out of reach.
const ALCANCE_MAXIMO = 0.999;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.sqrt(dot(a, a));
const unit = (a: Vec3): Vec3 => mul(a, 1 / (len(a) || 1));

export function dobrarBraco(ombro: Vec3, alvo: Vec3, l1: number, l2: number, polo: Vec3) {
  const d = sub(alvo, ombro), dist0 = len(d);
  const u: Vec3 = dist0 > 1e-9 ? mul(d, 1 / dist0) : [0, 0, 1];
  const maximo = ALCANCE_MAXIMO * (l1 + l2), minimo = Math.abs(l1 - l2) + 1e-6;
  const dist = Math.min(Math.max(dist0, minimo), maximo);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const pv = sub(polo, ombro);
  let perp = sub(pv, mul(u, dot(pv, u)));
  if (len(perp) < 1e-6) perp = sub([0, 1, 0], mul(u, u[1])); // pole on the line: fall back to "up"
  const cotovelo = add(add(ombro, mul(u, a)), mul(unit(perp), h));
  const punho = add(ombro, mul(u, dist));
  return { cotovelo, punho, alcancou: dist0 <= maximo };
}

// 0..1 weight of the lunge correction over the clip, `t` in ms of the pair: up 2950→3300, hold until 3600, down to 3850.
export function pesoDoBote(t: number) {
  if (t <= 3600) return MathUtils.smoothstep(t, 2950, 3300);
  return 1 - MathUtils.smoothstep(t, 3600, 3850);
}
