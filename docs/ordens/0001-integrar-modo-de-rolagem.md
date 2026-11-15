# Ordem de serviço: integrar `feat/modo-de-rolagem` antes da refatoração

Ordem: OS-0001 (RS-0, rede de segurança)
Escopo de escrita: o merge de `feat/modo-de-rolagem` (snapshot `1e4d815`) em `refac/first-complete`; só os arquivos que o merge toca
Objetivo: a base refatorada passa a conter os dois commits do trabalho paralelo (modo de rolagem relativo/estático e botões de teste de presságio), com os conflitos resolvidos e o gate verde.

Leia antes de começar:
- `docs/plano-refatoracao.md`, seção 6
- `git show d56b71a` e `git show 1e4d815` (os dois commits)
- os 4 arquivos em conflito, nos dois lados: `docs/contexto/armadilhas.md`, `docs/contexto/testes.md`, `src/testHook.ts`, `src/ui/Controls.tsx`

Entregáveis:
- Rodar `git merge --no-ff --no-commit 1e4d815` nesta worktree e resolver os 4 conflitos mantendo **os dois lados**: o que `origin/main` trouxe desde `ffd4046` (forma livre, histórico, gravação acesa…) e o que os dois commits acrescentam.
- Conferir os arquivos que se fundiram sozinhos (`App.tsx`, `index.css`, `presim.ts`, `Hand.tsx`, `Stage.tsx`, `store.ts`, docs de `contexto`) quanto a código que compila mas ficou incoerente: por exemplo, um campo novo do store que o test hook não expõe, ou um texto de doc duplicado.
- Deixar o merge **sem commit** (o orquestrador faz o commit depois da revisão).

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` passando (os testes novos `tests/omenTest.test.ts` e os casos novos em `aim`, `gesture` e `store` incluídos).
- `npm run e2e` passando, incluindo os casos novos de `e2e/roll.spec.ts` e `e2e/omen.spec.ts`.
- Nenhuma mudança além do merge e da resolução dos conflitos: sem refatorar, renomear ou "melhorar" nada.
- `docs/contexto/*.md` descrevendo os dois lados sem contradição.

Fora do escopo:
- Alterar a branch `feat/modo-de-rolagem` ou qualquer outra branch, fazer commit, push ou rebase.
- Corrigir defeitos já conhecidos (`docs/diagnostico.md` §10).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Merge `--no-ff --no-commit 1e4d815` feito e os 4 conflitos resolvidos mantendo os dois lados. O relatório escrito se perdeu quando a sessão do orquestrador foi reiniciada no meio da rodada de E2E; o estado foi conferido no índice (`MERGE_HEAD = 1e4d815`, sem arquivo em conflito nem marcador) e o gate abaixo foi rodado de novo pelo orquestrador.

## Parecer do revisor

**APROVADO.** O índice bate com o auto-merge do Git, exceto nos 4 arquivos em conflito, cuja resolução só usa linhas dos dois lados.

- ✅ Só arquivos do merge: 23 arquivos, os mesmos e com as mesmas contagens de `git diff --stat ffd4046 1e4d815`.
- ✅ Os dois lados nos 4 conflitos: `armadilhas.md` (retorno sob carga, mesa quebrada + só a mesa começa arremesso), `testes.md` (`reducedMotion` + `force`, `table()`/`shards()`, botões de teste), `testHook.ts` (`error`, `reducedMotion` + `force`), `Controls.tsx` (`InkButton` + `RollMode`).
- ✅ Nada além do merge.
- ✅ Testes novos no índice: `tests/omenTest.test.ts`, casos em `aim`/`gesture`/`store`, `e2e/roll.spec.ts`, `e2e/omen.spec.ts`.
- ✅ `docs/contexto` sem contradição criada pelo merge.
- ✅ Critérios verificáveis por leitura: `force` no hook e usado pelo E2E, `chargeMode`/`omenTest` no store, `OmenTests` montado, `presimulateFor` sem import morto.

Observações sem bloqueio, herdadas da branch (viram ordem de correção de docs):
1. `docs/contexto/arremesso.md:42` ainda descreve `RollRequest { dice, start, launch, customs }` e `presimulate`; o código usa `bias` e `presimulateFor`.
2. `docs/contexto/testes.md:47` não cita o caso Relativa/Estática de `e2e/roll.spec.ts`.
3. `Hand.tsx:94` só começa arremesso com toque no canvas ou na `.game-area`; os filhos novos `Backdrop`/`Failure` não atrapalham (E2E verde).
4. `App.tsx:28` grava `s.force` no histórico; no modo Estática tende a 1. Coerente.

## Gate

2026-11-13, rodado pelo orquestrador sobre o índice do merge:

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 22 arquivos, 331 testes |
| `cd server && npm test` (o `test:server` nasce na RS-4) | ✅ 1 arquivo, 23 testes |
| `npm run e2e` | ✅ 86 passaram (17,2 min) |
