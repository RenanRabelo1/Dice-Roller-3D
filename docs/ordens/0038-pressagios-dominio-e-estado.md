# Ordem de serviço: `pressagios`, domínio e estado

Ordem: OS-0038 (extração nº 8, `pressagios`, parte 1 de 3)
Módulo: `pressagios`
Escopo de escrita:
- **Módulo novo** `src/modules/pressagios/`: `contracts.ts`, `index.ts`, `store.ts`, `cena.ts`, `ui/usePresagio.tsx`, `domain/*.ts` e `tests/`. O `CLAUDE.md` fica para a parte 3.
- **Legado movido** com `git mv` para `src/modules/pressagios/domain/`: `src/dice/omen.ts`, `src/dice/omenTest.ts`, `src/scene/krakenMotion.ts` e `src/scene/fireMotion.ts`.
- **`src/store.ts`:** saem `omen`, `omenAt`, `omenDone`, `omenRig`, `omenTest`, as ações deles, `omenPlaying`, `useOmenPlaying`, o assinante de `resultadoPublicado` e o cancelamento por movimento reduzido. Fica só `showcased`/`setShowcased`, que são da `vitrine`.
- **Pontos de chamada, só as linhas que leem ou escrevem esses campos e os imports:**
  - `src/scene/Hand.tsx`, `Omens.tsx`, `Kraken.ts`, `Fire.ts`, `QuebraDaMesa.tsx`, `showcase.ts` e `highlight.ts` (os que usarem);
  - `src/ui/Controls.tsx`, `OmenOverlay.tsx` e `OmenTests.tsx`;
  - `src/app/Cena.tsx` (o test hook e o getter de `omenTest`);
  - `src/App.tsx`, se usar.
- **Testes:**
  - para `src/modules/pressagios/tests/`, com `git mv`: `tests/omen.test.ts`, `kraken.test.ts`, `fire.test.ts`, `krakenShards.test.ts` e `omenTest.test.ts`, os que testarem só o módulo;
  - `tests/store.test.ts`, que fica em `tests/` se atravessar módulos;
  - `e2e/kraken.spec.ts` e `table-kraken.spec.ts`, no acesso ao store por URL.
- **Arquitetura:** `tests/arquitetura/config.ts`, as exceções de `src/store.ts` que mudarem.
- **Docs:** `docs/contexto/apresentacao.md` e `visao-geral.md`, nos caminhos.

Objetivo: o estado do presságio e as regras puras dele passam a ser do módulo `pressagios`. O estado é `omen`, `omenAt`, `omenDone`, `omenRig` e `omenTest`. As regras puras são a duração, `isD20`, os botões de teste e `withDiceFor`, e o movimento do kraken, da tempestade e do fogo, com `trayBrokenAt`.
- Quem decide o presságio de um resultado publicado é o módulo, assinando `resultadoPublicado`.
- A cena (`Omens`, `Kraken`, `Fire`, `QuebraDaMesa`) e a camada HTML continuam no legado nesta ordem e leem o módulo pela porta.
- O comportamento não muda.

**Tamanho.** São cerca de 20 arquivos, mas em quase todos só muda a forma de ler o estado e os imports. Vale a exceção da OS-0016. Se algum arquivo pedir lógica nova, pare e reporte.

Leia antes de começar:
- `docs/specs/pressagios.md`, inteiro
- `src/store.ts`, inteiro (62 linhas)
- os 4 arquivos movidos (`grep -n "^import\|^export"`) e `src/dice/omen.ts`, inteiro
- `src/modules/arremesso/store.ts`, `index.ts` e `cena.ts`, como modelo de store vanilla, evento e hook
- as linhas de cada ponto de chamada que usam `useDice`, `omenPlaying`, `useOmenPlaying` e os arquivos movidos

Decisões do orquestrador:
1. **Nomes.**
   - Os nomes exportados ficam (`OMEN_MS`, `DUALITY_HIT`, `omenMs`, `isD20`, `OMEN_TESTS`, `withDiceFor`, `KRAKEN`, `STORM`, `FIRE`, `krakenAt`, `trayBrokenAt`…), pela decisão 1 da OS-0020.
   - São novos, com o nome da spec: `presagio()` (o estado atual: `omen`, `omenAt`, `omenDone`, `omenRig` e `omenTest`), `presagioTocando()` (o `omenPlaying()` de hoje), `usePresagioTocando()` (o `useOmenPlaying()`, em `ui/usePresagio.tsx`) e `usePresagio(selector)`.
   - As ações mantêm o nome: `setOmenDone`, `rigOmen` e `setOmenTest`.
2. **Store.**
   - `store.ts` é vanilla e tem o mesmo assinante de `resultadoPublicado` de hoje: `movimentoReduzido() ? null : omenRig ?? omenOf(omenKinds(dice), results)`, com `omenAt`. Tem também o mesmo cancelamento por `aoMudarMovimentoReduzido`. Os dois são registrados ao carregar o arquivo.
   - Confira que o `store.ts` do módulo é carregado no app antes do primeiro `publish`, pelo caminho de import desde `main`. Hoje é o `src/store.ts` que garante isso. Se não houver caminho estático, importe o `index` do módulo no `App.tsx` e registre no relatório.
