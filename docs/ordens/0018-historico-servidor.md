# Ordem de serviço: `historico`, a metade do servidor

Ordem: OS-0018 (extração nº 2, `historico`, parte 1 de 2)
Módulo: `historico` (backend)
Escopo de escrita:
- novos:
  - `server/src/modules/historico/`: `CLAUDE.md`, `index.ts`, `contracts.ts`, `routes.ts`, `service.ts`, `repository.ts`, `tests/api.test.ts`
  - `server/src/shared/db.ts`
- casca do servidor: `server/src/app.ts`, `server/src/main.ts`
- removidos: `server/src/rules.ts`, `server/src/rolls.ts`, `server/test/api.test.ts` (com `git mv` para o novo lugar)
- `server/vitest.config.ts` (o `include`)
- `tests/arquitetura/**`: as regras internas do servidor e o `DADOS_LEGADO` de `rolls`
- `server/README.md` e `docs/contexto/testes.md`, nas linhas que citam os arquivos movidos

**Decisão do orquestrador (2026-11-13), depois de o dev reportar conflito:** o setup do teste monta o app com um `store` pronto, que o `index.ts` não expõe. Adota-se a **opção B**:
- `historicoRoutes(app, { rolls })` recebe a `Collection` e monta o repositório por dentro;
- o `buildApp` passa a receber `rolls` no lugar de `store`;
- no teste, a linha do setup (17) e o acesso à coleção antiga (108-109) podem mudar além dos imports, desde que **nenhuma asserção** mude.

Tirar `server/test` de `RAIZES` (`tests/arquitetura/config.ts`) também está autorizado.

**Segunda ampliação de escopo (2026-11-13), para fechar as pendências do dev:**
- `server/tsconfig.json`: tirar `test` do `include`;
- `tests/arquitetura/`: a busca de ciclos passa a cobrir `server/src`, com uma fixture que prove que um ciclo ali dispara.

**Terceira decisão (2026-11-13):** a busca de ciclos em `server/src` achou um ciclo de pasta, `app.ts → modules/historico → app.ts`, porque o teste do módulo importava `buildApp`. Adota-se a **opção A**:
- o teste do módulo monta o próprio Fastify só com `historicoRoutes`;
- os testes de `/health` e de CORS, que são da casca, vão para `server/src/tests/app.test.ts`;
- as asserções não mudam e o total continua em 23.

Objetivo: a API de histórico passa a ser o módulo `historico` do servidor, com a estrutura da seção 3 do guia:
- `routes.ts` sem regra de negócio;
- `service.ts` com o cálculo do que se grava, usando `regras`;
- `repository.ts` como o único que fala com a coleção `rolls`.

O comportamento HTTP não muda. Os 23 testes passam no novo lugar sem nenhuma asserção alterada.

Leia antes de começar:
- `docs/specs/historico.md`: o `CLAUDE.md` do módulo, a origem do código e os critérios. Leia só a parte do backend.
- `docs/adr/0004-contratos-entre-frontend-e-backend.md`
- `docs/adr/0006-testes-de-arquitetura.md`: as regras de `server/`
- `server/src/app.ts`, `main.ts`, `rules.ts`, `rolls.ts` (todos curtos) e `server/vitest.config.ts`
- `tests/arquitetura/config.ts` e `tests/arquitetura/regras.ts`
- `server/test/api.test.ts`: só o `import` e o setup, para saber como ele monta o app

Entregáveis:
1. **`contracts.ts`.** Os tipos HTTP `RollIn`, `DieIn`, `Roll`, `RollPage` e `RollQuery`, mais os esquemas JSON das duas rotas, que hoje estão em `app.ts:18-56`.
   - Os tipos ficam escritos de forma que o cliente consiga importá-los com `import type`. Isso quer dizer: sem importar `mongodb` nem `fastify` no arquivo de tipos.
   - Se os esquemas precisarem de algo de `regras` (`KINDS`, `CUSTOM_BASES`, `FREE_VALUES`, `MAX_DICE`), o import é de valor e pode ficar no mesmo arquivo. O `import type` do cliente apaga isso.
2. **`service.ts`.** O `score`, o `clean` e o `CUSTOM` de hoje (`rules.ts`), com o mesmo resultado.
3. **`repository.ts`.** (Ao mover, o comentário "at most 10" de `rolls.ts:5` passa a citar `MAX_DICE`.) Tudo o que hoje está em `rolls.ts`: criar a coleção, o validador, o `collMod` com aviso no log, o índice, a inserção e a consulta paginada.
   - Este arquivo é o único do módulo que importa `mongodb`. A conexão (`MongoClient`) sai de `main.ts` e vai para `server/src/shared/db.ts`.
4. **`routes.ts`.** O plugin `historicoRoutes(app, { rolls })`.
   - Só valida o esquema, chama o `service`/`repository` e traduz o `{ error }` em 400.
   - Nenhuma regra fica aqui.
5. **`index.ts`.** Expõe `historicoRoutes` e `prepararColecao(db)`. Nada mais.
6. **Casca do servidor.**
   - `app.ts` mantém `buildApp`, o CORS e o `/health`, e registra o plugin.
   - `main.ts` sobe o servidor com `shared/db.ts`.
   - As mensagens, os códigos HTTP e o log continuam iguais.
