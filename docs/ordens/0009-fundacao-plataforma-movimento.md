# Ordem de serviço: `shared/plataforma` — movimento reduzido com evento

Ordem: OS-0009 (F-5, parte 2 de 2, fundação, dev de shared)
Escopo de escrita:
- **novos:** `src/shared/plataforma/movimento.ts` e `src/shared/plataforma/tests/movimento.test.ts`
- **alterados em `shared/`:** `src/shared/plataforma/index.ts` (reexportar o novo)
- **alterados no legado:**
  - `src/store.ts`: só `reducedMotion`, `setReducedMotion` e a leitura em `publish`
  - `src/App.tsx`, `src/scene/Hand.tsx`, `src/scene/Tray.tsx`, `src/scene/Stage.tsx` (campo do `window.__dice`)
- **alterados em testes:** `tests/omen.test.ts`
- **alterados em docs:** as docs de `docs/contexto/` que citam `setReducedMotion` ou `store.reducedMotion`

Objetivo: o movimento reduzido deixa de ser campo do `useDice` e passa a ser valor de `src/shared/plataforma`, com um evento de mudança (ADR 0005, ADR 0008). O store do legado reage ao evento para descartar o presságio, como faz hoje. O comportamento não muda.

Pré-requisito: a OS-0008 aceita, com `src/shared/plataforma/index.ts` existente.

Leia antes de começar:
- `docs/adr/0005-barramento-de-eventos.md`, a seção Consequências
- `docs/adr/0008-casca-e-shared-do-cliente.md`, o item `plataforma/`
- `src/shared/events.ts` e `src/shared/plataforma/index.ts`
- `src/App.tsx:20-25`, que tem o listener de `matchMedia`
- `src/store.ts`, as linhas de `reducedMotion` (`grep -n`)
- os leitores, que você acha com `grep -n "reducedMotion" src/scene/Hand.tsx src/scene/Tray.tsx src/scene/Stage.tsx`
- `tests/omen.test.ts`, o `beforeEach` e as linhas 65-80

Desenho (decidido pelo orquestrador). Em `movimento.ts`:
- **Estado:** um valor privado, que começa em `false`, e um `Signal<boolean>` de `../events.ts`.
- **API:**
  - `movimentoReduzido(): boolean`
  - `useMovimentoReduzido(): boolean`, com `useSyncExternalStore` sobre o sinal, para componentes que precisem reagir
  - `aoMudarMovimentoReduzido(ouvinte): () => void`
  - `definirMovimentoReduzido(v: boolean)`
  - `observarPreferenciaDoSistema(): () => void`
- **`definirMovimentoReduzido`** grava o valor e **emite em toda chamada**, mesmo quando o valor não mudou. É o equivalente do `setReducedMotion` de hoje, que descarta o presságio sempre que é chamado com `true`.
- **`observarPreferenciaDoSistema`** é o listener de `matchMedia('(prefers-reduced-motion: reduce)')` que hoje está no `App.tsx`. Faz a chamada inicial, assina o `change` e devolve a função que cancela. O `App.tsx` passa a chamá-lo no mesmo `useEffect`.
- **`store.ts`, legado:**
  - perde `reducedMotion` e `setReducedMotion`;
  - no topo do módulo, assina `aoMudarMovimentoReduzido((v) => { if (v) useDice.setState({ omen: null }) })`;
  - no `publish`, troca `s.reducedMotion` por `movimentoReduzido()`.

  A assinatura acontece no carregamento do módulo e nunca é cancelada: o store vive o app inteiro. Comente isso no código.
- **Leitores:**
  - `Hand.tsx` lê `movimentoReduzido()` onde hoje lê `state.reducedMotion`, dentro de `useFrame` e de handlers;
  - `Tray.tsx` passa `reducedMotion: movimentoReduzido()` ao `trayBrokenAt`;
  - `Stage.tsx` expõe `reducedMotion: movimentoReduzido()` no `window.__dice.state()`, com o mesmo nome;
  - `trayBrokenAt` (`krakenMotion.ts`) não muda e continua recebendo o valor por parâmetro.
- **Ordem dos efeitos:** hoje o valor e o descarte do presságio saem num único `set`. Agora o valor muda e, no mesmo tique síncrono, o store descarta o presságio. Como os leitores só leem depois que a tarefa termina, nenhum quadro vê um sem o outro. Esse é o argumento do ADR 0005, e você não precisa provar mais nada além dos testes abaixo.

