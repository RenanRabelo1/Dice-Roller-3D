import type { Object3D } from 'three';
import { readModel } from '../../../shared/modelos3d/index.ts';
import type { CustomDie } from '../contracts.ts';
import { catalogoAlterado, customKind } from './catalogo.ts';
import { markInk } from './gravacao.ts';
import { LIMITES_DO_MODELO_SALVO } from './limites.ts';

// The player's model in the scene. It pulls the GLB/STL loaders, so it is a separate chunk (ADR 0007, point 11):
// only `carregarModelo` (domain/aparencia.ts, exposed by index.ts) loads it, with import(). Never import this file statically.

// --- showing the model in the scene -----------------------------------------------------------------------------

const loaded = new Map<string, Promise<Object3D>>();
// The model's own meshes, parsed once per die; callers clone it.
export function modelObject(die: CustomDie): Promise<Object3D> {
  const key = customKind(die.id);
  let p = loaded.get(key);
  if (!p) { p = readModel(die.file.bytes, die.file.format, LIMITES_DO_MODELO_SALVO).then((m) => (die.printed ? markInk(m.object, { poly: die.poly, fit: die.fit }) : m.object)); loaded.set(key, p); }
  return p;
}

const forgetModel = (kind: string) => { loaded.delete(kind); };
// A removed kind frees its parsed model (memory only; nothing the player sees changes). A re-registered kind keeps it.
catalogoAlterado.subscribe(({ kind, mudanca }) => { if (mudanca === 'removido') forgetModel(kind); });
