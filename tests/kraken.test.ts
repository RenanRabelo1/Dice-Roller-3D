import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { polyhedron } from '../src/dice/polyhedra';
import { fractureCells, KRAKEN, krakenAt, krakenDieAt, krakenIndices, STORM, stormAt, stormDieAt, stormIndices } from '../src/scene/krakenMotion';
import { showcasePoses, type Pose } from '../src/scene/showcase';

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

  it('only a positive d100 critical calls the kraken; only a d100 fumble the storm', () => {
    expect(krakenIndices({ crits: [0, 1], fumbles: [] }, ['d20', 'd100'])).toEqual([1]);
    expect(krakenIndices({ crits: [0], fumbles: [1] }, ['d100', 'd20'])).toEqual([]);
    expect(krakenIndices(null, ['d100'])).toEqual([]);
    expect(stormIndices({ crits: [], fumbles: [0, 1] }, ['d20', 'd100'])).toEqual([1]);
    expect(stormIndices({ crits: [1], fumbles: [0] }, ['d100', 'd20'])).toEqual([]);
  });

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

  it('the tentacle holds the die while carrying it and lets go to throw it', () => {
    expect(krakenAt(KRAKEN.lift).grip).toBe(1);
    expect(krakenAt(KRAKEN.shown).grip).toBe(1);
    expect(krakenAt((KRAKEN.fling + KRAKEN.catch) / 2).grip).toBe(0);
    expect(krakenAt(KRAKEN.duration).grip).toBe(0);
  });

  it('breaks the tray as it rises and leaves it whole at the end', () => {
    expect(krakenAt(0)).toMatchObject({ broken: false, spread: 0, arms: 0 });
    expect(krakenAt(KRAKEN.grab)).toMatchObject({ broken: true, spread: 1 });
    expect(krakenAt(KRAKEN.restored)).toMatchObject({ broken: false, spread: 0, arms: 0 });
    expect(krakenAt(KRAKEN.shown).reveal).toBe(1);
    expect(krakenAt(KRAKEN.duration + 5000).reveal).toBe(1); // the number keeps showing on the die
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

describe('temporary tray fragments', () => {
  it.each([[0, 0], [4.5, -2.5], [-4.5, 2.5]])('cover the entire original floor from (%s, %s) without gaps', (x, z) => {
    const cells = fractureCells(x, z);
    const area = cells.reduce((sum, points) => sum + Math.abs(points.reduce((a, p, i) => {
      const next = points[(i + 1) % points.length];
      return a + p[0] * next[1] - next[0] * p[1];
    }, 0)) / 2, 0);
    expect(area).toBeCloseTo(15 * 10, 5);
    expect(cells.flat().every(([px, pz]) => Math.abs(px) <= 7.5 + 1e-8 && Math.abs(pz) <= 5 + 1e-8)).toBe(true);
  });
});
