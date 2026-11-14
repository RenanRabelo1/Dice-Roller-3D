# Ordem de serviço: `arremesso`, o estado do arremesso

Ordem: OS-0031 (extração nº 6, `arremesso`, parte 2 de 4)
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/`: `store.ts` (novo), `index.ts`, `cena.ts` (novo), `ui/useArremesso.tsx` (novo), `contracts.ts` (só para acrescentar) e `tests/`.
- **Legado:** `src/store.ts`. Saem os campos e as ações do arremesso, e ficam só os de presságio e vitrine (decisão 3).
- **Leitores e escritores, só as linhas que leem ou escrevem esses campos:**
  - `src/App.tsx`;
  - `src/app/Cena.tsx`;
  - `src/scene/Hand.tsx`, `Omens.tsx` e `Tray.tsx`;
  - `src/ui/Controls.tsx`, `OmenOverlay.tsx` e `OmenTests.tsx`, este último só se precisar.
- **Testes:**
  - `tests/store.test.ts`, que se divide (decisão 6);
  - `tests/omen.test.ts`;
  - `e2e/kraken.spec.ts:24-28` e `e2e/coin-performance.spec.ts:28`, só o acesso ao store.
- **Arquitetura:** `tests/arquitetura/config.ts`, as exceções de `src/store.ts` que deixam de valer (a chave `diceroller.rolagem`, por exemplo).
- **Docs:** `docs/contexto/arremesso.md`, na seção do store.

**Escopo ampliado pelo orquestrador (2026-11-14), depois da primeira rodada:**
- **`src/modules/arremesso/repository.ts` (novo).** O teste de dono só aceita a chave `localStorage` no `repository.ts` do módulo dono, como em `historico` e `meus-dados`. Por isso `savedMode` e a gravação da escolha vão para esse arquivo, e o `store.ts` os importa.
- **Testes de `tests/`.** Podem importar `src/modules/arremesso/store.ts` direto, só para reiniciar o estado entre os testes, como o `kraken.spec.ts`. Registre no relatório.
- **`src/modules/selecao/CLAUDE.md:14`:** a linha que diz que a cópia `dice` vive no `useDice` passa a dizer que vive no store do `arremesso`.

Objetivo: o estado do arremesso passa a viver num store do módulo. São a fase do gesto, `throwId`, mira, força, modo de carga, lançamento, resultado, `raw`, `ready` e os dados do arremesso.
- Quem publica o resultado é o módulo, que emite `resultadoPublicado`.
- O presságio, ainda no legado, reage a esse evento no mesmo tique.
- O `useDice` fica só com o estado de presságio e de vitrine.

O comportamento não muda.

**Tamanho.** São cerca de 16 arquivos, mas em quase todos só muda a forma de ler o estado. Vale a exceção da OS-0016. Se algum arquivo pedir mudança de lógica, pare e reporte.

Leia antes de começar:
- `docs/specs/arremesso.md`, nas seções "Regras de negócio" (fases, publicação), "Expõe" e "Dados de que é dono"
- `src/store.ts`, inteiro
- `src/modules/selecao/store.ts`, `index.ts`, `cena.ts` e `ui/useSelecao.tsx`, como modelo
- as linhas de cada arquivo do escopo que acessam `useDice` (`grep -n "useDice" <arquivo>`)
- `tests/arquitetura/config.ts`, nas exceções de dados

Decisões do orquestrador:
1. **Store do módulo.**
   - `src/modules/arremesso/store.ts` é vanilla. Os campos são `dice`, `gesture`, `throwId`, `aim`, `force`, `chargeMode`, `launch`, `results`, `raw` e `ready`.
   - As ações mantêm os nomes de hoje: `input`, `publish`, `reiniciar`, `setAim`, `setForce`, `setChargeMode` e `setReady`.
   - O `index.ts` exporta `arremesso()` (o estado atual), as ações e `assinarArremesso(listener)`, que é o `subscribe` do store, para quem precisa da transição (`coin-performance`).
   - `useArremesso(selector)` é hook, em `ui/useArremesso.tsx`, reexportado por um `cena.ts` novo.
   - A chave `localStorage['diceroller.rolagem']` e o `savedMode` vêm junto.
   - A reação a `selecaoAlterada` vem junto. Ela faz um único `set` com `selection(s)` e `dice`.
2. **`resultadoPublicado`.**
   - `publish` faz o `set` de `results`, `raw` e da fase, como hoje, e logo depois emite `resultadoPublicado({ throwId, dice, results, raw, force })`, de forma síncrona. O `index.ts` exporta o evento só com `subscribe`.
   - O cálculo do presságio, que hoje está no mesmo `set` (`omenRig ?? omenOf(omenKinds(dice), results)`, que é `null` com movimento reduzido), passa para um assinante desse evento no `store.ts` legado. Esse assinante faz `set({ omen, omenAt })`.
   - São dois `set` no mesmo tique síncrono, em vez de um. Isso foi aceito como nas OS-0024/0025: o React agrupa os dois e o `useFrame` lê no quadro seguinte.
   - Confira que nenhum leitor síncrono vê o resultado sem o presságio. Por exemplo, um `subscribe` que leia `omen` logo depois de `results`. Se algum ler, pare e reporte.
3. **O que fica no `useDice`:** `showcased`, `omen`, `omenDone`, `omenAt`, `omenRig`, `omenTest` e as ações deles. O `setOmenTest` continua igual (decisão 7 da OS-0024).
4. **Seletores que juntam os dois estados.**
   - `omenPlaying` lê `gesture.phase` e `throwId` do arremesso, e `omen` e `omenDone` do `useDice`. Ele passa a ser `omenPlaying()`, que lê os dois `getState`, mais um hook `useOmenPlaying()` em `store.ts`, que assina os dois (`useArremesso` e `useDice`).
   - Quem passa um estado combinado para funções puras (`Tray.tsx` → `trayBrokenAt`, `Omens.tsx`, `krakenMotion`) monta o objeto com `{ ...arremesso(), ...useDice.getState() }` ou com os campos necessários. As funções puras não mudam.
5. **`App.tsx`.** O `useDice.subscribe((s, prev) => …results…)` que chama `registrarArremesso` passa a assinar `resultadoPublicado`, recebendo `dice`, `results` e `force` do evento. O efeito é o mesmo: uma chamada por resultado publicado.
6. **Testes.**
   - Em `tests/store.test.ts`, a parte de gesto, publicação, reinício e reação à mão vai para `src/modules/arremesso/tests/estado.test.ts`. A parte de presságio (`setOmenTest`, `rigOmen`, `omenPlaying`) fica em `tests/`.
   - As asserções não mudam.
   - Um teste novo no módulo: `resultadoPublicado` é emitido uma vez, com os campos certos, e não é emitido quando o `throwId` ou a fase não batem.
   - Um teste em `tests/` mostra que, depois do `publish`, o `omen` do `useDice` foi preenchido no mesmo tique.
7. **E2E.**
   - `kraken.spec.ts` faz `useDice.setState({ launch })` no navegador e passa a usar o store do módulo. Para isso, pode importar `/src/modules/arremesso/store.ts` por URL dentro do `page.evaluate`, porque é teste e não código. Registre no relatório.
   - `coin-performance.spec.ts` passa a usar `assinarArremesso` do `index.ts`.
   - Confira com `npx playwright test --list`.

Entregáveis:
1. O store do módulo, o evento, `useArremesso` e o `cena.ts`.
2. O `store.ts` legado só com presságio e vitrine, o assinante do evento e `omenPlaying`/`useOmenPlaying`.
3. Os leitores e escritores trocados.
4. Os testes da decisão 6 e os E2E ajustados.
5. As exceções de arquitetura atualizadas e a doc.

Critérios de aceite:
- `grep -nE "gesture|throwId|aim|force|chargeMode|launch|results|raw|ready|dice:" src/store.ts` não mostra campo nem ação do arremesso. O que sobrar está em leituras do evento ou de `arremesso()`.
- O teste de dono aceita `diceroller.rolagem` em `src/modules/arremesso/store.ts`, sem exceção.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa: sem ciclo, `index` sem React e módulo sem legado. O worker não cresce.
- **Sem E2E**, só o `--list`.

Fora do escopo:
- Mover a cena (`ThrowLoop` da `Cena.tsx`, `Die.tsx`, `Hand.tsx`, colisores), que é a OS-0032.
- Os componentes (`Force`, `RollMode`, a dica da fase), o `inspecao()` e o `CLAUDE.md`, que são a OS-0033.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- 1ª rodada: o teste de dono (`donos.ts:133`) só aceitava a chave no `repository.ts` do dono, então parei. Na 2ª rodada, com o escopo ampliado (opção a), `savedMode` e `saveMode` foram para `src/modules/arremesso/repository.ts` e o `store.ts` os importa. Não há exceção nova no `config.ts`, e a chave só aparece no `repository.ts`.
- Feito: o `store.ts` do módulo (vanilla), com a reação a `selecaoAlterada` num único `set`. `publish` faz um `set` e em seguida emite `resultadoPublicado`. O `index.ts` exporta `arremesso()`, as ações, `assinarArremesso` e o evento (só `subscribe`). `ui/useArremesso.tsx` e o `cena.ts` são novos. O `src/store.ts` ficou só com presságio e vitrine, mais o assinante do evento, `omenPlaying()` e `useOmenPlaying()`.
- Leitores síncronos entre os dois `set`: o único é quem usa `assinarArremesso`, hoje só o `coin-performance`, que lê fase e corpos e não lê `omen`. Não há outro `subscribe` em produção. O assinante do presságio se registra quando o `src/store.ts` carrega, antes do efeito do `App`. `Hand`, `Omens`, `Tray`, `Controls`, `OmenOverlay` e o test hook leem no `useFrame`, no render ou sob demanda, sempre depois do `publish`. O teste novo em `tests/omen.test.ts` mostra o `omen` já preenchido durante a entrega do evento.
- Testes: `estado.test.ts` recebeu as asserções sem mudança e ganhou 4 testes do evento. `tests/store.test.ts` ficou só com os dois testes de `setOmenTest`. Em `tests/`, `store.test.ts` e `omen.test.ts` importam `src/modules/arremesso/store.ts` direto, só para o reset, porque não há porta para isso (aceito no escopo ampliado). O `kraken.spec.ts` importa o mesmo arquivo por URL (decisão 7).
- Gate (2ª rodada): `npm test` 486/486; `test:server` 23/23; `build` ok, com o worker em 2.379,76 kB (o mesmo da OS-0030); `lint` ok. Da 1ª rodada: `playwright --list` com 8 testes; o grep do aceite só mostra o `throwId` do presságio e leituras de `arremesso()`/`useArremesso`/evento.
- Doc: corrigi o `src/modules/selecao/CLAUDE.md:14`, que agora diz que a cópia `dice` vive no store do `arremesso`. No `arremesso.md`, além da seção do store, atualizei as linhas 3 e 48, que citavam `useDice` para o arremesso.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Decisões 1 a 7:** cumpridas.
- **Ações:** idênticas ao HEAD. No `publish`, o `return` antecipado equivale ao `return s`.
- **Presságio:** calculado como antes. Os `dice` e o `force` do evento são os mesmos.
- **Os dois `set`:**
  - nenhum `subscribe` de produção lê `omen` entre eles;
  - os roots são concorrentes (`createRoot`, R3F v9), então nenhum render cabe entre os dois;
  - os `useFrame` seguintes do mesmo quadro já veem o `omen`.
- **`useOmenPlaying`:** sem tearing.
- **`App.tsx`:** uma chamada de `registrarArremesso` por resultado, como antes.
- **Outros:** a chave `diceroller.rolagem` fica só em `repository.ts`, e nenhuma asserção movida mudou.

Achados:
- `Hand.tsx:250` e `Omens.tsx:220` relêem os stores (`omenPlaying()`) em vez do retrato do quadro. Hoje dá o mesmo resultado. Fica registrado.
- `mapa-modulos.md:98` dizia "a casca assina o store", e a linha 16 estava com o estado antigo. Corrigido pelo orquestrador.

## Gate

2026-11-14, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 51 arquivos, 486 testes |
| `npm run test:server` | ✅ 23 testes |
| amostra de E2E (`roll`, `kraken`, `coin-performance`) | ✅ 24 de 24 (3,9 min) |

O E2E completo fica para o aceite do módulo. A amostra foi rodada porque esta ordem divide a publicação do resultado em dois `set`. É o ponto de maior risco do módulo, e a amostra o confirmou cedo.
