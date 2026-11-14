# Módulo `historico`

Duas metades, um CLAUDE.md (este). Servidor (OS-0018): `server/src/modules/historico/`; a porta é `index.ts`, tipos HTTP e esquemas em `contracts.ts`, `routes.ts` → `service.ts` → `repository.ts`. Cliente (OS-0019): `src/modules/historico/`; a porta é `index.ts`, o `fetch` em `api.ts`, o jogador em `repository.ts`.

## Responsabilidade
Guarda cada arremesso publicado num histórico no MongoDB, ligado a um jogador anônimo. No servidor recalcula com as regras do jogo o que grava (total, presságio, faces válidas) e não aceita o que o cliente afirma. No cliente envia cada arremesso sem esperar resposta. Sem `VITE_API_URL`, não envia nada.

## Regras de negócio
- O jogador anônimo é um UUID guardado em `localStorage['diceroller.player']` (dono: `src/modules/historico/repository.ts`). Sem armazenamento disponível, vale um UUID por visita.
- Cada resultado publicado gera um POST, no instante da publicação, com `keepalive`. Isso vale com movimento reduzido e com presságio forçado em teste (o comportamento atual, preservado). Falha de rede ou resposta de erro nunca atrapalha o jogo (o erro é engolido).
- Um importado vem com `base` e `omens`. O servidor guarda `omens` como `base === 'd20' && omens`.
- A força enviada fica entre 0 e 1 (o cliente prende). O servidor guarda `null` se a força não vier.
- O servidor recusa com 400 e a mensagem "O dado X não tem a face Y." uma face fora de `regras.valoresValidos`. Também recusa com 400 o que o esquema rejeita: de 1 a 10 dados, `playerId` UUID minúsculo, `kind` conhecido ou `custom:<id>`.
- Um `total` enviado pelo cliente é descartado: o servidor calcula total e presságio com `regras`.
- O histórico de um jogador sai do mais novo para o mais antigo, paginado por `_id` (`limit` de 1 a 100, padrão 20; `next` é o `before` da próxima página).
- O módulo é dono da coleção `rolls`, com o índice `player_history { playerId: 1, _id: -1 }` e um validador `$jsonSchema`, atualizado com `collMod` na subida. Se o `collMod` falhar, só avisa no log (`console.warn`).
- Onde fica cada coisa:
  - `routes.ts` só valida (esquema), chama o `service.ts` e o `repository.ts` e traduz o `{ error }` em 400; nenhuma regra fica nele;
  - `service.ts` calcula o que se grava (`score`, `record`) com `regras`;
  - `repository.ts` é o único que fala com a coleção `rolls` e o único arquivo de produção do módulo que importa `mongodb`. A conexão (`MongoClient`) fica em `server/src/shared/db.ts`, usada pela casca;
  - no cliente, `api.ts` é o único arquivo que importa do servidor, só com `import type` do `contracts.ts` (ADR 0004). O corpo do POST é tipado como `RollIn`.

## Expõe
- Servidor, `index.ts`:
  - `historicoRoutes(app, { rolls })`: plugin Fastify com `POST /rolls` e `GET /rolls`. `rolls` é a coleção que `prepararColecao` devolve;
  - `prepararColecao(db) → Collection`: cria a coleção, o validador e o índice, e faz o `collMod`.
- Servidor, `contracts.ts`: os tipos `RollIn`, `DieIn`, `Roll`, `RollPage`, `RollQuery` e os esquemas JSON das rotas (`ROLL_IN_SCHEMA`, `ROLL_QUERY_SCHEMA`, com o padrão `CUSTOM`). Sem `fastify` nem `mongodb`: o cliente importa os tipos com `import type` (ADR 0004).
- Cliente, `index.ts`: `registrarArremesso({ dice: DieIn[], force }, api?)` e o tipo `DieIn`. Até a fase 6, a casca (`src/App.tsx`) assina o store e monta cada `DieIn` com `corpoDosDados` (`src/app/historico.ts`), que lê `base` e `omens` do registro legado de importados.
- Eventos publicados: nenhum.

## Consome
- Servidor: `regras`, só pelo `index.ts` dele (ADR 0002): `valoresValidos`, `total`, `tipoParaPresagio`, `omenOf`, `omenKind`, `isCustom`, `KINDS`, `CUSTOM_BASES`, `FREE_VALUES`, `MAX_DICE`.
- Cliente: os tipos `RollIn` e `DieIn` do `contracts.ts` do servidor (`import type`). Depois da fase 6, `iniciarHistorico()` no lugar de `registrarArremesso`: assina `arremesso.resultadoPublicado` e monta cada `DieIn` com `dados.tipo(kind)`, que fornece `base` e `omens` do importado.

## Fora do escopo
- Decidir o resultado ou o presságio que o jogador vê: `arremesso` e `pressagios`.
- `GET /health`, o CORS e o `buildApp` ficam na casca do servidor (`server/src/app.ts`).
- Tela de histórico: não existe. Quando existir, um ADR decide se entra neste módulo.
