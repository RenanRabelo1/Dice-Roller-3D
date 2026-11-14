# Ordem de serviço: `selecao`, pontos de chamada

Ordem: OS-0025 (extração nº 4, `selecao`, parte 2 de 3)
Módulo: `selecao` (consumido)
Escopo de escrita:
- **Quem escreve a mão:**
  - `src/ui/Chat.tsx:37`;
  - `src/ui/Controls.tsx:64,66`;
  - `src/ui/ImportDie.tsx:279`;
  - `src/app/Cena.tsx:46` e `:209`.
- **Quem lê só a mão:** `src/ui/Controls.tsx:56` e `src/ui/ImportDie.tsx:105`.
- **Quem chama a notação pela ponte:** `Chat.tsx`, `Controls.tsx`, `ImportDie.tsx` e `tests/custom.test.ts`.
- **Pontes:**
  - `src/dice/notation.ts`: saem os reexports, fica só o `resultText`;
  - `src/store.ts`: saem `addDie`/`removeDie`/`setDice`, a cópia `dice` muda de papel (decisão 2) e entra `reiniciar` (decisão 3).
- **Testes:** `tests/store.test.ts` e qualquer teste de `tests/` que chame `addDie`, `removeDie` ou `setDice`.
- **Docs:** `docs/specs/arremesso.md`, uma linha (decisão 2), e `docs/contexto/*.md`, onde citarem `addDie`/`setDice`/`notation.ts` para a notação.

Objetivo: ninguém fora do `selecao` escreve a mão, e quem só precisa da mão a lê do módulo. As pontes da OS-0024 deixam de existir. O comportamento não muda.

Leia antes de começar:
- `src/modules/selecao/index.ts`, `cena.ts` e `contracts.ts`
- `docs/ordens/0024-selecao-mao-e-notacao.md`, só as decisões
- `src/store.ts`, as linhas marcadas `ponte até a OS-0025` e o assinante de `selecaoAlterada`
- as linhas de import e as linhas citadas de cada arquivo do escopo

Decisões do orquestrador:
1. **Quem escreve.** Os escritores passam a chamar o módulo:
   - `Chat.tsx:37`: `definir(r.dice)`;
   - `Controls.tsx`: `adicionar(type)` e `remover(type)`;
   - `ImportDie.tsx:279`: `adicionar(...)`;
   - `Cena.tsx:209` (`select` do test hook): `definir(next)`.

   Quem só lê a mão, em `Controls.tsx:56` e `ImportDie.tsx:105`, passa a usar `useSelecao()` de `selecao/cena`.
2. **A cópia `dice` no `useDice` deixa de ser ponte.**
   - Ela é dado do arremesso: **os dados do arremesso corrente**, alinhados com `results`/`raw`.
   - Quem lê `dice` junto com o estado do lançamento continua lendo do `useDice`: `App.tsx`, `Omens.tsx`, `Tray.tsx`, `krakenMotion.ts`, `OmenOverlay.tsx`, `Hand.tsx`, `omenTest.ts` e o `state()` do test hook. Esses arquivos **não mudam**.
   - No `store.ts`, o comentário de `dice` e o do assinante passam a dizer isso: "os dados do arremesso: cópia da mão, recebida por `selecaoAlterada`; vai com o `arremesso`". Tire a marca de ponte.
   - Na spec do `arremesso`, em "Dados de que é dono", acrescente: "`dice`, os dados do arremesso corrente (cópia da mão recebida por `selecaoAlterada`)".
3. **`Cena.tsx:46`.** O `state.setDice(state.dice)` só existe para devolver os dados à mão quando a física falha.
   - Ele passa a chamar uma ação nova do store legado, `reiniciar: () => set((s) => selection(s))`.
   - O efeito é o mesmo de hoje: com a mesma mão, o `setDice` só reiniciava o arremesso.
   - O nome é em português porque a função é nova.
   - Não use `definir(selecao())`: a mão não mudou, então não há o que publicar.
4. **Notação.** Quem usa `parseDice`, `formatDice`, `slugProblem` e `slugOf` importa de `selecao/index`, no estilo de import do próprio arquivo. O `notation.ts` fica só com o `resultText`.
5. **Testes.** Em `tests/store.test.ts` e nos outros, `s().setDice`/`addDie`/`removeDie` viram `definir`/`adicionar`/`remover` do módulo. As asserções sobre o `useDice` continuam as mesmas.

Entregáveis:
1. Os pontos de chamada das decisões 1, 3 e 4.
2. O `store.ts` sem `addDie`/`removeDie`/`setDice`, com `reiniciar` e com a cópia `dice` comentada como dado do arremesso.
3. O `notation.ts` só com o `resultText`.
4. Os testes ajustados, com um teste de `reiniciar` em `tests/store.test.ts`: muda a fase, o `throwId`, o `launch`, o `results` e a `force`, e não muda `dice`.
5. A linha na spec do `arremesso`.

