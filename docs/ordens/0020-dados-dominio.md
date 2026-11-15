# Ordem de serviço: `dados`, domínio (sólidos, catálogo, leitura, símbolos)

Ordem: OS-0020 (extração nº 3, `dados`, parte 1 de 3)
Módulo: `dados`
Escopo de escrita:
- **Módulo novo** `src/modules/dados/`: `contracts.ts`, `index.ts`, `domain/*.ts`, `tests/*.test.ts`. O `CLAUDE.md` fica para a parte 3.
- **Legado, só como ponte:** `src/dice/polyhedra.ts`, `src/dice/custom.ts`, `src/dice/read.ts`, `src/dice/symbols.ts`, `src/physics/world.ts` (só o `MAX_RADIUS`).
- **Testes que mudam de lugar** (`git mv`): `tests/polyhedra.test.ts`, `tests/read.test.ts`, `tests/symbols.test.ts`, e a parte de `tests/custom.test.ts` que testa registro e cor de tinta.
- **Arquitetura:** `tests/arquitetura/config.ts`, só a entrada `custom.ts ↔ polyhedra.ts` de `CICLOS_CONHECIDOS`.

**Escopo ampliado pelo orquestrador (2026-11-13):** entra `tests/arquitetura/**` e `docs/contexto/testes.md`, para duas coisas:
- a aresta esperada de `leitor.test.ts` passa a ser uma do módulo, porque a de `read.ts` sumiu quando o arquivo virou ponte;
- uma **regra nova**: um arquivo de `src/modules/<m>/**` não importa o legado nem a casca (plano §3). Até aqui, essa regra só era conferida por grep.

Objetivo: a parte sem React do `dados` passa a viver em `src/modules/dados/`:
- os sólidos (geometria, faces, numeração, rótulos, `fromTriangles`, `RADIUS`, `OPPOSITE_SUM`);
- o catálogo de tipos (embutidos + importados registrados, `polyhedron(kind)`, ordem, base);
- a leitura da face de cima e os resultados;
- os símbolos;
- a cor da tinta e o acabamento.

O ciclo `custom.ts ↔ polyhedra.ts` some, e o legado continua funcionando por pontes. O comportamento não muda.

Leia antes de começar:
- `docs/specs/dados.md`: regras de negócio, "Expõe", origem do código e critérios
- `src/modules/regras/CLAUDE.md` e `src/modules/regras/index.ts`, porque `dados` consome `regras`
- `src/dice/polyhedra.ts`, `custom.ts`, `read.ts` e `symbols.ts` inteiros (cerca de 430 linhas no total)
- `src/physics/world.ts:20-24`
- os imports de `tests/polyhedra.test.ts`, `read.test.ts`, `symbols.test.ts` e `custom.test.ts`

Decisões do orquestrador:
1. **Nomes.** O `index.ts` mantém os nomes que o código já usa: `polyhedron`, `fromTriangles`, `readUp`, `toResults`, `symbolGeometry`, `sortDice`, `allKinds`, `baseOf`, `customsOf`, `customKind`, `customDie`, `customList`, `registerCustom`, `registerPoly`, `unregisterCustom`, `inkColorOf`, `finishOf`, `INK_COLORS`, `RADIUS`, `OPPOSITE_SUM`, e os tipos `Polyhedron`, `Face`, `Label`, `Numbering`, `SymbolName`, `CustomDie`, `StdBase`, `Ink`, `Finish`. Os nomes em português da spec (`poliedro`, `lerFaceDeCima` etc.) não são adotados, para não mexer em dezenas de pontos de chamada sem ganho. Funções **novas** ganham nome em português.
2. **`RAIO_MAXIMO`.** O `MAX_RADIUS = 0.9` de `physics/world.ts` vira `RAIO_MAXIMO` em `dados`, como manda a spec. `world.ts` passa a ter `export const MAX_RADIUS = RAIO_MAXIMO; // ponte até a extração de arremesso`. O teste "RADIUS and MAX_RADIUS agree" vai para o módulo, sobre `RAIO_MAXIMO`.
3. **`paraRegras(kind) → DieKind`.** É função nova, igual a `tipoParaPresagio({ kind, ...customDie(kind) })`. Com ela, o `isD20` de `omen.ts` passa a ser `paraRegras(kind) === 'd20'`. A troca do `isD20` fica para a parte 3; aqui só entra a função, com teste.
4. **`CustomDie`.** Por enquanto o tipo inteiro fica no `contracts.ts` de `dados`, com `file` e tudo. A separação entre o tipo jogável e o registro salvo é feita na extração de `meus-dados`.
5. **Estrutura sem ciclo.** `domain/solidos.ts` (tipos, construtores, `fromTriangles`, sólidos embutidos) não importa o catálogo. `domain/catalogo.ts` (registro de importados, `polyhedron(kind)`, `sortDice`, `allKinds`, `baseOf`, `customsOf`, `paraRegras`) importa `solidos`. Depois vêm `domain/leitura.ts`, `domain/simbolos.ts` e `domain/tinta.ts` (`inkColorOf`, `finishOf`, `INK_COLORS`).
6. **Pontes.** `polyhedra.ts`, `custom.ts`, `read.ts` e `symbols.ts` viram só `export … from '../modules/dados/index'` dos nomes que exportam hoje, cada um com `// ponte até a OS-0022`. O que `dados` não expõe e o legado ainda usa fica no arquivo do legado, com a pergunta registrada no relatório.

