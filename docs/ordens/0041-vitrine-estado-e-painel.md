# Ordem de serviço: `vitrine`, estado, domínio e painel do resultado

Ordem: OS-0041 (extração nº 9, `vitrine`, parte 1 de 4)
Módulo: `vitrine`
Escopo de escrita:
- **Módulo novo** `src/modules/vitrine/`: `contracts.ts`, `index.ts`, `store.ts`, `cena.ts`, `ui/*.tsx`, `domain/*.ts` e `tests/`. O `CLAUDE.md` fica para a parte 4.
- **Legado movido** com `git mv`:
  - para `src/modules/vitrine/domain/`: `src/scene/showcase.ts`, `highlight.ts` e `inkGlow.ts`;
  - para `src/modules/vitrine/domain/painel.ts`: `src/dice/notation.ts` (o `resultText`).
- **Legado que sai:** `src/store.ts` é apagado com `git rm`, porque o `showcased` vai para o módulo.
- **Pontos de chamada, só os imports e a forma de ler o estado:** `src/scene/Hand.tsx`, `src/app/Cena.tsx` (o `entreAnimacoes` e o test hook) e `src/ui/Controls.tsx` (decisão 3).
- **Testes:**
  - para `src/modules/vitrine/tests/`, com `git mv`: `tests/notation.test.ts`, `tests/showcase.test.ts`, `tests/highlight.test.ts` e `tests/inkGlow.test.ts`, os que existirem e não dependerem do legado;
  - `tests/custom.test.ts` e `tests/kraken.test.ts`, só o import.
- **Arquitetura:** `tests/arquitetura/config.ts`, sai a exceção `src/store.ts` × `zustand`.
- **Docs:** `docs/contexto/apresentacao.md` e `visao-geral.md`, nos caminhos.

Objetivo: o que a vitrine sabe e guarda passa a ser do módulo `vitrine`. São as poses do voo (`showcase`), o destaque dos números (`highlight`), o brilho da gravação (`inkGlow`), o texto do painel (`resultText`) e o estado `showcased`.
- O painel do resultado (`<output data-testid="result">`) vira o componente `<PainelDoResultado/>`.
- O `useDice` e o `src/store.ts` deixam de existir.
- A cena da vitrine (`Hand.tsx`) continua no legado nesta ordem e lê o módulo pela porta.
- O comportamento e o DOM não mudam.

Leia antes de começar:
- `docs/specs/vitrine.md`, inteiro
- `src/store.ts`, `src/dice/notation.ts` e `src/ui/Controls.tsx`, inteiros (são curtos)
- os imports e `export` de `showcase.ts`, `highlight.ts` e `inkGlow.ts`
- as linhas de `Hand.tsx` e `Cena.tsx` que usam `useDice`/`showcased`
- `src/modules/pressagios/` (`store.ts`, `index.ts`, `cena.ts` e `ui/usePresagio.tsx`), como modelo
- `src/modules/arremesso/tests/componentes.test.ts`, como modelo de teste de DOM

Decisões do orquestrador:
1. **Nomes.**
   - Os nomes exportados ficam (`showcasePoses`, `CAPTION`, `highlightAt`, `HL_SIZE`, `SHOW`, `glowMesh`, `resultText`…), pela decisão 1 da OS-0020.
   - São novos, com o nome da spec: `vitrineConcluida(throwId) → boolean`, que diz se `showcased === throwId`, e `setShowcased`, com o mesmo nome de hoje.
   - O estado sai por `vitrine()` (`{ showcased }`) e pelo hook `useVitrine(selector)`, este em `ui/`.
2. **Store.** `store.ts` é vanilla, com `showcased` e `setShowcased`. Ninguém fora do módulo o lê, e todos usam `vitrine()`, `vitrineConcluida()` ou o hook.
3. **`<PainelDoResultado/>`.**
   - É o `<output data-testid="result" aria-live="polite">…</output>` do `Controls`, com o `useArremesso` de `results`/`dice` (os dados do arremesso), o `usePresagioTocando` e o `resultText`, iguais a hoje.
   - O `Controls` o põe no mesmo lugar, dentro de `.feedback` e antes do `{phase === 'charging' && <BarraDeForca/>}`.
   - Teste de DOM com fixture capturada **antes**, nos casos: sem resultado, um d20, vários dados, só moedas e presságio tocando (vazio).
4. **`entreAnimacoes`** (`Cena.tsx`) passa a usar `vitrineConcluida(throwId)`. O test hook monta `showcased` a partir de `vitrine()`, e o `DiceHook` não muda.
5. **Testes.**
   - Os movidos ajustam só os imports e ficam sem mudar asserções.
   - Se um teste usar o legado (`Hand`), ele fica em `tests/` e só muda o import.
   - Um teste novo, `vitrineConcluida`.

