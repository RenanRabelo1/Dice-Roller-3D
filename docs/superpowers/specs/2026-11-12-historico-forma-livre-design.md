# Histórico grava jogadas com dado de forma livre

Status: **aprovada para implementar** (2026-11-12, pedido do João).

## 1. Problema

A API de histórico (`server/`, Fastify + MongoDB) recusa qualquer jogada que tenha um dado de forma livre. O cliente (`src/api/history.ts`) manda esse dado como `{ kind: 'custom:<id>', value, base: 'livre', omens }`, e a API barra em três pontos:

| Onde | O que barra |
|---|---|
| `server/src/app.ts`, schema do `POST /rolls` | `base` só aceita `CUSTOM_BASES` (d4–d20); `value` só vai de 1 a 100 |
| `server/src/rules.ts`, `score` | `shapeOf` devolve `undefined` para `livre`, então o dado conta como "não tem a face" e a resposta é 400 |
| `server/src/rolls.ts`, validador da coleção | `base` só d4–d20, `value` de 1 a 100, `total` mínimo 0. Valores de forma livre vão de −99 a 999, então o total pode ser negativo |

Como o envio é "dispara e esquece", a jogada inteira some sem aviso: um arremesso com um d20 e um dado de forma livre não é gravado.

## 2. Comportamento novo

- Uma jogada com dado de forma livre é gravada. O dado fica como `{ kind, value, base: 'livre', omens: false }`.
- `value` de um dado de forma livre: inteiro de **−99 a 999**, a mesma regra da calibração (`checkFreeValue` em `importer.ts`). O servidor não conhece as faces do dado, então só confere a faixa. É o mesmo nível de confiança que já existe para os d4–d20 importados.
- `total` soma os valores como sempre (moeda não soma) e **pode ser negativo**. Com 10 dados, vai de −990 a 9.990.
- `omen`: dado de forma livre nunca dá presságio. `omens` é gravado sempre `false`, mesmo que o cliente mande `true`.
- Nada muda para os outros dados.

## 3. Desenho técnico

### 3.1 Faixa de valores num lugar só (`src/dice/kinds.ts`, `src/dice/importer.ts`)

- `kinds.ts` (sem código 3D, lido também pelo servidor):
  - `export const FREE_VALUES = { min: -99, max: 999 } as const;` com o comentário "values a free-form die can carry (calibration and history API)";
  - `CUSTOM_BASES` passa a ser `['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'livre'] as const` e `CustomBase = (typeof CUSTOM_BASES)[number]`;
  - apague o comentário que diz que a API só aceita d4–d20. `StdBase` (`custom.ts`) continua `Exclude<CustomBase, 'livre'>`.
- `importer.ts`: `checkFreeValue` usa `FREE_VALUES.min`/`FREE_VALUES.max`. A mensagem continua "Use um número inteiro de -99 a 999.".

### 3.2 Regras (`server/src/rules.ts`)

- Troque o teste de faixa por uma função:

```ts
// The values a die can show: its solid's 1..N, or the free-form range (the server does not know a free-form die's faces).
const range = (d: Die): [number, number] | undefined => {
  if (isCustom(d.kind) && d.base === 'livre') return [FREE_VALUES.min, FREE_VALUES.max];
  const shape = shapeOf(d);
  return shape && [1, SIDES[shape]];
};
```

  e em `score`: `const bad = dice.find((d) => { const r = range(d); return !r || !Number.isInteger(d.value) || d.value < r[0] || d.value > r[1]; });`. A mensagem de erro continua a mesma.
- `clean`: grave `omens: base === 'd20' && omens === true`. Hoje é `omens === true`; o efeito só muda para `livre`, porque os outros já só contam como d20 quando a base é `d20`.

### 3.3 Schema da rota (`server/src/app.ts`)

- `value: { type: 'integer', minimum: FREE_VALUES.min, maximum: 999 }`, usando `FREE_VALUES.max`. O limite fino continua em `score`.
- `base: { enum: CUSTOM_BASES }` já passa a aceitar `livre` pela mudança em 3.1.

### 3.4 Validador da coleção (`server/src/rolls.ts`)

- `value: { bsonType: 'int', minimum: FREE_VALUES.min, maximum: FREE_VALUES.max }`.
- `total: { bsonType: 'int' }`, sem `minimum`.
- `base: { enum: [...CUSTOM_BASES] }`: já inclui `livre`.
- **Coleção que já existe** (o Atlas de vocês): hoje o validador só é aplicado quando a coleção é criada. Em `rollsCollection`, quando ela já existe, rode `await db.command({ collMod: 'rolls', validator: VALIDATOR })`.
  - Se falhar (o usuário do app tem só `readWrite`, que não pode fazer `collMod`), **não derrube o servidor**. Faça `console.warn` com: "Não consegui atualizar o validador da coleção rolls (o usuário precisa do papel dbAdmin). Jogadas com dado de forma livre serão recusadas até atualizar: rode a API uma vez com um usuário administrador (ver server/README.md)."
  - Teste: `server/test/api.test.ts` com uma coleção criada com o validador **antigo** (copie o antigo no teste), seguida de `rollsCollection(db)`; depois disso uma jogada de forma livre é aceita.

