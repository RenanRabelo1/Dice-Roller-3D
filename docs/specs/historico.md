# Spec: `historico`

Pastas: `server/src/modules/historico/` (backend) e `src/modules/historico/` (frontend). Extração nº 2.

## CLAUDE.md (formato final)

### Responsabilidade
Guarda cada arremesso publicado num histórico no MongoDB, ligado a um jogador anônimo. No servidor recalcula com as regras do jogo o que grava (total, presságio, faces válidas) e não aceita o que o cliente afirma. No cliente envia cada arremesso sem esperar resposta. Sem `VITE_API_URL`, não envia nada.

### Regras de negócio
- O jogador anônimo é um UUID guardado em `localStorage['diceroller.player']`. Sem armazenamento disponível, vale um UUID por visita.
- Cada resultado publicado gera um POST, no instante da publicação. Isso vale com movimento reduzido e com presságio forçado em teste (o comportamento atual, preservado).
- Um importado vai com `base` e `omens`. O servidor guarda `omens` como `base === 'd20' && omens`.
- A força enviada fica entre 0 e 1. O servidor guarda `null` se a força não vier.
- O servidor recusa com 400 e a mensagem "O dado X não tem a face Y." uma face fora de `regras.valoresValidos`. Também recusa com 400 o que o esquema rejeita: de 1 a 10 dados, `playerId` UUID minúsculo, `kind` conhecido ou `custom:<id>`.
- Um `total` enviado pelo cliente é descartado: o servidor calcula total e presságio com `regras`.
- O histórico de um jogador sai do mais novo para o mais antigo, paginado por `_id` (`limit` de 1 a 100, padrão 20; `next` é o `before` da próxima página).
- A coleção tem um validador `$jsonSchema`, atualizado com `collMod` na subida. Se o `collMod` falhar, só avisa no log.
- Falha de rede ou resposta de erro nunca atrapalha o jogo (o erro é engolido).

### Expõe
- Backend (`index.ts`):
  - `historicoRoutes(app, { rolls })`: plugin Fastify com `POST /rolls` e `GET /rolls`;
  - `prepararColecao(db) → Collection`: cria a coleção, o validador e o índice, e faz o `collMod`.
- Backend (`contracts.ts`): os tipos `RollIn`, `DieIn`, `Roll`, `RollPage`, `RollQuery` e os esquemas JSON das rotas.
- Frontend (`index.ts`):
  - `registrarArremesso({ dice: DieIn[], force })` enquanto o `arremesso` não existir como módulo;
  - depois da fase 6, `iniciarHistorico()`, que assina `arremesso.resultadoPublicado` e monta `DieIn` com `dados.tipo(kind)`.
- Eventos publicados: nenhum.

### Consome
- Backend: `regras` (`valoresValidos`, `total`, `tipoParaPresagio`, `omenOf`, `omenKind`, `KINDS`, `CUSTOM_BASES`, `FREE_VALUES`, `MAX_DICE`); `server/src/shared/` (logger).
- Frontend:
  - os tipos do `contracts.ts` do backend (`import type`, ADR 0004);
  - depois da fase 6, `arremesso.resultadoPublicado` e `dados` (base e `omens` do importado).

### Fora do escopo
- Decidir o resultado ou o presságio que o jogador vê: `arremesso` e `pressagios`.
- `GET /health` e o CORS ficam na casca do servidor (`server/src/app.ts`).
- Tela de histórico: não existe. Quando existir, um ADR decide se entra neste módulo.

## Dados de que é dono
- `localStorage['diceroller.player']`.
- Coleção `rolls` (índice `player_history { playerId: 1, _id: -1 }`, validador `$jsonSchema`).

## Origem do código

| De | Para |
|---|---|
| `server/src/app.ts:18-56` (as duas rotas + esquemas) | `routes.ts` + `contracts.ts` (esquemas). `/health`, CORS e `buildApp` ficam em `app.ts` (casca) |
| `server/src/rules.ts` (`score`, `clean`, `CUSTOM`) | `service.ts`, usando `regras` |
| `server/src/rolls.ts` | `repository.ts` (tipos de documento) + `contracts.ts` (`Roll`) |
| `server/src/main.ts` | continua como casca; a conexão Mongo vai para `server/src/shared/db.ts` |
| `server/test/api.test.ts` | `server/src/modules/historico/tests/api.test.ts` (o `include` do `server/vitest.config.ts` muda) |
| `src/api/history.ts` | `src/modules/historico/api.ts` (`fetch`) + `repository.ts` (`playerId`) + `index.ts` |
| `tests/history.test.ts` | `src/modules/historico/tests/` |
| `src/App.tsx:26-28` | passa a chamar `historico.registrarArremesso(...)`. O corpo de cada dado (`base`/`omens`) é montado na casca com o registro legado até a fase 6 |

## Critérios de aceite da extração
- Os 23 testes da API passam no novo lugar, sem mudar asserções. `npm run typecheck` do servidor passa.
- O corpo enviado pelo cliente é tipado com `RollIn` do `contracts.ts` do backend. Quebrar o tipo de um lado quebra o `tsc -b` da raiz.
- Rotas sem regra: `routes.ts` só valida (esquema), chama o `service.ts` e traduz o erro em 400.
- `mongodb` só é importado por `repository.ts` e `server/src/shared/db.ts`.
- Os testes de `tests/history.test.ts` passam no novo lugar.
- O E2E do histórico (rede de segurança, fase 3) passa sem alteração.
- O gate completo passa, mais a suíte do servidor.
