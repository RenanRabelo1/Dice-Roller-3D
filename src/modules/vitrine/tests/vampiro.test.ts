import { expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { polyhedron } from '../../dados/index.ts';
import { indicesComPercurso, movimentoNoPresagio } from '../../pressagios/index.ts';
import { presagioVampiro, type DieKind } from '../../regras/index.ts';
import type { Pose } from '../../../shared/math.ts';
import { showcasePoses } from '../domain/showcase.ts';

it('routes the Vampire pair to its showcase poses and leaves the d20 for ordinary flight', () => {
  const camera = new PerspectiveCamera(40, 1.6);
  camera.position.set(0, 14, 10);
  camera.lookAt(0, 0, 0);
  const dice: DieKind[] = ['d20', 'vtm', 'vtm'];
  const final = showcasePoses(dice.map(polyhedron), [4, 0, 0], camera);
  const landed: Pose = { p: [3, 0.8, -1], q: [0, 0, 0, 1] };
  const { kraken, tempestade, vampiro } = indicesComPercurso(null, dice, presagioVampiro(dice, [4, 10, 10]));
  const at = (i: number, ms: number) => movimentoNoPresagio(i, ms, landed, final[i], kraken, tempestade, vampiro, camera.position.toArray());

  expect(at(0, 3750)).toBeNull();
  for (const i of [1, 2]) {
    const launched = new Vector3(...at(i, 3750)!.pose.p);
    expect(camera.position.distanceTo(launched)).toBeLessThan(3);
    expect(at(i, 5600)?.pose).toEqual(final[i]);
  }
});
