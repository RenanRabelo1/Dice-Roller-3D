# API do histórico de jogadas

Este é o backend que guarda cada arremesso do DiceRoller no MongoDB Atlas. Ele usa Node com TypeScript nativo, sem etapa de build, mais Fastify e o driver oficial `mongodb`.

## O que você precisa

| Ferramenta | Para quê | Obrigatório? |
| --- | --- | --- |
| Node 22.18 ou mais novo (o projeto usa o 25) | rodar a API; o Node executa `.ts` direto | sim |
| Conta no [MongoDB Atlas](https://cloud.mongodb.com) com um cluster (o M0 gratuito serve) | o banco na nuvem | sim |
| Driver `mongodb` (npm) | é o "conector"; o `npm install` já instala | sim |
| [MongoDB Compass](https://www.mongodb.com/products/tools/compass) | ver e editar os dados numa interface gráfica | não |
| `mongosh` ou a extensão MongoDB for VS Code | consultas pelo terminal ou pelo editor | não |

Não é preciso baixar nenhum conector separado: o driver vem pelo npm. Os testes sobem um MongoDB real em memória (`mongodb-memory-server`, que baixa o binário uma vez), sem tocar no Atlas.

## Primeira vez

1. No Atlas, em **Database Access**, crie um usuário só para este app, com o papel `readWrite` no banco `diceroller`. Não use o usuário administrador.
2. Em **Network Access**, libere o IP de onde a API vai rodar. Se o servidor de hospedagem usar IP variável, libere `0.0.0.0/0`; nesse caso, a senha forte é a única proteção.
3. Em **Connect → Drivers → Node.js**, copie a string de conexão.
4. Configure e rode:

```bash
cd server
cp .env.example .env    # cole a string em MONGODB_URI (o .env não vai para o git)
npm install
npm run dev             # http://127.0.0.1:3001/health → { ok: true, db: "up" }
```

5. No front, crie um `.env.local` na raiz com `VITE_API_URL=http://127.0.0.1:3001` e rode `npm run dev`. A partir daí, cada arremesso é salvo. Sem essa variável, o app continua funcionando sem backend.

## Modelagem

Há uma coleção, `rolls`, com um documento por arremesso:

```js
{
  _id: ObjectId,          // cresce com o tempo: também é o cursor da paginação
  playerId: "uuid",       // jogador anônimo (o navegador guarda um id); vira referência a players quando houver login
  createdAt: Date,
  dice: [{ kind: "d20", value: 20 }, { kind: "coin", value: 1 }],  // na ordem do arremesso (1 a 10)
  total: 20,              // soma dos dados; moedas não somam (1 = cara, 2 = coroa)
  omen: "crit",           // "crit" | "fumble" | "duality" | null
  force: 0.73             // força do arremesso (0 a 1), ou null
}
```

- Dados importados levam `base` (o sólido) e `omens`. Os de forma livre têm `base: 'livre'`, valores de −99 a 999 (o servidor só confere a faixa) e nunca dão presságio. Por isso o `total` pode ser negativo.

Escolhas de modelagem:

- **Os dados ficam embutidos no arremesso.** São no máximo 10 e sempre são lidos junto com ele. Uma coleção separada de dados só custaria joins.
- **`total` e `omen` são calculados pelo servidor** com as mesmas regras do front (`src/dice/kinds.ts` e `src/dice/omen.ts`). O cliente não consegue inventar um crítico.
- **Há um índice, `player_history` = `{ playerId: 1, _id: -1 }`.** Ele atende a única consulta, que traz o histórico de um jogador do mais novo para o mais antigo, sem ordenar em memória.
- **A coleção tem validador (`$jsonSchema`).** Documentos malformados são recusados até se alguém escrever direto no banco.

Próximos passos previstos:

- Coleção `players` (`_id`, `name`, `createdAt`), quando houver login. O `playerId` anônimo pode ser migrado para a conta.
- Estatísticas com aggregation: média por tipo de dado e contagem de críticos.

## Atualizando de uma versão antiga

O validador da coleção `rolls` é atualizado sozinho (`collMod`) quando a API sobe. Se o usuário do app for só `readWrite`, o `collMod` falha e aparece um aviso no log; jogadas com dado de forma livre são recusadas até atualizar. Nesse caso, rode a API uma vez com a string de um usuário com `dbAdmin` no `MONGODB_URI` e depois volte para a do app.

## Endpoints

| Método | Rota | Corpo ou query | Resposta |
| --- | --- | --- | --- |
| GET | `/health` | | `{ ok, db }` (503 se o banco cair) |
| POST | `/rolls` | `{ playerId, dice: [{ kind, value }], force? }` | 201 com o arremesso salvo; 400 se a face não existir no dado |
| GET | `/rolls` | `?playerId=&limit=20&before=<id>` | `{ rolls: [...], next }`; `next` é o `before` da próxima página |

## Scripts

`npm run dev` (recarrega ao salvar), `npm start`, `npm test` e `npm run typecheck`.
