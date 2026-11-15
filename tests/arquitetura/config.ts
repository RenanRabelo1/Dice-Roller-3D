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

/** The root tests (`tests/*.ts`, `tests/helpers/**`) are read too, for the single door only (rule 1 of the guide;
 * ADR 0006): `tests/arquitetura/` is the suite itself and its fixtures break the rules on purpose. */
export const RAIZES_TESTES_DA_RAIZ = ['tests'];
export const FORA_DOS_TESTES_DA_RAIZ = ['tests/arquitetura'];

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
 * file breaks on that data. Remove it in the same commit that moves the access; the suite fails until you do.
 * Empty since OS-0049 (phase 7). A permanent permission is not an entry here: it lives in the rule, named, like
 * the failure store of `src/shared/plataforma/falha.ts` (ADR 0008) in rule 5 of `donos.ts`. */
export interface DadoLegado { arquivo: string; dado: string; motivo: string }

export const DADOS_LEGADO: DadoLegado[] = [];
