import { describe, it, expect } from 'vitest';
import { TRAY, MAX_RADIUS, trayColliders, handPositions, clampHandX, recoveryPoint, isOutside, type Vec3 } from '../src/physics/world';

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const within = (p: Vec3, r: number) =>
  Math.abs(p[0]) <= TRAY.halfWidth - r && Math.abs(p[2]) <= TRAY.halfDepth - r && p[1] - r >= 0 && p[1] + r <= TRAY.lidY;
const apart = (ps: Vec3[]) => ps.every((a, i) => ps.slice(i + 1).every((b) => dist(a, b) >= 2 * MAX_RADIUS));

describe('world', () => {
  it('hand positions stay inside the tray projection, above the walls, without overlap', () => {
    for (let n = 1; n <= 20; n++) for (const x of [-99, 0, 99]) {
      const ps = handPositions(n, clampHandX(x, n));
      expect(ps).toHaveLength(n);
      ps.forEach((p) => { expect(within(p, MAX_RADIUS)).toBe(true); expect(p[1] - MAX_RADIUS).toBeGreaterThan(TRAY.wallHeight); });
      expect(apart(ps)).toBe(true);
    }
  });
  it('recovery points are inside and do not overlap', () => {
    for (let n = 1; n <= 20; n++) {
      const ps = Array.from({ length: n }, (_, i) => recoveryPoint(i, n));
      ps.forEach((p) => expect(within(p, MAX_RADIUS)).toBe(true));
      expect(apart(ps)).toBe(true);
    }
  });
  it('isOutside uses the collider extent, not the centre', () => {
    expect(isOutside([TRAY.halfWidth + 0.5, 1, 0], 0.7)).toBe(false);
    expect(isOutside([TRAY.halfWidth + 0.8, 1, 0], 0.7)).toBe(true);
    expect(isOutside([0, 1, -(TRAY.halfDepth + 0.8)], 0.7)).toBe(true);
    expect(isOutside([0, -0.8, 0], 0.7)).toBe(true);
    expect(isOutside([0, 0.7, 0], 0.7)).toBe(false);
  });
  it('tray colliders close the box from the floor to the lid', () => {
    const boxes = trayColliders();
    const floor = boxes.find((b) => b.kind === 'floor')!;
    expect(floor.center[1] + floor.half[1]).toBeCloseTo(0);
    const walls = boxes.filter((b) => b.kind === 'wall');
    expect(walls).toHaveLength(4);
    walls.forEach((w) => { expect(w.center[1] - w.half[1]).toBeCloseTo(0); expect(w.center[1] + w.half[1]).toBeCloseTo(TRAY.lidY); });
    const lid = boxes.find((b) => b.kind === 'lid')!;
    expect(lid.center[1] - lid.half[1]).toBeCloseTo(TRAY.lidY);
  });
});