### 3.5 Cliente

`src/api/history.ts` já manda `base: die.base` e `omens: die.omens`, então nada muda no código. Em `tests/history.test.ts`, um caso novo: um dado de forma livre registrado (`freeDieOf` de `tests/helpers/models.ts`) sai no corpo como `{ kind, value: -5, base: 'livre', omens: false }`.

## 4. Tarefas (guia de implementação)

Worktree a partir da `dev-jg`. Um commit por tarefa, estilo `feat:`/`test:`/`docs:` em inglês.

Gate do front: `npm run build && npm run lint && npm test`.

Gate da API, de dentro de `server/`:
- `npm install`, uma vez: baixa as dependências da API, incluindo o binário do MongoDB do `mongodb-memory-server`;
- `npm run typecheck`;
- `npm test`.

Sem E2E: nada muda na tela.

### Tarefa 1: faixa num lugar só (3.1)

`FREE_VALUES` e `CUSTOM_BASES` com `livre` em `kinds.ts`; `checkFreeValue` usando `FREE_VALUES`. Gate do front. Confira com Grep que `CustomBase`/`CUSTOM_BASES` não quebraram em `src/`, `tests/` e `server/src/`.

### Tarefa 2: API aceita e grava (3.2, 3.3, 3.4)

Em `server/test/api.test.ts`, acrescente:
- Jogada com um d20 (valor 7) e um dado de forma livre (valor −5, `omens: true`): 201, `total: 2`, `omen: null`, e o dado volta como `{ kind, value: -5, base: 'livre', omens: false }`.
- Recusas (400), no mesmo formato da tabela de recusas que já existe:
  - forma livre com valor 1000;
  - forma livre com valor −100;
  - forma livre com valor 2,5.
- Coleção antiga atualizada pelo `collMod` (3.4).
- O teste de validador direto no banco que já existe (linha ~82, `base: 'd7'`) continua recusando.

Gate da API e gate do front.

### Tarefa 3: cliente (3.5)

Teste em `tests/history.test.ts`. Gate do front.

### Tarefa 4: documentação

- `server/README.md`:
  - na seção Modelagem, uma linha sobre os dados de forma livre (`base: 'livre'`, valores de −99 a 999, total pode ser negativo);
  - uma seção curta "Atualizando de uma versão antiga", explicando que o validador é atualizado sozinho ao subir a API. Se o usuário do app for só `readWrite`, aparece um aviso no log; nesse caso, rode a API uma vez com a string de um usuário com `dbAdmin` no `MONGODB_URI` e depois volte para a do app.
- `docs/contexto/dados.md`, na seção Dado de forma livre: uma linha "Histórico: gravado com `base: 'livre'`; o servidor só confere a faixa −99..999".
- `docs/backlog.md`: tire a pendência "API de histórico não grava forma livre" de onde estiver, se estiver.
- Seção 6 desta spec: commits e resultados.

## 5. Fora de escopo

- Conferir no servidor se o valor é mesmo uma face daquele dado (o servidor não guarda os dados importados).
- Tela de histórico no front.

## 6. Implementação

Branch `claude/historico-livre-cbbd39` (a partir da `dev-jg`). Commits, um por tarefa:

1. `feat: one place for the free-form value range and the 'livre' base` (`kinds.ts`, `importer.ts`).
2. `feat: history API records free-form dice (...)` (`rules.ts`, `app.ts`, `rolls.ts`, `api.test.ts`).
3. `test: free-form die is sent to the history API as base livre` (`tests/history.test.ts`).
4. `docs: ...` (README da API, `dados.md`, esta seção).

Resultados: front `build && lint && test` verde (324 testes); API `typecheck` verde e `npm test` verde (23 testes). Sem E2E.

Notas:
- `docs/backlog.md` não tinha a pendência "API de histórico não grava forma livre"; nada a remover.
- O teste da coleção antiga usa um validador antigo reduzido (só `value`, `base` e `total`), suficiente para provar que o `collMod` o troca.
- O aviso do `collMod` falho não tem teste (o MongoDB em memória roda sem autenticação).
- O worktree não tinha `node_modules`; rodei `npm install` na raiz.