Entregáveis:
1. O módulo com o domínio, o store, `PainelDoResultado`, o hook e as portas.
2. `src/store.ts` e `src/dice/notation.ts` removidos, e a pasta `src/dice/` também, se ficar vazia.
3. Os pontos de chamada trocados.
4. Os testes, a exceção de arquitetura removida e as docs.

Critérios de aceite:
- `src/store.ts` não existe, e `grep -rn "useDice" src tests e2e` volta vazio.
- `ls src/scene` só mostra o `Hand.tsx`, e `ls src/dice` não acha nada.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa, sem exceção para `src/store.ts`, sem ciclo, com o `index` sem React e o módulo sem legado. O worker não cresce.
- **Sem E2E no dev.** O orquestrador roda uma amostra (`roll`, `coin`, `omen`, `import`, `screens`).

Fora do escopo:
- A cena da vitrine (`Hand.tsx` → `<Vitrine/>`), `inspecao()` e o `CLAUDE.md`, que são a OS-0044.
- `definirOpacidade`/`definirSombra`/`rotulos` (`dados`, OS-0042), e `dadoNaCena`/`moverDado`/`envelopeDaMao` (`arremesso`, OS-0043).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Fixture capturada antes de mexer no `Controls`: um teste temporário renderizou o `Controls` legado com `renderToStaticMarkup` e recortou o `<output>` nos 5 casos, gravando `tests/fixtures/painel-antes.json`. O teste foi apagado depois.
- Módulo: `contracts.ts` (`EstadoDaVitrine`, `TextoDoPainel`), `store.ts` (vanilla, `vitrine()`, `setShowcased`, `vitrineConcluida`), `index.ts` (puro), `cena.ts` (`useVitrine` e `PainelDoResultado`), `ui/useVitrine.tsx` e `ui/PainelDoResultado.tsx`. Com `git mv`: `domain/showcase.ts`, `highlight.ts`, `inkGlow.ts` e `painel.ts`. Só os imports mudaram.
- `vitrine()` devolve o estado inteiro (`showcased` e `setShowcased`), como o `presagio()`. O `Hand` só troca `useDice.getState()` por `vitrine()` e chama o `setShowcased` importado.
- `git rm src/store.ts`. A pasta `src/dice/` ficou vazia e foi removida. `src/scene/` ficou só com o `Hand.tsx`.
- Testes: `notation`, `showcase`, `highlight` e `inkGlow` foram para o módulo, só com mudança de import. O `showcase` usa `tests/helpers/models.ts`, como o `mesa/tests`. Em `custom` e `kraken` mudou só o import. Entraram dois testes novos: `estado.test.ts` (`vitrineConcluida`) e `painel.test.ts`.
- Divergência: o `painel.test.ts` não pode montar os stores de `arremesso` e `pressagios`, porque a porta única recusa isso. Por isso ele faz `vi.mock` de `arremesso/cena.ts` (`useArremesso`) e de `pressagios/cena.ts` (`usePresagioTocando`). A fixture veio dos stores reais.
- Arquitetura: saiu a exceção `src/store.ts` × `zustand`.
- Docs: caminhos atualizados em `apresentacao.md` e `visao-geral.md`.
- Gate: `npm test` 63 arquivos e 543 testes; `test:server` 23; `build` ok, worker com 2.379.760 bytes e o mesmo hash `BHo0CnSe`; `lint` limpo.
- Pendência: o `grep -rn "useDice" src tests e2e` ainda acha `src/modules/arremesso/NOTAS.md:27`, uma frase de doc do `arremesso` fora do escopo. Não mexi.

## Parecer do revisor

**APROVADO COM RESSALVAS.** O código está correto e o comportamento não muda.
- **Arquivos movidos:** só mudaram imports.
- **Estado:** `store.ts` com `vitrineConcluida` equivale ao `useDice`.
- **Estados combinados:** os três não colidem.
- **`PainelDoResultado`:** o JSX é idêntico byte a byte e está no mesmo lugar.
- **`vi.mock` das portas:** não mascara nada.
- **Arquitetura:** limpa e de acordo com o mapa.

Ressalvas, corrigidas pelo orquestrador:
1. O `CLAUDE.md` raiz (linhas 5 e 27) não lista mais `src/dice` e `store.ts` como legado.
2. `dados.md:69`: o painel aponta para `vitrine/domain/painel.ts` e `<PainelDoResultado/>`.
3. `selecao/CLAUDE.md:37`: "o `store.ts` do `arremesso`".
4. Em `Hand.tsx:80,128`, `state.setShowcased` virou o `setShowcased` importado, como já era na linha 192.

Também corrigido: `arremesso/NOTAS.md:27` (`useDice` → `vitrine()`).

## Gate

2026-11-14, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 63 arquivos, 543 testes |
| `npm run test:server` | ✅ 23 testes |
| amostra de E2E (`roll`, `coin`, `omen`, `import`, `screens`) | ✅ 52 de 52 (12,2 min) |