Entregáveis:
1. O módulo com `contracts.ts`, `index.ts` e `domain/`, sem importar nada do legado. Pode importar `regras` (`index.ts`), `src/shared/math`, `three` e `three/examples`.
2. As pontes no legado e em `world.ts`.
3. Os testes movidos com `git mv` para `src/modules/dados/tests/`, ajustando só os imports. Da parte de `tests/custom.test.ts`, move-se para o módulo o que testa registro e tinta. O que testa `isD20`/`omenOf` fica onde está.
4. Um teste novo para `paraRegras`: importado d20 com e sem `omens`, base d6 e embutido.
5. A entrada `custom.ts ↔ polyhedra.ts` sai de `CICLOS_CONHECIDOS`, porque o ciclo some.

Critérios de aceite:
- `src/modules/dados/` não importa nada de `src/dice`, `src/scene`, `src/physics`, `src/throw`, `src/ui`, `src/store.ts` nem `src/app`. A suíte de arquitetura confirma.
- A suíte de arquitetura passa sem o ciclo `custom ↔ polyhedra` e sem ciclo novo.
- Os testes movidos passam sem mudar asserções. Mostre o `git diff -M --stat`.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A lista de chunks sob demanda do `vite build` não muda: `importer`, `ImportDie`, `tableFile`, `HDRLoader` e `ler`.
- **Sem E2E** (a regra de gate): o E2E completo roda no aceite do `dados`, depois da OS-0022.

Fora do escopo:
- Componentes React e cena (`Die.tsx`, `GemMaterial`, `usePainted`, `paintGlb`), o modelo importado (`modelObject`, `markInk`, `inkTriangles`, `dentTester`, `hasTexture`, `forgetModel`) e `nomeDoTipo`: isso é a OS-0021.
- Trocar os pontos de chamada do legado, `isD20`, o evento `catalogoAlterado` e `inspecao()`: isso é a OS-0022.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**Módulo `src/modules/dados/`:**
- `contracts.ts`: os tipos `SymbolName`, `Face`, `Top`, `Label`, `Polyhedron`, `Numbering`, `StdBase`, `CustomDie`, `Ink` e `Finish`.
- `domain/solidos.ts`: `SYMBOL`, `RADIUS`, `RAIO_MAXIMO`, `OPPOSITE_SUM`, os construtores, `build` e `fromTriangles`. Não importa o catálogo.
- `domain/catalogo.ts`: o registro, `polyhedron` com cache, `sortDice`, `allKinds`, `baseOf`, `customsOf` e `paraRegras`.
- `domain/leitura.ts`, `domain/simbolos.ts` e `domain/tinta.ts`.
- O `index.ts` expõe os nomes da decisão 1, mais `RAIO_MAXIMO` e `paraRegras`.

**Pontes (`// ponte até a OS-0022`):** `polyhedra.ts`, `custom.ts`, `read.ts` e `symbols.ts`, mais `world.ts` com `MAX_RADIUS = RAIO_MAXIMO`. `Top`, `SYMBOLS`, `customPoly`, `customOrder` e `customBase` deixaram de ser exportados pelas pontes, porque só o legado os usava.

**Testes:**
- `polyhedra`, `read` e `symbols` foram movidos com `git mv`.
- A tinta de `custom.test.ts` foi para `tinta.test.ts`.
- `catalogo.test.ts` é novo (TDD de `paraRegras`).
- Divergência: `read.test.ts` foi dividido. A parte que usa o `importer` e os helpers do legado ficou em `tests/read.test.ts`, idêntica ao original. Levá-la ao módulo criaria um ciclo com o legado.

**Ampliação de escopo:**
- A aresta esperada de `leitor.test.ts` passou a ser `dados/domain/leitura.ts → shared/math.ts`.
- Regra nova `moduloSemLegado`: um módulo não importa o legado nem a casca (plano §3). Tem fixture, e `regras`, `historico` e `dados` passam.

## Parecer do revisor

**APROVADO.** Itens 1, 2, 4, 5, 6, 7 e 9 ✅. Os itens 3 e 8 não se aplicam.
- O código é idêntico ao original, conferido por `diff`. As únicas diferenças são o `export` interno de `SYMBOL`/`build`, os três nomes que deixaram de ser exportados, `RAIO_MAXIMO` e dois comentários.
- `paraRegras` é equivalente a `tipoParaPresagio({ kind, ...customDie(kind) })`.
- As pontes cobrem todas as 37 linhas de import do legado.
- Os testes batem caso a caso: `read` 10 = 6 + 4, `custom` 16 = 14 + 2, `polyhedra` 19, `symbols` 2. Nenhuma asserção mudou.

Observações sem bloqueio:
1. `moduloSemLegado` só tem fixture de import estático. As fixtures de `import type` e `import()` vão para a OS-0021.
2. Um teste de módulo que importe `tests/helpers` do legado passaria sem alerta. Hoje não há caso assim.
3. Docs de contexto desatualizadas (`dados.md`, `visao-geral.md`, `arremesso.md`) vão para a OS-0022. A linha do ciclo no mapa foi atualizada pelo orquestrador neste commit.

## Gate

2026-11-13, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 39 arquivos, 428 testes |
| `npm run test:server` | ✅ 23 testes |

Sobre o build: apareceu o chunk `dados` (19,5 KB). Ele é de carga inicial, entra por `modulepreload` junto com `index`, `three.module` e `plataforma`, e contém o código que antes ia no `index`. A carga inicial ficou em 3.702,8 KB, contra 3.702 KB antes. Os chunks sob demanda (`importer`, `ImportDie`, `tableFile`, `HDRLoader` e `ler`) não mudaram.
