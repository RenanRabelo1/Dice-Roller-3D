import { expect, it } from 'vitest';
import { Vector3, type BufferGeometry } from 'three';
import { partesDaMao } from '../scene/vampiroMao.ts';

function size(geometry: BufferGeometry) {
  geometry.computeBoundingBox();
  return geometry.boundingBox!.getSize(new Vector3());
}

it.each([-1, 1])('sculpts a flat palm with a narrower wrist and a long middle finger (%s)', (side) => {
  const { palma, dedos, garras } = partesDaMao(side);
  const palm = size(palma), finger = size(dedos[1]);
  const vertices = palma.getAttribute('position');
  let wrist = 0;
  for (let i = 0; i < vertices.count; i++) {
    if (Math.abs(vertices.getY(i) + 0.31) < 0.015) wrist = Math.max(wrist, 2 * Math.abs(vertices.getX(i)));
  }
  expect(palm.z / palm.x).toBeLessThanOrEqual(0.35);
  expect(palm.y / finger.y).toBeGreaterThanOrEqual(0.90);
  expect(palm.y / finger.y).toBeLessThanOrEqual(1.10);
  expect(wrist / palm.x).toBeGreaterThan(0);
  expect(wrist / palm.x).toBeLessThanOrEqual(0.75);
  palma.dispose();
  [...dedos, ...garras].forEach((geometry) => geometry.dispose());
});
