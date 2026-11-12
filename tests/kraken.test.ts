import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { polyhedron } from '../src/dice/polyhedra';
import { fractureCells, KRAKEN, krakenAt, krakenFlightAt, krakenHeroPoses, krakenIndices, trayBrokenAt } from '../src/scene/krakenMotion';
import { showcasePoses } from '../src/scene/showcase';

describe('d100 ascension', () => {
  it.each([1.98, 0.9, 0.65])('fits the wings and halo inside the camera at aspect %s', (aspect) => {
    const camera = new PerspectiveCamera(40, aspect);
    camera.position.set(0, 14, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const [pose] = krakenHeroPoses([polyhedron('d100')], [1], { position: camera.position, quaternion: camera.quaternion, fov: camera.fov, aspect });
    for (const x of [-3.4, 3.4]) for (const y of [-2.2, 2.8]) {
      const point = new Vector3(x, y, -0.85).applyQuaternion(camera.quaternion).add(new Vector3(...pose.p)).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(1); expect(Math.abs(point.y)).toBeLessThan(1);
    }
  });
  it('only a positive d100 critical gets the rupture and ascension', () => {
    expect(krakenIndices({ crits: [0, 1], fumbles: [] }, ['d20', 'd100'])).toEqual([1]);
    expect(krakenIndices({ crits: [0], fumbles: [1] }, ['d100', 'd20'])).toEqual([]);
    expect(krakenIndices(null, ['d100'])).toEqual([]);
  });
  it('breaks the tray before launch, holds the reveal, then completely restores it', () => {
    expect(krakenAt(0)).toMatchObject({ broken: false, spread: 0, arms: 0, halo: 0 });
    expect(krakenAt(KRAKEN.launch)).toMatchObject({ broken: true, spread: 1 });
    expect(krakenAt(KRAKEN.reveal + 300).halo).toBe(1);
    expect(krakenAt(KRAKEN.repair + 500).spread).toBeLessThan(1);
    expect(krakenAt(KRAKEN.restored)).toMatchObject({ broken: false, spread: 0, arms: 0, halo: 0 });
  });
  it('flies the actual rolled face to the camera and ends exactly at the ordinary result pose', () => {
    const camera = new PerspectiveCamera(40, 1.6);
    camera.position.set(0, 14, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const view = { position: camera.position, quaternion: camera.quaternion, fov: camera.fov, aspect: camera.aspect };
    const poly = polyhedron('d100');
    const [hero] = showcasePoses([poly], [1], view);
    const final = showcasePoses([polyhedron('d20'), poly], [20, 1], view)[1];
    const from = { p: [2, 0.9, -2], q: [0, 0, 0, 1] } as const;
    const start = { p: [...from.p] as [number, number, number], q: [...from.q] as [number, number, number, number] };
    expect(krakenFlightAt(KRAKEN.launch, start, hero, final)).toEqual(start);
    expect(krakenFlightAt(KRAKEN.reveal, start, hero, final)).toEqual(hero);
    expect(krakenFlightAt(KRAKEN.restored, start, hero, final)).toEqual(final);
    const face = poly.labelList.find((l) => l.value === 1)!;
    const q = new Quaternion(...krakenFlightAt(KRAKEN.reveal, start, hero, final).q);
    const toward = camera.position.clone().sub(new Vector3(...hero.p)).normalize();
    expect(new Vector3(...face.normal).applyQuaternion(q).dot(toward)).toBeCloseTo(1, 6);
    for (let ms = 0; ms <= KRAKEN.duration; ms += 40) {
      const pose = krakenFlightAt(ms, start, hero, final);
      expect([...pose.p, ...pose.q].every(Number.isFinite)).toBe(true);
      expect(new Quaternion(...pose.q).length()).toBeCloseTo(1, 6);
    }
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

describe('trayBrokenAt', () => {
  const live = { phase: 'settled' as const, throwId: 4, omen: { throwId: 4, crits: [0], fumbles: [] }, omenDone: 3, omenAt: 1000, dice: ['d100' as const], reducedMotion: false };
  const mid = 1000 + KRAKEN.launch;
  it('is broken in the middle of the kraken', () => expect(trayBrokenAt(live, mid)).toBe(true));
  it('is whole before the rupture and after the repair', () => {
    expect(trayBrokenAt(live, 1000)).toBe(false);
    expect(trayBrokenAt(live, 1000 + KRAKEN.restored)).toBe(false);
  });
  it('is whole at once with reduced motion', () => expect(trayBrokenAt({ ...live, reducedMotion: true }, mid)).toBe(false));
  it('is whole once the omen is done, for another throw, or when the hand is picked up', () => {
    expect(trayBrokenAt({ ...live, omenDone: 4 }, mid)).toBe(false);
    expect(trayBrokenAt({ ...live, throwId: 5 }, mid)).toBe(false);
    expect(trayBrokenAt({ ...live, phase: 'hand' }, mid)).toBe(false);
  });
  it('is whole when the selection has no d100 critical', () => {
    expect(trayBrokenAt({ ...live, dice: ['d20'] }, mid)).toBe(false);
    expect(trayBrokenAt({ ...live, omen: { throwId: 4, crits: [0], fumbles: [0] } }, mid)).toBe(false);
    expect(trayBrokenAt({ ...live, omen: null }, mid)).toBe(false);
  });
});
