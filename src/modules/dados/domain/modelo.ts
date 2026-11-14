import type { Object3D } from 'three';
import { readModel } from '../../../shared/modelos3d/index.ts';
import type { CustomDie } from '../contracts.ts';
import { customKind } from './catalogo.ts';
import { markInk } from './gravacao.ts';

// The player's model in the scene. It pulls the GLB/STL loaders, so it is a separate chunk (ADR 0007, point 11):
// only `carregarModelo` (domain/aparencia.ts, exposed by index.ts) loads it, with import(). Never import this file statically.

// The limits a saved die was accepted with when it was imported. They must follow meus-dados' import limits
// (`LIMITS` in src/dice/importer.ts), so a saved die always reads again.
const LIMITES_DO_MODELO_SALVO = { bytes: 10 * 1024 * 1024, triangles: 50_000, texture: 2048 };

// --- showing the model in the scene -----------------------------------------------------------------------------

const loaded = new Map<string, Promise<Object3D>>();
// The model's own meshes, parsed once per die; callers clone it.
export function modelObject(die: CustomDie): Promise<Object3D> {
  const key = customKind(die.id);
  let p = loaded.get(key);
  if (!p) { p = readModel(die.file.bytes, die.file.format, LIMITES_DO_MODELO_SALVO).then((m) => (die.printed ? markInk(m.object, { poly: die.poly, fit: die.fit }) : m.object)); loaded.set(key, p); }
  return p;
}

export const forgetModel = (kind: string) => { loaded.delete(kind); };
