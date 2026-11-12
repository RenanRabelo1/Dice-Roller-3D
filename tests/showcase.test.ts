import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { polyhedron, type DieKind } from '../src/dice/polyhedra';
import { CAPTION, showcasePoses } from '../src/scene/showcase';
import { HL_SIZE } from '../src/scene/highlight';
import { customKind, unregisterCustom } from '../src/dice/custom';
import { freeDieOf, prismTriangles, shardTriangles } from './helpers/models';

const camera = (aspect: number) => {
  const c = new PerspectiveCamera(40, aspect);
  c.position.set(0, 14, 10); c.lookAt(0, 0, 0); c.updateMatrixWorld();
  return c;
};
const view = (c: PerspectiveCamera) => ({ position: c.position, quaternion: c.quaternion, fov: c.fov, aspect: c.aspect });

describe('showcasePoses', () => {
  it.each([1.6, 0.46])('coins in rows (aspect %s): each Cara/Coroa under its coin clears the die below', (aspect) => {
    const c = camera(aspect), kinds: DieKind[] = ['d100', 'd100', 'd100', ...Array<DieKind>(7).fill('coin')];
    const polys = kinds.map((k) => polyhedron(k)), poses = showcasePoses(polys, polys.map((p) => p.faces[0].value), view(c));
    const up = new Vector3(0, 1, 0).applyQuaternion(c.quaternion), height = (i: number) => new Vector3(...poses[i].p).dot(up);
    const cols = aspect >= 1 ? 5 : 3;
    polys.forEach((poly, i) => {
      if (poly.shape !== 'coin' || i + cols >= polys.length) return;
      const captionBottom = height(i) - poly.radius - CAPTION.gap - (HL_SIZE * CAPTION.scale) / 2;
      expect(captionBottom).toBeGreaterThan(height(i + cols) + polys[i + cols].radius);
    });
  });

  it.each<[DieKind, number, number]>([['d4', 4, 1.6], ['d6', 1, 1.6], ['d20', 10, 1.6], ['d20', 10, 0.46], ['d100', 10, 1.6], ['d10', 3, 0.46]])(
    '%s × %i (aspect %s): the rolled number faces the camera upright, every die on screen',
    (kind, count, aspect) => {
      const c = camera(aspect);
      const polys = Array.from({ length: count }, () => polyhedron(kind));
      const raw = polys.map((p, i) => (kind === 'd4' ? p.tops : p.faces)[i % p.faces.length].value);
      const poses = showcasePoses(polys, raw, view(c));
      const up = new Vector3(0, 1, 0).applyQuaternion(c.quaternion);
      poses.forEach(({ p, q }, i) => {
        const rot = new Quaternion(...q);
        const label = polys[i].labelList.find((l) => l.value === raw[i])!;
        const toCam = c.position.clone().sub(new Vector3(...p)).normalize();
        expect(new Vector3(...label.normal).applyQuaternion(rot).dot(toCam)).toBeCloseTo(1, 5); // faces the camera
        expect(new Vector3(...label.up).applyQuaternion(rot).dot(up)).toBeGreaterThan(0.9); // reads upright
        const ndc = new Vector3(...p).project(c);
        expect(Math.abs(ndc.x)).toBeLessThan(0.95); expect(Math.abs(ndc.y)).toBeLessThan(0.95); expect(ndc.z).toBeLessThan(1);
      });
      poses.forEach((a, i) => poses.slice(i + 1).forEach((b) => expect(new Vector3(...a.p).distanceTo(new Vector3(...b.p))).toBeGreaterThan(1.8)));
    },
  );
  it('keeps results order left to right in one row', () => {
    const polys = [1, 2, 3].map(() => polyhedron('d6'));
    const xs = showcasePoses(polys, [1, 2, 3], view(camera(1.6))).map(({ p }) => p[0]);
    expect(xs[0]).toBeLessThan(xs[1]); expect(xs[1]).toBeLessThan(xs[2]);
  });
  it('free-form dice (a prism and a shard) fly with the rolled face to the camera, upright', () => {
    const c = camera(1.6);
    const prism = freeDieOf(prismTriangles(5, 1.4), 'Prisma', 'prisma');
    const shard = freeDieOf(shardTriangles(5), 'Shard', 'shard');
    const polys = [prism, shard].map((d) => polyhedron(customKind(d.id)));
    const raw = polys.map((p) => p.labelList[p.labelList.length - 1].value); // the last readable face
    const poses = showcasePoses(polys, raw, view(c));
    const up = new Vector3(0, 1, 0).applyQuaternion(c.quaternion);
    poses.forEach(({ p, q }, i) => {
      const rot = new Quaternion(...q);
      const label = polys[i].labelList.find((l) => l.value === raw[i])!;
      const toCam = c.position.clone().sub(new Vector3(...p)).normalize();
      expect(new Vector3(...label.normal).applyQuaternion(rot).dot(toCam)).toBeCloseTo(1, 5);
      expect(new Vector3(...label.up).applyQuaternion(rot).dot(up)).toBeGreaterThan(0.9);
    });
    // Seen from above (an engraved die): the resting face looks away from the camera, the numeral still reads upright.
    showcasePoses(polys, raw, view(c), [true, true]).forEach(({ p, q }, i) => {
      const rot = new Quaternion(...q);
      const label = polys[i].labelList.find((l) => l.value === raw[i])!;
      const toCam = c.position.clone().sub(new Vector3(...p)).normalize();
      expect(new Vector3(...label.normal).applyQuaternion(rot).dot(toCam)).toBeCloseTo(-1, 5);
      expect(new Vector3(...label.up).applyQuaternion(rot).dot(up)).toBeGreaterThan(0.9);
    });
    unregisterCustom(customKind(prism.id)); unregisterCustom(customKind(shard.id));
  });
});
