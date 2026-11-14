# Módulo `historico`

Metade do servidor (OS-0018): `server/src/modules/historico/`. A porta é `index.ts`; tipos HTTP e esquemas em `contracts.ts`; `routes.ts` → `service.ts` → `repository.ts`. A metade do cliente (`src/modules/historico/`) entra na OS-0019, com os blocos dela.

## Responsabilidade
Guarda cada arremesso publicado num histórico no MongoDB, ligado a um jogador anônimo. No servidor recalcula com as regras do jogo o que grava (total, presságio, faces válidas) e não aceita o que o cliente afirma.

## Regras de negócio
- Um importado vem com `base` e `omens`. O servidor guarda `omens` como `base === 'd20' && omens`.
- A força enviada fica entre 0 e 1. O servidor guarda `null` se a força não vier.
- O servidor recusa com 400 e a mensagem "O dado X não tem a face Y." uma face fora de `regras.valoresValidos`. Também recusa com 400 o que o esquema rejeita: de 1 a 10 dados, `playerId` UUID minúsculo, `kind` conhecido ou `custom:<id>`.
- Um `total` enviado pelo cliente é descartado: o servidor calcula total e presságio com `regras`.
- O histórico de um jogador sai do mais novo para o mais antigo, paginado por `_id` (`limit` de 1 a 100, padrão 20; `next` é o `before` da próxima página).
- O módulo é dono da coleção `rolls`, com o índice `player_history { playerId: 1, _id: -1 }` e um validador `$jsonSchema`, atualizado com `collMod` na subida. Se o `collMod` falhar, só avisa no log.
- Onde fica cada coisa:
  - `routes.ts` só valida (esquema), chama o `service.ts` e o `repository.ts` e traduz o `{ error }` em 400; nenhuma regra fica nele;
  - `service.ts` calcula o que se grava (`score`, `record`) com `regras`;
  - `repository.ts` é o único que fala com a coleção `rolls` e o único arquivo do módulo que importa `mongodb`. A conexão (`MongoClient`) fica em `server/src/shared/db.ts`.

## Expõe
- `index.ts`:
  - `historicoRoutes(app, { rolls })`: plugin Fastify com `POST /rolls` e `GET /rolls`. `rolls` é a coleção que `prepararColecao` devolve;
  - `prepararColecao(db) → Collection`: cria a coleção, o validador e o índice, e faz o `collMod`.
- `contracts.ts`: os tipos `RollIn`, `DieIn`, `Roll`, `RollPage`, `RollQuery` e os esquemas JSON das rotas (`ROLL_IN_SCHEMA`, `ROLL_QUERY_SCHEMA`, com o padrão `CUSTOM`). Sem `fastify` nem `mongodb`: o cliente importa os tipos com `import type` (ADR 0004).
- Eventos publicados: nenhum.

## Consome
- `regras`, só pelo `index.ts` dele (ADR 0002): `valoresValidos`, `total`, `tipoParaPresagio`, `omenOf`, `omenKind`, `isCustom`, `KINDS`, `CUSTOM_BASES`, `FREE_VALUES`, `MAX_DICE`.
- `server/src/shared/db.ts`: a conexão, usada pela casca (`server/src/main.ts`), que passa o `Db` a `prepararColecao`.

## Fora do escopo
- Decidir o resultado ou o presságio que o jogador vê: `arremesso` e `pressagios`.
- `GET /health`, o CORS e o `buildApp` ficam na casca do servidor (`server/src/app.ts`).
- Tela de histórico: não existe. Quando existir, um ADR decide se entra neste módulo.
