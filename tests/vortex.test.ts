import { describe, it, expect } from 'vitest';
import { HAND, TRAY, type Vec3 } from '../src/physics/world';
import { ORBITS, VORTEX, newWhirl, restingPlaces, spinAngle, stepWhirl, vortexCenter, vortexRadius } from '../src/throw/vortex';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const inside = (p: Vec3, r: number) =>
  Math.abs(p[0]) + r <= TRAY.halfWidth + 1e-9 && p[2] + r <= TRAY.halfDepth + 1e-9 && p[2] - r >= -TRAY.halfDepth - 1e-9 && p[1] - r >= 0;

describe('the hand as a whirlwind', () => {
  it('one die waits alone at the hand, where it always was', () => {
    expect(vortexRadius(1)).toBe(0);
    expect(vortexCenter(1, 0)).toEqual([0, HAND.y, HAND.z]);
  });

  it('grows as dice join, and the whole whirl fits in the tray wherever you aim', () => {
    for (let n = 2; n <= 10; n++) expect(vortexRadius(n)).toBeGreaterThan(vortexRadius(n - 1));
    for (let n = 1; n <= 10; n++) for (const x of [-30, -3, 0, 4, 30]) for (const pull of [0, HAND.pull]) {
      const c = vortexCenter(n, x, pull), R = vortexRadius(n), [sx, sy, sz] = VORTEX.squash;
      expect(inside([c[0] + Math.sign(c[0] || 1) * R * sx, c[1], c[2]], 0.9)).toBe(true);
      expect(inside([c[0], c[1] - R * sy, c[2] + R * sz], 0.9)).toBe(true);
    }
  });

  it('every die has its own orbit plane and spin axis, and they do not all turn the same way', () => {
    for (let i = 0; i < ORBITS.length; i++) for (let j = i + 1; j < ORBITS.length; j++) {
      expect(Math.abs(dot(ORBITS[i].normal, ORBITS[j].normal))).toBeLessThan(0.995);
      expect(Math.abs(dot(ORBITS[i].axis, ORBITS[j].axis))).toBeLessThan(0.995);
    }
    expect(new Set(ORBITS.map((o) => Math.sign(o.rate))).size).toBe(2);
    expect(new Set(ORBITS.map((o) => Math.sign(o.spin))).size).toBe(2);
  });

  it('ten dice swirling while the charge rises and falls never overlap and never leave the tray', () => {
    const radii = [0.9, 0.75, 0.7, 0.7, 0.7, 0.7, 0.9, 0.76, 0.76, 0.75];
    const w = newWhirl(vortexCenter(10, 0)); // new dice start in the middle and fly out
    for (let frame = 0; frame < 900; frame++) {
      const force = 1 - Math.abs(((frame / 42) % 2) - 1); // the charge wave
      stepWhirl(w, { x: 3 * Math.sin(frame / 50), force, dt: 1 / 60, radii, still: false });
      if (frame < 40) continue; // spreading out of the middle
      for (let i = 0; i < 10; i++) {
        expect(inside(w.pos[i], radii[i])).toBe(true);
        for (let j = i + 1; j < 10; j++) expect(dist(w.pos[i], w.pos[j])).toBeGreaterThanOrEqual((radii[i] + radii[j]) * 0.97);
      }
    }
  });

  it('charging spins it faster, and easing off slows it down', () => {
    const turned = (force: number) => {
      const w = newWhirl(vortexCenter(3, 0));
      stepWhirl(w, { x: 0, force, dt: 0.1, radii: [0.7, 0.7, 0.7], still: false });
      return Math.abs(w.phase[0] - ORBITS[0].start);
    };
    expect(turned(1) / turned(0)).toBeCloseTo(1 + VORTEX.boost, 6);
    expect(spinAngle(0, 1, 0.1) / spinAngle(0, 0, 0.1)).toBeCloseTo(1 + VORTEX.boost, 6);
    expect(turned(0.5)).toBeGreaterThan(turned(0)); expect(turned(0.5)).toBeLessThan(turned(1));
  });

  it('reduced motion: no swirling, the dice just sit in place, apart', () => {
    const radii = [0.7, 0.7, 0.7, 0.7];
    const w = newWhirl(vortexCenter(4, 0));
    for (let f = 0; f < 3; f++) stepWhirl(w, { x: 0, force: 1, dt: 1 / 60, radii, still: true });
    const before = w.pos.map((p) => [...p]);
    stepWhirl(w, { x: 0, force: 1, dt: 1 / 60, radii, still: true });
    expect(w.pos.slice(0, 4)).toEqual(before.slice(0, 4));
    expect(spinAngle(0, 1, 1 / 60, true)).toBe(0);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(dist(w.pos[i], w.pos[j])).toBeGreaterThanOrEqual(1.4 * 0.97);
  });

  it('picking up brings each die back to its place in the whirl, apart, without moving the whirl itself', () => {
    const radii = [0.75, 0.76, 0.76];
    const w = newWhirl(vortexCenter(3, 0));
    for (let f = 0; f < 120; f++) stepWhirl(w, { x: 0, force: 0.4, dt: 1 / 60, radii, still: false });
    const before = JSON.stringify(w);
    const places = restingPlaces(w, 2, radii);
    expect(JSON.stringify(w)).toBe(before);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(dist(places[i], places[j])).toBeGreaterThanOrEqual((radii[i] + radii[j]) * 0.97);
    places.forEach((p, i) => expect(inside(p, radii[i])).toBe(true));
    places.forEach((p) => expect(Math.abs(p[0] - 2)).toBeLessThanOrEqual(vortexRadius(3) + 0.5)); // around the aimed x
  });
});