Entregáveis:
1. `movimento.ts` conforme o desenho, reexportado pelo `index.ts` da plataforma.
2. Os pontos de uso trocados, e `reducedMotion`/`setReducedMotion` removidos do `useDice`.
3. `tests/omen.test.ts`: troque `s().setReducedMotion(true)` por `definirMovimentoReduzido(true)`, importado de `src/shared/plataforma`. Volte o valor para `false` no `beforeEach`, porque agora ele vive fora do store e passaria de um teste para o outro. As asserções não mudam.
4. `src/shared/plataforma/tests/movimento.test.ts`, em Node:
   - `definirMovimentoReduzido` muda o valor e emite;
   - emite também quando o valor se repete;
   - `observarPreferenciaDoSistema`, com um `matchMedia` falso, lê o valor inicial, segue o `change` e para de seguir depois do cancelamento.
5. Docs de contexto atualizadas onde citarem o campo antigo.

Critérios de aceite:
- `grep -rn "setReducedMotion\|s\.reducedMotion\|state\.reducedMotion" src tests` volta vazio. O parâmetro `reducedMotion` de `trayBrokenAt` e o campo do `window.__dice` continuam.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passando. As asserções de `tests/omen.test.ts` e `tests/kraken.test.ts` ficam intactas.
- `npm run e2e` completo, que o orquestrador roda. Precisam passar em especial os casos de reduced motion em `roll.spec.ts`, `omen.spec.ts` e `kraken.spec.ts`, que usam `emulateMedia` e mudam a preferência no meio do teste.

Fora do escopo:
- Qualquer arquivo fora do escopo de escrita, inclusive `src/scene/krakenMotion.ts`.
- Mudar quando o presságio é descartado, a duração das animações com reduced motion ou qualquer outro valor.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Arquivos:
- **novos:** `src/shared/plataforma/movimento.ts` e `tests/movimento.test.ts` (TDD, 5 casos);
- **alterados:** `plataforma/index.ts`, `store.ts`, `App.tsx`, `Hand.tsx`, `Tray.tsx`, `Stage.tsx`, `tests/omen.test.ts`, `arremesso.md` e `apresentacao.md`.

O comportamento não muda:
- `definirMovimentoReduzido` emite em toda chamada;
- o store assina o evento no carregamento do módulo e grava `omen: null` em cada `true`;
- o `publish` lê `movimentoReduzido()`;
- o `window.__dice.state().reducedMotion` mantém o nome;
- `krakenMotion.ts` não foi tocado;
- no `omen.test.ts`, só o `beforeEach` volta o valor para `false`, e as asserções ficaram intactas.

Divergências:
- O grep de aceite sobra com `krakenMotion.ts:25`, que é o parâmetro de `trayBrokenAt` que a ordem mandou preservar. O critério do orquestrador estava frouxo.
- Antes, `setReducedMotion(false)` fazia um `set` no store. Agora `false` não toca o store. O revisor provou que isso é inofensivo (abaixo).

Verificação do dev: `npm test` 359, build e lint ok, `test:server` 23, e os E2E `roll` + `omen` + `kraken` com 36/36.

## Parecer do revisor

**APROVADO.**
- ✅ (a) Escopo respeitado. A linha de `visao-geral.md` foi acrescentada pelo orquestrador, que é dono de `docs/`.
- ✅ (b) `movimento.ts` só importa `react` e `../events.ts`. O descarte do presságio fica no legado.
- ✅ (c) 5 casos, inclusive a emissão repetida e o cancelamento do `matchMedia`.
- ✅ (d) Comportamento igual:
  - o valor é gravado antes do `emit`;
  - as 9 leituras do `Hand` ficam nos mesmos pontos (antes, um retrato no início do quadro; agora, leitura ao vivo, equivalente porque o `change` chega numa tarefa separada);
  - o `Tray` já lia com `getState()` e não era reativo.
- ✅ (e) As docs que citavam o campo antigo foram atualizadas.
- ✅ (f) O grep só sobra com o parâmetro preservado.

**O `false` é inofensivo.** Nenhum seletor nem assinante lia `reducedMotion`. O `set` antigo com `false` mantinha `omen` com a mesma referência, e o único `useDice.subscribe` reage só a `results`.

Observações sem bloqueio:
1. `useMovimentoReduzido` não tem consumidor nem teste por enquanto.
2. O `events.ts` isola a exceção do ouvinte, e antes o descarte estava no mesmo `set`. Na prática não muda nada, porque `setState` não lança.

## Gate

2026-11-13, pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ (worker de física com o mesmo hash) |
| `npm run lint` | ✅ |
| `npm test` | ✅ 27 arquivos, 359 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 passaram (18,3 min) |
