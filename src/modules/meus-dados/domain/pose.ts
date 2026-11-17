import type { Vec3 } from '../../../shared/math.ts';

const SLACK = (15 * Math.PI) / 180; // a face this close to the highest one counts as "on top" too

// The die rests on face `apoio` (its normal points down). The faces that look most upward in that pose: the highest
// one and any within 15° of it. Opposite a long face of a shard sits an edge, so two faces light up there.
// Only faces that count as a result are candidates; the resting face never is.
export function facesDeCima(faces: { normal: Vec3; readable?: boolean }[], apoio: number): number[] {
  const rest = faces[apoio]?.normal;
  if (!rest) return [];
  const angle = (i: number) => Math.acos(Math.max(-1, Math.min(1, -(faces[i].normal[0] * rest[0] + faces[i].normal[1] * rest[1] + faces[i].normal[2] * rest[2]))));
  const cand = faces.map((_, i) => i).filter((i) => i !== apoio && faces[i].readable !== false);
  if (!cand.length) return [];
  const best = Math.min(...cand.map(angle));
  return cand.filter((i) => angle(i) <= best + SLACK);
}
