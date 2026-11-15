# Ordem de serviço: `historico`, metade do cliente

Ordem: OS-0019 (extração nº 2, `historico`, parte 2 de 2)
Módulo: `historico` (frontend)

Escopo de escrita:
- **Novos:** `src/modules/historico/index.ts`, `api.ts`, `repository.ts`, `CLAUDE.md` (aponta para o do servidor), `tests/*.test.ts`, e `src/app/historico.ts` (casca)
- **Removido:** `src/api/history.ts`
- **Alterados:**
  - `src/App.tsx`, só a ligação do histórico;
  - `tests/history.test.ts`, que se divide (ver item 5);
  - `server/src/modules/historico/CLAUDE.md`, que ganha a metade do cliente;
  - `tests/arquitetura/config.ts` (só a entrada `diceroller.player` de `DADOS_LEGADO`) e `tests/arquitetura/regras.ts` (só a exceção de `tests/` do item 7);
  - `docs/contexto/*.md`, só onde citam `api/history.ts`.

Objetivo: o envio do histórico pelo cliente passa a ser a metade `src/modules/historico/` do módulo. Ela é tipada pelo `contracts.ts` do servidor (ADR 0004) e é dona da chave `diceroller.player`. A casca chama o módulo. O comportamento não muda: o mesmo POST, com o mesmo corpo e no mesmo instante.

Leia antes de começar:
- `docs/specs/historico.md`, a metade do frontend e os critérios
- `docs/adr/0004-contratos-entre-frontend-e-backend.md`
- `server/src/modules/historico/contracts.ts` e `server/src/modules/historico/CLAUDE.md`
- `src/api/history.ts` (36 linhas), `src/App.tsx:20-25` e `tests/history.test.ts`

Desenho (decidido pelo orquestrador):
1. **`repository.ts`.** O `playerId()` de hoje: `localStorage['diceroller.player']` e, se o armazenamento estiver bloqueado, um UUID por visita.
2. **`api.ts`.**
   - Importa `RollIn` e `DieIn` com `import type` de `../../../server/src/modules/historico/contracts.ts`. É o único arquivo do cliente que importa do servidor.
   - O `fetch` é o de hoje: `keepalive`, `content-type`, a barra final do `VITE_API_URL` removida e o erro engolido.
   - O corpo é tipado como `RollIn`.
3. **`index.ts`.** Expõe `registrarArremesso({ dice: DieIn[], force: number }, api?)`.
   - Prende `force` entre 0 e 1.
   - Põe o `playerId`.
   - Sem `VITE_API_URL`, não faz nada.
   - Reexporta o tipo `DieIn` para a casca. Pode ser assim porque é um tipo do contrato.
4. **`src/app/historico.ts` (casca, ponte até a fase 6).**
   - Expõe `corpoDosDados(dice, results): DieIn[]`, que é o `dieBody` de hoje. Um importado vai com `base` e `omens` lidos do registro do legado (`customDie`).
   - Fica na casca porque um módulo extraído não importa o legado (plano §3).
   - O `App.tsx` assina o store como hoje e chama `registrarArremesso({ dice: corpoDosDados(s.dice, s.results), force: s.force })`.
   - Comente `// ponte até a fase 6: historico assina arremesso.resultadoPublicado`.
5. **Testes.** Divida `tests/history.test.ts`:
   - O que é do módulo vai para `src/modules/historico/tests/`, sem importar o legado: `playerId` (UUID, persistência, bloqueio), o envio (sem API não envia, `force` preso, erro de rede engolido, URL sem barra dupla).
   - O que monta o corpo de importados com o registro (`customDieOf`, `freeDieOf`) é da casca. Fica em `tests/` na raiz e passa a testar `corpoDosDados`.
   - Nenhuma asserção muda; só o que é testado mudou de função. No relatório, liste o destino de cada caso.
6. **`CLAUDE.md`.**
   - O do servidor (`server/src/modules/historico/CLAUDE.md`) passa a ter os cinco blocos das duas metades, com 30 a 50 linhas.
   - O `src/modules/historico/CLAUDE.md` tem uma ou duas linhas apontando para ele, para não haver duas fontes.
7. **Achados da revisão da OS-0018.** Três ajustes:
   - em `server/src/modules/historico/CLAUDE.md`, o `repository.ts` passa a ser descrito como "o único arquivo **de produção** do módulo que importa `mongodb`";
   - em "Consome", sai o `shared/db.ts`, que é usado pela casca e não pelo módulo, e sai o "logger", que não existe (é `console.warn`);
   - em `tests/arquitetura/regras.ts`, a exceção de pastas `tests/` da regra `mongodbSoNoRepositorio` fica restrita a `server/src/**/tests/`.
