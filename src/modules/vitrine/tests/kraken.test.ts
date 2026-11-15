import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { polyhedron } from '../../dados/index.ts';
import { KRAKEN, krakenDieAt, STORM, stormAt, stormDieAt } from '../../pressagios/index.ts';
import { showcasePoses } from '../index.ts';
import type { Pose } from '../../../shared/math.ts';

const camera = (aspect: number) => {
  const c = new PerspectiveCamera(40, aspect);
  c.position.set(0, 14, 10); c.lookAt(0, 0, 0); c.updateMatrixWorld();
  return c;
};
const view = (c: PerspectiveCamera) => ({ position: c.position, quaternion: c.quaternion, fov: c.fov, aspect: c.aspect });
const onScreen = (c: PerspectiveCamera, p: number[]) => { const n = new Vector3(...p).project(c); return Math.abs(n.x) < 1 && Math.abs(n.y) < 1 && n.z < 1; };
const from: Pose = { p: [2, 0.9, -2], q: [0, 0, 0, 1] };

describe('d100 = 1: the kraken grabs the die, flings it away and brings it back', () => {
  const c = camera(1.6), poly = polyhedron('d100');
  const final = showcasePoses([polyhedron('d20'), poly], [20, 1], view(c))[1];
  const at = (ms: number) => krakenDieAt(ms, from, final);

  it('the die waits to be grabbed, is lifted high over the tray, then thrown out of sight', () => {
    expect(at(0)).toEqual(from);
    expect(at(KRAKEN.grab - 1)).toEqual(from);
    expect(at(KRAKEN.lift).p[1]).toBeGreaterThan(from.p[1] + 2);
    for (let ms = KRAKEN.away; ms <= KRAKEN.catch; ms += 50) expect(onScreen(c, at(ms).p)).toBe(false);
    expect(onScreen(camera(0.46), at(KRAKEN.away).p)).toBe(false); // gone on a phone too
  });

  it('comes back to the ordinary result pose with the rolled face to the viewer, and stays there', () => {
    expect(at(KRAKEN.shown)).toEqual(final);
    expect(at(KRAKEN.duration + 1000)).toEqual(final);
    const face = poly.labelList.find((l) => l.value === 1)!;
    const toward = c.position.clone().sub(new Vector3(...final.p)).normalize();
    expect(new Vector3(...face.normal).applyQuaternion(new Quaternion(...at(KRAKEN.shown).q)).dot(toward)).toBeCloseTo(1, 6);
  });

  it('moves without jumps and always with a valid rotation (except the fling, which is fast but continuous)', () => {
    let last = at(0);
    for (let ms = 10; ms <= KRAKEN.duration; ms += 10) {
      const pose = at(ms);
      expect([...pose.p, ...pose.q].every(Number.isFinite)).toBe(true);
      expect(new Quaternion(...pose.q).length()).toBeCloseTo(1, 6);
      expect(Math.hypot(...pose.p.map((v, k) => v - last.p[k]))).toBeLessThan(1.4); // < 140 units/s, even when flung
      last = pose;
    }
  });
});

describe('d100 = 100: the storm, and the die drifting toward you', () => {
  const c = camera(1.6);
  const final = showcasePoses([polyhedron('d100')], [100], view(c))[0];
  it('the die keeps coming closer, ends at the result pose and the tentacles sink away', () => {
    let distance = Infinity;
    for (let ms = 0; ms <= STORM.duration; ms += 50) {
      const d = c.position.distanceTo(new Vector3(...stormDieAt(ms, from, final).p));
      expect(d).toBeLessThanOrEqual(distance + 1e-9);
      distance = d;
    }
    expect(stormDieAt(STORM.arrive, from, final)).toEqual(final);
    expect(stormAt(STORM.rise).arms).toBe(1);
    expect(stormAt(STORM.duration).arms).toBe(0);
    expect(stormAt(STORM.arrive).reveal).toBe(1);
  });
});