7. **Testes.** `git mv server/test/api.test.ts server/src/modules/historico/tests/api.test.ts`.
   - Ajuste só os imports.
   - O `server/vitest.config.ts` passa a incluir só `src/**/tests/**/*.test.ts`, se `test/` ficar vazio. Se não ficar, mantenha os dois.
8. **`CLAUDE.md` do módulo.** Os cinco blocos da spec, com 30 a 50 linhas. Por enquanto inclua só a metade do backend, e anote que a metade do cliente entra na OS-0019.
9. **Arquitetura** (`tests/arquitetura/`). Inclua as regras de servidor do ADR 0006:
   - o `routes.ts` de um módulo só importa o próprio `service.ts`/`contracts.ts`/`repository.ts`, ou algo de `shared/`;
   - `mongodb` só aparece em `repository.ts` e em `server/src/shared/db.ts`.

   Cada regra ganha uma fixture que prove que ela dispara.

   Além disso, a exceção `DADOS_LEGADO` de `server/src/rolls.ts` sai. O acesso a `rolls` passa a estar em `server/src/modules/historico/repository.ts`, no módulo dono, sem exceção.

Critérios de aceite:
- `npm run test:server` passa (typecheck mais os 23 testes no novo lugar), sem nenhuma asserção alterada. Mostre o `git diff -M --stat` do teste movido.
- `npm test` passa, incluindo a arquitetura: as regras novas de servidor estão verdes e as fixtures delas disparam. O mesmo vale para `npm run build` e `npm run lint`.
- `grep -rn "from 'mongodb'" server/src` encontra só `repository.ts` e `shared/db.ts`.
- `server/src/rules.ts` e `server/src/rolls.ts` não existem mais.
- **Sem E2E nesta ordem** (regra de gate desde a OS-0017). O E2E completo roda no aceite do `historico`, depois da OS-0019.

Fora do escopo:
- A metade do cliente (`src/api/history.ts`, `App.tsx`), que é a OS-0019.
- Mudar rota, esquema, mensagem, índice ou validador.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**Arquivos movidos (`git mv`):** `rolls.ts` → `repository.ts`, `rules.ts` → `service.ts` e `server/test/api.test.ts` → `modules/historico/tests/api.test.ts`.

**Arquivos novos:**
- `contracts.ts`: tipos HTTP, os esquemas e `CUSTOM`. Sem `fastify` nem `mongodb`.
- `routes.ts`: o plugin `historicoRoutes(app, { rolls })`, opção B.
- `index.ts`: expõe `historicoRoutes` e `prepararColecao`.
- `CLAUDE.md`: 34 linhas, metade do backend.
- `server/src/shared/db.ts`: a conexão.
- `server/src/tests/app.test.ts`: o teste de `/health` e de CORS, que é da casca (opção A).

O `service.ts` ganhou `record()`, que grava `force ?? null`, para que a rota não tenha regra.

**Casca:** `app.ts` e `main.ts`. **Configuração:** `server/vitest.config.ts` (`src/**/tests/**`) e `server/tsconfig.json` (sem `test`).

**Arquitetura:**
- regras novas: `rotasDoServidor`, `mongodbSoNoRepositorio` e ciclos em `server/src`, nos níveis de arquivo e de pasta, cada uma com fixture que dispara;
- sai `DADOS_LEGADO` de `rolls.ts`;
- sai `server/test` de `RAIZES`.

**Três paradas do dev, cada uma com decisão do orquestrador registrada no topo:**
1. O setup do teste usava um `store` que o `index` não expõe → opção B.
2. Pendências do `tsconfig` e dos ciclos no servidor → escopo ampliado.
3. A busca de ciclos achou `app.ts → modules/historico → app.ts`, pelo teste que importava `buildApp` → opção A: o teste da casca foi separado.

O dev também registrou que o teste mudou só nas linhas de setup autorizadas, e que o único teste que mudou de arquivo foi "reports its health and lets the dev front end call it", que foi para `server/src/tests/app.test.ts`.

## Parecer do revisor

**APROVADO.** Os 9 itens estão ✅.

Comportamento HTTP conferido contra o HEAD:
- rotas, esquemas (iguais caractere a caractere), códigos e mensagens;
- `/health` com 503, CORS, `$jsonSchema`, o `warn` do `collMod` e o índice.

Asserções: as 31 chamadas `expect(` e os 23 `it(` são iguais aos de antes, divididos em 22 + 1.

Observações sem bloqueio, todas encaminhadas:
1. A exceção de `tests/` na regra do mongodb vale para qualquer pasta → OS-0019 restringe ao servidor.
2. O `CLAUDE.md` diz "único arquivo que importa mongodb" sem "de produção" → OS-0019.
3. O "Consome" cita `shared/db.ts` e um logger que não existe → OS-0019.
4. O ADR 0006 não tinha a ampliação da regra das rotas → registrado pelo orquestrador neste commit.

## Gate

2026-11-13, pelo orquestrador. Sem E2E, pela regra desde a OS-0017; o aceite do `historico` roda depois da OS-0019.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 34 arquivos, 420 testes (35 de arquitetura) |
| `npm run test:server` | ✅ typecheck + 23 testes, em 2 arquivos |