8. **Arquitetura.**
   - A entrada `src/api/history.ts`/`diceroller.player` sai de `DADOS_LEGADO`.
   - O acesso passa a estar em `src/modules/historico/repository.ts`, o dono.
   - A regra `src → server` (só `import type` de `contracts.ts`) já existe e precisa passar.

Critérios de aceite:
- `src/api/history.ts` não existe mais. `grep -rn "api/history" src tests e2e` volta vazio.
- `grep -rn "server/src" src` só encontra `src/modules/historico/api.ts`, com `import type`.
- Quebrar o tipo de um lado quebra o `tsc -b` da raiz. Para provar, mude temporariamente um campo de `RollIn`, veja o erro e desfaça. Registre o resultado.
- Devem passar: `npm test` (incluindo a arquitetura: dono de `diceroller.player` e `src → server`), `npm run build`, `npm run lint` e `npm run test:server`.
- **Aceite do módulo:** o orquestrador roda o `npm run e2e` completo. O `history.spec.ts` precisa passar sem alteração.

Fora do escopo:
- Trocar a assinatura do store pelo evento `resultadoPublicado`. Isso é da fase 6.
- Mudar o corpo, a chave, o instante do envio ou o tratamento de erro.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**Arquivos novos:**
- `src/modules/historico/repository.ts` (`playerId`, chave `diceroller.player`).
- `src/modules/historico/api.ts` (o `fetch`, com o corpo tipado como `RollIn` por `import type` do servidor).
- `src/modules/historico/index.ts` (`registrarArremesso` e o tipo `DieIn`).
- `src/modules/historico/CLAUDE.md` (aponta para o do servidor).
- Testes do módulo: `tests/jogador.test.ts` e `tests/envio.test.ts`.
- `src/app/historico.ts`: a casca, com `corpoDosDados` e o comentário de ponte.

**Arquivo removido:** `src/api/history.ts`.

**Arquivos alterados:**
- `App.tsx`: só a ligação, que continua assinando o store.
- `tests/history.test.ts`.
- `server/src/modules/historico/CLAUDE.md`: as duas metades, 38 linhas, com o item 7 e as duas regras da auditoria.
- `tests/arquitetura/config.ts`: sai a entrada `diceroller.player` de `DADOS_LEGADO`.
- `tests/arquitetura/regras.ts`: a exceção de `tests/` passa a valer só em `^server/src/(.+/)?tests/`.
- `visao-geral.md` e `testes.md`.

**Destino dos testes:**
- "sends each die" → `envio`, agora por `registrarArremesso`. O jogador esperado passou de `'p'` para `playerId()`, porque o id agora vem do módulo.
- "without API" e "posts JSON" → `envio`.
- "stable id" → `jogador`.
- "imported" e "free-form" ficam em `tests/history.test.ts` e passam a testar `corpoDosDados`.
- Casos novos: força presa entre 0 e 1, persistência do id e armazenamento bloqueado.

**Prova do tipo:** trocar `RollIn.playerId` por `player` faz o `tsc -b` da raiz falhar com TS2561 em `src/modules/historico/index.ts`. A troca foi desfeita.

## Parecer do revisor

**APROVADO.** Os 9 itens estão ✅.
- O comportamento é idêntico ao do HEAD: mesmo corpo, mesmo instante, mesma chave, mesmo UUID por visita, `keepalive`, barra final e erro engolido.
- A troca de `'p'` para `playerId()` não afrouxa o teste: continua um `toEqual` exato pelo caminho real até o `fetch`. Fere a letra de "nenhuma asserção muda", mas não a intenção, e a mudança foi forçada pelo desenho. **Aceita.**
- O módulo não importa o legado. `api.ts` é o único `import type` do servidor.

**Auditoria de aceite do `historico`.** Achados resolvidos neste commit:
- **P2, mapa:** citações velhas (`saveRoll`, `historico.registrar`), estado e dependências atuais. Corrigido pelo orquestrador.
- **P2, spec com duas regras fora do `CLAUDE.md`:** movimento reduzido e presságio forçado; montagem do `DieIn` na fase 6. Acrescentadas pelo dev.
- **P3, `testes.md`:** a exceção de `tests/` agora vale só no servidor. Corrigido pelo orquestrador.
- Nenhuma regra do histórico sobrou fora do módulo além da ponte comentada.

## Gate de aceite do módulo `historico`

2026-11-13, pelo orquestrador. Pela regra desde a OS-0017, é aqui que roda o E2E completo. Ele cobre as OS-0017, 0018 e 0019.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 36 arquivos, 423 testes |
| `npm run test:server` | ✅ 23 testes, em 2 arquivos |
| `npm run e2e` | ✅ 98 passaram (20,8 min), incluindo o `history.spec.ts` sem alteração |

**Módulo `historico` concluído.** A spec `docs/specs/historico.md` foi removida, porque o `server/src/modules/historico/CLAUDE.md` e o `contracts.ts` cobrem tudo o que ela dizia.
