# Ordem de serviço: `selecao`, a mão e a notação

Ordem: OS-0024 (extração nº 4, `selecao`, parte 1 de 3)
Módulo: `selecao`
Escopo de escrita:
- **Módulo novo** `src/modules/selecao/`: `contracts.ts`, `index.ts`, `store.ts`, `domain/*.ts` e `tests/`. O `CLAUDE.md` fica para a parte 3.
- **Legado, como ponte:**
  - `src/dice/notation.ts`: `parseDice`, `formatDice`, `slugProblem` e `slugOf` passam a ser reexports. O `resultText` fica, porque é de `vitrine`/`regras`.
  - `src/store.ts`: só `dice`, `addDie`, `removeDie`, `setDice` e o trecho "tira da mão" do `removeCustom`.
  - **Ampliado pelo orquestrador (2026-11-14):** também o `setOmenTest` (`store.ts:131-134`), que hoje escreve `dice` direto. Veja a decisão 7.
- **Testes que mudam de lugar** (`git mv`): `tests/notation.test.ts`, menos o que testa `resultText`, e a parte de seleção de `tests/store.test.ts`.
- **Docs:** o bloco `donos-dos-dados` de `docs/mapa-modulos.md`, se o teste de dono exigir registrar a store.

Objetivo: a mão do jogador e a notação passam a viver em `src/modules/selecao/`.
- Quem muda a mão é o módulo, e cada mudança publica `selecaoAlterada`.
- O arremesso legado se reinicia ao ouvir esse evento, no mesmo tique, como hoje.
- Quando um tipo sai do catálogo, a mão reage a `catalogoAlterado`.
- O legado continua funcionando por pontes. O comportamento não muda.

Leia antes de começar:
- `docs/specs/selecao.md`, inteiro
- `src/modules/dados/CLAUDE.md` e `src/modules/regras/CLAUDE.md`
- `src/shared/events.ts` (ADR 0005)
- `src/store.ts:1-125`
- `src/dice/notation.ts`, inteiro (91 linhas)
- os imports de `tests/notation.test.ts` e `tests/store.test.ts`
- `tests/arquitetura/config.ts:35-75` (exceções de dados: o `create` do zustand só pode estar em `src/modules/<m>/store.ts`)

Decisões do orquestrador:
1. **Nomes.**
   - Os da notação ficam: `parseDice`, `formatDice`, `slugProblem` e `slugOf`, como na decisão 1 da OS-0020.
   - A mão usa os nomes da spec, porque são funções novas: `selecao()` (lê a mão), `adicionar(kind)`, `remover(kind)`, `definir(dice)` e o evento `selecaoAlterada` (`{ dice }`).
   - `useSelecao()` é hook. Fica em `cena.ts` (ADR 0010) e lê o store do módulo com o `useStore` do zustand.
2. **Store.**
   - `src/modules/selecao/store.ts` cria um store **vanilla** (`createStore` de `zustand/vanilla`) com `dice: ['d20']`. O `index.ts` não importa React.
   - Ninguém fora do módulo lê esse store. Só o módulo o escreve.
   - Se o teste de dono exigir, registre o dado no bloco `donos-dos-dados`. Se o formato do bloco não comportar store zustand, pare e reporte.
3. **Regras da mão**, as mesmas de `store.ts:65-76`:
   - adicionar no máximo não faz nada;
   - remover tira a última ocorrência e nunca o último dado;
   - `definir` descarta importados fora do catálogo, corta em `MAX_DICE` e ignora lista vazia;
   - a mão fica sempre ordenada por `sortDice`.

   **Toda chamada aceita emite `selecaoAlterada`, mesmo quando a mão não mudou.** Hoje, por exemplo, `setDice` com a mesma mão reinicia o arremesso, e isso continua. Uma chamada recusada (máximo, último dado, lista vazia) não emite.
4. **Reação ao catálogo.**
   - O módulo assina `catalogoAlterado` de `dados`, no carregamento do `store.ts`.
   - Em `removido`, tira o tipo da mão. Se a mão esvaziar, ela volta a `['d20']`.
   - **Sempre emite `selecaoAlterada`**, mesmo que o tipo não estivesse na mão, porque o `removeCustom` de hoje sempre reinicia o arremesso.
   - Em `registrado`, nada acontece.
5. **Ponte no `store.ts` legado** (`// ponte até a OS-0025`):
   - `dice` continua no `useDice`, como **cópia** atualizada pelo assinante de `selecaoAlterada`. O assinante faz `set((s) => ({ ...selection(s), dice }))` numa única chamada, para a fase, o `throwId`, o lançamento, o resultado e a força mudarem junto com a mão.
   - `addDie`, `removeDie` e `setDice` passam a só chamar `adicionar`, `remover` e `definir`.
   - `removeCustom` deixa de mexer em `dice` e em `selection`, porque a reação ao catálogo cuida disso. Ele continua com `customs: customList()`.
   - Confira a ordem: `unregisterCustom` emite, o `selecao` reage, o legado copia, e só então o `set` de `customs`.
7. **`setOmenTest`** (ampliação). Passa a ser `const dice = omenTest ? withDiceFor(omenTest, selecao()) : selecao(); set({ omenTest }); if (dice !== selecao()) definir(dice);`.
   - São dois `set` no mesmo tique síncrono, em vez de um. Por um instante, um assinante pode ver o `omenTest` novo com a mão antiga. Aceito: o React agrupa os dois, e o lançamento só lê os dois no gesto seguinte.
   - `selecao()` devolve a referência do store, para a comparação `dice !== selecao()` continuar valendo.
   - Escreva o teste em `tests/store.test.ts` olhando a mão do `selecao` (`selecao()`), não só a cópia.