3. **O `useDice` fica com `showcased`/`setShowcased`.** Quem junta os dois estados (`{ ...arremesso(), ...useDice.getState() }`) passa a juntar três, quando precisar de campos de presságio: `{ ...arremesso(), ...presagio(), ...useDice.getState() }`. As funções puras não mudam.
4. **`omenTest` para o laço.** O getter que a `Cena` passa ao `LoopDoArremesso` passa a ler `presagio().omenTest`.
5. **Testes.**
   - Os movidos ajustam só os imports e ficam sem mudar asserções.
   - Os testes em `tests/` que reiniciam o estado podem importar o `store.ts` do módulo direto, como na OS-0031.
   - Um teste novo no módulo: o presságio é preenchido no mesmo tique de `resultadoPublicado`, e `null` com movimento reduzido.
   - Um teste novo no módulo: ligar o movimento reduzido cancela o presságio.
6. **E2E.** `kraken.spec.ts` e `table-kraken.spec.ts` passam a importar `/src/modules/pressagios/store.ts` por URL onde hoje mexem no `useDice` para presságio. Confira com `npx playwright test --list`.

Entregáveis:
1. O módulo com o domínio, o store, os hooks e as portas.
2. O `src/store.ts` só com `showcased`.
3. Os pontos de chamada trocados.
4. Os testes da decisão 5 e os E2E ajustados.
5. As exceções de arquitetura e as docs.

Critérios de aceite:
- `src/dice/omen.ts`, `src/dice/omenTest.ts`, `src/scene/krakenMotion.ts` e `src/scene/fireMotion.ts` não existem.
- `grep -nE "omen|Omen" src/store.ts` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa: sem ciclo, `index` sem React e módulo sem legado. O `pressagios` só importa `arremesso`, `mesa`, `dados`, `regras`, `selecao` e `shared` pelas portas. O worker não cresce.
- **Sem E2E**, só o `--list`.

Fora do escopo:
- A cena (`Omens.tsx`, `Kraken.ts`, `Fire.ts`, `QuebraDaMesa.tsx`), `planoDoPresagio`, `movimentoNoPresagio`, a camada HTML (`OmenOverlay`), o CSS, `inspecao()` e o `CLAUDE.md`, que são as OS-0039 e 0040.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Módulo criado: `contracts.ts` (`EstadoDoPresagio`), `store.ts` (vanilla, assinantes de `resultadoPublicado` e `aoMudarMovimentoReduzido` copiados do legado, `presagio()`, `presagioTocando()` e as ações), `index.ts` (o estado e o domínio, só o que se usa de fora), `cena.ts` e `ui/usePresagio.tsx` (`usePresagio`, `usePresagioTocando`). Os 4 arquivos de domínio foram movidos com `git mv` e só os imports mudaram (com `.ts`).
- `src/store.ts` ficou só com `showcased`. O grep `omen|Omen` volta vazio. A exceção `zustand` de `src/store.ts` em `config.ts` continua válida e não mudou.
- Carga antes do 1º `publish`: há caminho estático `App → ui/Controls → pressagios/cena.ts → ui/usePresagio.tsx → store.ts` (e `App → Cena → index`). Não precisei de import extra no `App.tsx`.
- Junções de três estados em `Hand.tsx` e no test hook. `Omens.tsx` junta `arremesso()` e `presagio()`. O getter `omenTestAtual` lê `presagio().omenTest`.
- Testes movidos para o módulo: `fire.test.ts` e `omenTest.test.ts`. Ficam em `tests/`, só com os imports ajustados:
  - `omen.test.ts` e `store.test.ts`, que reiniciam o store do `arremesso` e importam o `store.ts` do módulo direto;
  - `kraken.test.ts`, que usa `scene/showcase` do legado;
  - `krakenShards.test.ts`, que usa `scene/Kraken`, sem mudança.
- Novo: `tests/estado.test.ts` (TDD, primeiro vermelho), com o mesmo tique de `resultadoPublicado`, `null` com movimento reduzido e o cancelamento ao ligar. Usa só as portas do `arremesso`, com `reiniciar()` e o `throwId` lido de volta.
- Fora da lista: `tests/custom.test.ts` importava `isD20` de `src/dice/omen`. Troquei só o import, porque o `git mv` obrigava.
- E2E: nenhum dos dois specs mexia no `useDice` para presságio, então não mudaram. O `--list` lista os 7 testes.
- Gate: `npm test` com 57 arquivos e 510 testes, `test:server` com 23, build ok (worker 2.379,76 kB, igual ao da OS-0037), lint ok.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Decisões:** de 1 a 6, cumpridas.
- **`store.ts`:** é cópia literal do `src/store.ts` do HEAD nas partes de presságio.
- **Ordem de carga:** segura. O `index.ts` reexporta o `store.ts`, e a casca importa a porta estaticamente. O presságio continua sendo calculado antes de o histórico ser gravado (`App.tsx`, num `useEffect`).
- **Campos combinados:** não colidem.
- **Testes:**
  - Os movidos não mudaram de asserção.
  - `kraken.test.ts` e `krakenShards.test.ts` ficam em `tests/`, porque usam o legado.
  - O `estado.test.ts` testa o que diz.
- **Fora do escopo:** em `tests/custom.test.ts` só a linha do import mudou, por causa do `git mv`.

Ressalvas, todas corrigidas pelo orquestrador:
1. `armadilhas.md:15` tinha um caminho morto para `src/dice/omen.ts`.
2. `arremesso/CLAUDE.md:31` agora diz que `omenTest` mora em `pressagios`.
3. `arremesso/NOTAS.md:27` agora fala do estado do presságio em `pressagios` e da junção dos três estados.
4. `mapa-modulos.md:18,36` ganhou `selecao` nas dependências de `pressagios`, com o estado "em extração".

## Gate

2026-11-14, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 57 arquivos, 510 testes |
| `npm run test:server` | ✅ 23 testes |
| amostra de E2E (`omen`, `kraken`, `table-kraken`) | ✅ 22 de 22 (5,3 min) |
