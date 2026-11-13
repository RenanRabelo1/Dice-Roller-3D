// Configuration of the architecture suite: what is read and every named exception, each one
// next to the ADR or plan line that allows it (ADR 0006: no exception without an ADR).

/** Folders the reader walks, relative to the repo root. */
export const RAIZES = ['src', 'server/src', 'server/test'];

export type Nivel = 'arquivo' | 'pasta';
/** A cycle that still exists in the legacy code. `membros` is the whole strongly connected
 * component, sorted. At `pasta` level a unit is `src/modules/<m>`, `src/<pasta>` or a root file.
 * Remove the entry in the same commit that breaks the cycle; the suite fails until you do. */
export interface CicloConhecido { nivel: Nivel; membros: string[]; motivo: string }

export const CICLOS_CONHECIDOS: CicloConhecido[] = [
  {
    nivel: 'arquivo',
    membros: ['src/dice/custom.ts', 'src/dice/polyhedra.ts'],
    motivo: 'mapa-modulos.md, "Ciclos de hoje", linha "arquivos custom.ts ↔ polyhedra.ts": polyhedron(kind) resolve importados pelo registro. Some na extração de dados (plano-refatoracao.md §8).',
  },
  {
    nivel: 'pasta',
    membros: ['src/physics', 'src/throw'],
    motivo: 'mapa-modulos.md, "Ciclos de hoje", linha "pastas dice ↔ physics ↔ throw" (o lado dice saiu na F-3): TRAY/LAUNCH/SETTLE/HAND moram em physics/world.ts, que o throw/ lê, e physics/apply.ts lê throw/. Some quando throw/ + physics/ virarem o módulo arremesso (plano-refatoracao.md §8).',
  },
];

/** `server/**` → `src/**`: only these files. Named exception that falls with the `regras`
 * extraction, when the only allowed target becomes `src/modules/regras/index.ts` (ADR 0002, ADR 0004). */
export const SERVIDOR_PODE_IMPORTAR = ['src/dice/kinds.ts', 'src/dice/omen.ts'];

/** Packages `src/modules/regras/**` may never import (ADR 0002). Any other package also fails
 * ("nada fora do próprio módulo"); this list only names the failure. A trailing `/` is a scope. */
export const PACOTES_PROIBIDOS_EM_REGRAS = ['three', 'react', '@react-three/', '@dimforge/', 'zustand'];

/** The module's own tests (`src/modules/regras/tests/`) may import the test runner (ADR 0007, ponto 9). */
export const REGRAS_TESTES_PODEM_IMPORTAR = ['vitest'];