8. **Reset nos testes de `tests/`.** O `beforeEach` de `tests/store.test.ts`, e de quem mais reinicia o `useDice`, chama `definir(['d20'])` **antes** de `useDice.setState(getInitialState(), true)`. Assim a mão do módulo e a cópia começam iguais.
6. **`notation.ts`.** Os quatro nomes viram `export { … } from '../modules/selecao/index'`, com `// ponte até a OS-0025`. O `resultText` fica onde está e importa o que precisar.

Entregáveis:
1. O módulo com `contracts.ts`, `index.ts` (puro), `store.ts`, `domain/notacao.ts` e `domain/mao.ts`, e o `cena.ts` com `useSelecao`. Ele só importa `regras`, `dados`, `src/shared/*` e `zustand`.
2. As pontes em `store.ts` e `notation.ts`.
3. Os testes movidos com `git mv`, ajustando só os imports. Da parte de seleção de `store.test.ts`, o que testa a mão vai para o módulo, sobre `adicionar`/`remover`/`definir`. O que testa o reinício do arremesso fica em `tests/`, porque atravessa módulos.
4. Testes novos no módulo:
   - `selecaoAlterada` emite em toda chamada aceita e não emite numa recusada;
   - a reação a `removido` (tipo na mão, fora da mão e mão esvaziada).
5. Um teste em `tests/` mostrando que, depois de `useDice.getState().setDice([...])`, `dice`, `throwId`, `gesture.phase`, `launch`, `results` e `force` mudaram juntos. Se já existe, aponte qual.

Critérios de aceite:
- `src/modules/selecao/` não importa o legado nem a casca (`moduloSemLegado`), e o `index.ts` não alcança React (`indexSemReact`).
- A arquitetura passa, sem ciclo novo. Atenção: `dados` não pode importar `selecao`.
- Os testes movidos passam sem mudar asserções. Mostre o `git diff -M --stat`.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O worker não cresce além de 2379,76 kB.
- **Sem E2E** (regra de gate). O aceite do `selecao` é a OS-0026.

Fora do escopo:
- Trocar os leitores de `useDice((s) => s.dice)` e os pontos de chamada de `addDie`/`setDice`. Isso é a OS-0025.
- Os componentes (`Chat.tsx`, botões, `.pool`) e o `CLAUDE.md`. Isso é a OS-0026.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**Primeira rodada:** o dev parou porque o `setOmenTest` escrevia `dice` direto no `useDice`, fora do escopo. Com a ponte, a cópia e a mão do módulo divergiriam. O orquestrador ampliou o escopo (decisões 7 e 8).

**Feito:**
- **Módulo `src/modules/selecao/`:**
  - `contracts.ts`;
  - `index.ts`, puro;
  - `store.ts`: store vanilla, `selecaoAlterada` e a assinatura de `catalogoAlterado`;
  - `domain/mao.ts` e `domain/notacao.ts`;
  - `cena.ts`, com `useSelecao`;
  - testes `notacao`, `mao` e `selecaoAlterada`, os novos escritos antes do código (TDD).
- **Pontes (`// ponte até a OS-0025`):**
  - `store.ts`: `addDie`/`removeDie`/`setDice` delegam. O `removeCustom` só atualiza `customs`. O `setOmenTest` segue a decisão 7. Um assinante de `selecaoAlterada` atualiza a cópia e reinicia o arremesso num único `set`.
  - `notation.ts`: os quatro nomes viram reexports. O `resultText` fica.
- **Testes em `tests/`:**
  - `store.test.ts` e `omen.test.ts` chamam `definir(['d20'])` no `beforeEach`.
  - Dois testes novos em `store.test.ts`: a atualização única depois de `setDice`, e o `setOmenTest` olhando `selecao()`.
  - O `git mv` não divide arquivo, então o teste do `resultText` voltou num `tests/notation.test.ts` novo, com a asserção igual.
- **Diff:** `git diff -M --stat` dá 14 arquivos (+394 −152), com `tests/notation.test.ts → src/modules/selecao/tests/notacao.test.ts`.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- As regras da mão são iguais às do HEAD: emite em toda chamada aceita, não emite em recusa, e `removido` sempre emite.
- O assinante legado faz um `set` só.
- Não há caminho de divergência entre a cópia e a mão do módulo.
- `notacao.ts` é cópia fiel, e as asserções não mudaram.
- A arquitetura está limpa, sem ciclo `dados ↔ selecao`.
- A assinatura de `catalogoAlterado` existe antes do primeiro `unregisterCustom` (`main → App → store → selecao`).

**Ressalvas:**
- **R1.** O `removeCustom` notifica duas vezes: a mão e o arremesso primeiro, depois `customs`. **Aceito pelo orquestrador**, como na decisão 7: o React agrupa os dois, e `customs` guarda os próprios objetos.
- **R2.** O teste de dono só reconhece `create` de `'zustand'`. Não vê `createStore` nem `zustand/vanilla`. Hoje não é brecha, porque o único uso está em `src/modules/selecao/store.ts`, o lugar permitido. **Fica para a fase 7**, nas lacunas da heurística de arquitetura.
- **R3.** Este relatório estava vazio e foi preenchido pelo orquestrador.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 46 arquivos, 456 testes |
| `npm run test:server` | ✅ 23 testes |