Critérios de aceite:
- `grep -rn "ponte até a OS-0025" src` volta vazio.
- `grep -rnE "\b(addDie|removeDie|setDice)\b" src tests` volta vazio.
- `grep -rnE "(parseDice|formatDice|slugProblem|slugOf)" src tests --include=*.ts --include=*.tsx | grep -v src/modules/selecao` só mostra imports de `selecao/index` e os usos.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O worker não cresce além de 2379,76 kB. A arquitetura passa, sem ciclo novo.
- **Sem E2E** (regra de gate).

Fora do escopo:
- Mover `Chat.tsx` e os botões/`.pool` de `Controls.tsx` para o módulo, e o `CLAUDE.md`. Isso é a OS-0026.
- Mudar os leitores da decisão 2.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Escritores: `Chat.tsx` → `definir(r.dice)`; `Controls.tsx` → `adicionar`/`remover`; `ImportDie.tsx` → `adicionar(...)`; `Cena.tsx` → `state.reiniciar()` (falha da física) e `select: definir(next)`. Leitores só da mão (`Controls.tsx:58`, `ImportDie.tsx:106`) → `useSelecao()` de `selecao/cena`. `Chat.tsx` deixou de importar o `useDice`.
- Notação: `Chat`, `Controls`, `ImportDie` e `tests/custom.test.ts` importam de `selecao/index`; `notation.ts` ficou só com o `resultText`.
- `store.ts`: saíram `addDie`/`removeDie`/`setDice` (e os imports `adicionar`/`remover`); entrou `reiniciar: () => set((s) => selection(s))`; comentários de `dice` e do assinante dizem "dados do arremesso"; tirei a marca de ponte também do comentário do `setOmenTest` (o grep de aceite pegava).
- Testes: `tests/store.test.ts` usa `definir`/`adicionar`; teste novo de `reiniciar` (fase, `throwId`, `launch`, `results`, `force` mudam; `dice` é a mesma referência; `selecao()` intacta).
- Docs: linha na spec do `arremesso`; `contexto/arremesso.md`, `dados.md` (título, Chat, receita passo 3) e `visao-geral.md` (`notation.ts`).
- Gate: `npm test` 46 arquivos/457 testes ok (arquitetura inclusa); `test:server` 23 ok; build ok, worker 2379,76 kB (igual ao teto); lint ok. Greps 1 e 3 ok.
- Pendência: o grep 2 ainda acha `src/modules/selecao/tests/mao.test.ts:8`, um comentário (`addDie/removeDie are now adicionar/remover`). O arquivo está fora do escopo e não mexi.
- Nota: em `Controls.tsx`, o `dice` de `useSelecao()` também alimenta o `resultText(dice, results)` (linha 78) e o `.pool`. Segui a decisão 1 ao pé da letra. O comportamento é o mesmo, porque toda mudança da mão zera `results` no mesmo tique. Se o revisor preferir a decisão 2 para o `resultText`, é uma linha.

**Ajustes do orquestrador depois do dev:**
- `Controls.tsx`: o `resultText` passou a usar `thrown`, a cópia `dice` do `useDice`, que são os dados do arremesso, e não a mão (decisão 2).
- Reescrito o comentário de `selecao/tests/mao.test.ts:8`, que citava `addDie`/`removeDie` e fazia o grep 2 achar ocorrência.

## Parecer do revisor

**APROVADO COM RESSALVAS.** O checklist §7 passou, e as decisões 1 a 5 estão cumpridas.
- Os leitores da decisão 2 têm diff vazio.
- `reiniciar` é equivalente ao `setDice(state.dice)` do HEAD. A única diferença é que o HEAD trocava a referência do array e emitia o sinal. Isso reinstalava o test hook de forma idempotente, sem efeito visível. Os casos em que o HEAD daria outro resultado (cópia vazia, fora do catálogo ou fora de ordem) não acontecem.
- Em `Controls.tsx`, textos, `aria-label`, `aria-pressed` e `disabled` estão idênticos.
- Nenhuma asserção antiga mudou.

**Ressalvas**, corrigidas pelo orquestrador:
- `docs/contexto/arremesso.md:24` ainda descrevia `dice` como "seleção". Agora diz "os dados do arremesso corrente".
- A linha `dice` de `docs/mapa-modulos.md:61` citava `addDie`/`setDice`. Foi atualizada.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 46 arquivos, 457 testes |
| `npm run test:server` | ✅ 23 testes |
