// Configuration of the architecture suite: what is read and every named exception, each one
// next to the ADR or plan line that allows it (ADR 0006: no exception without an ADR).

/** Folders the reader walks, relative to the repo root. */
export const RAIZES = ['src', 'server/src'];

export type Nivel = 'arquivo' | 'pasta';
/** A cycle that still exists in the legacy code. `membros` is the whole strongly connected
 * component, sorted. At `pasta` level a unit is `src/modules/<m>`, `src/<pasta>` or a root file.
 * Remove the entry in the same commit that breaks the cycle; the suite fails until you do. */
export interface CicloConhecido { nivel: Nivel; membros: string[]; motivo: string }

export const CICLOS_CONHECIDOS: CicloConhecido[] = [];

/** `server/**` → `src/**`: only the door of the pure `regras` module (ADR 0002, ADR 0004). */
export const SERVIDOR_PODE_IMPORTAR = ['src/modules/regras/index.ts'];

/** Packages `src/modules/regras/**` may never import (ADR 0002). Any other package also fails
 * ("nada fora do próprio módulo"); this list only names the failure. A trailing `/` is a scope. */
export const PACOTES_PROIBIDOS_EM_REGRAS = ['three', 'react', '@react-three/', '@dimforge/', 'zustand'];

/** The module's own tests (`src/modules/regras/tests/`) may import the test runner (ADR 0007, ponto 9). */
export const REGRAS_TESTES_PODEM_IMPORTAR = ['vitest'];

// ---- Data owner (rule 2 of the guide, ADR 0006 part B) ----

/** Production folders the data scan reads; any `tests/` folder inside them is skipped. */
export const RAIZES_DADOS = ['src', 'server/src'];
/** The single source of the owners: its ```json donos-dos-dados block. */
export const MAPA_DE_DONOS = 'docs/mapa-modulos.md';

/** One access the scan would refuse, allowed for now. `dado` is the store, key or collection name, or
 * `indexedDB`/`zustand` for the raw API. One entry per file and per data; it covers every rule that
 * file breaks on that data. Remove it in the same commit that moves the access; the suite fails until you do. */
export interface DadoLegado { arquivo: string; dado: string; motivo: string }

export const DADOS_LEGADO: DadoLegado[] = [
  {
    arquivo: 'src/scene/tableStore.ts', dado: 'tables',
    motivo: 'Legado sem módulo: a store é da mesa, que ainda não foi extraída. Vai para src/modules/mesa/repository.ts (ADR 0003 ponto 5; plano-refatoracao.md §8).',
  },
  {
    arquivo: 'src/scene/tableStore.ts', dado: 'mesa.ativa',
    motivo: 'Legado sem módulo: a chave é da mesa, que ainda não foi extraída. Vai para src/modules/mesa/repository.ts (ADR 0003 ponto 5; plano-refatoracao.md §8).',
  },
  {
    arquivo: 'src/store.ts', dado: 'zustand',
    motivo: 'Legado: o store único useDice, que some módulo a módulo na extração (ADR 0003, ponto 2 e Consequências; plano-refatoracao.md §8).',
  },
  {
    arquivo: 'src/scene/tableState.ts', dado: 'zustand',
    motivo: 'Legado: o store useTable da mesa, que ainda não foi extraída. Vai para src/modules/mesa/store.ts (ADR 0003 ponto 2; plano-refatoracao.md §8).',
  },
  {
    arquivo: 'src/shared/plataforma/falha.ts', dado: 'zustand',
    motivo: 'Permitida: a falha da plataforma mora num store próprio, privado ao arquivo, em shared/plataforma, como permite o ADR 0008.',
  },
];
