# Ordem de serviço: `meus-dados`, grupo "Meus dados", inspeção e CLAUDE.md

Ordem: OS-0029 (extração nº 5, `meus-dados`, parte 3 de 3)
Módulo: `meus-dados`
Escopo de escrita:
- `src/modules/meus-dados/`: `ui/*.tsx`, `store.ts`, `index.ts`, `cena.ts`, `contracts.ts` (só para acrescentar), `tests/` e `CLAUDE.md` (novo).
- **Legado:** `src/ui/Controls.tsx`. Saem o `InkButton`, o `mine`, o grupo "Meus dados" e o estado `importing`/`mounted`.
- **Casca:** `src/app/Cena.tsx:237`, o `customs` do test hook.
- **Docs:** `docs/contexto/dados.md`, onde fala de "Meus dados" e do test hook `customs`.

Objetivo: o grupo "Meus dados" passa a ser do módulo. Ele tem o botão de cada importado, a Tinta, a lixeira e o "Importar dado". O estado do assistente (aberto/montado) também passa, assim como a inspeção de teste. O módulo ganha o `CLAUDE.md`. O DOM fica **idêntico** e o comportamento não muda.

Leia antes de começar:
- `docs/specs/meus-dados.md`, nas seções do `CLAUDE.md` e em "Dados de que é dono"
- `src/modules/meus-dados/index.ts`, `cena.ts`, `store.ts` e `contracts.ts`
- `src/ui/Controls.tsx`, inteiro
- `src/modules/selecao/tests/componentes.test.ts` e a fixture, como modelo de teste de DOM
- `src/modules/selecao/CLAUDE.md`, como modelo de formato

Decisões do orquestrador:
1. **Estado do assistente no store do módulo** (a spec diz que ele é dono "do estado do assistente").
   - O store ganha `importando: boolean` e `montado: boolean`, mais as ações `alternarImportacao()` e `fecharImportacao()`. `alternarImportacao()` faz `montado = true` e inverte `importando`.
   - Hoje isso é `useState` no `Controls`, e o comportamento é o mesmo: o assistente só monta na primeira abertura e continua montado depois de fechar.
2. **Componentes**, em `ui/`, exportados por `cena.ts`:
   - **`<MeusDados/>`:** o `div.selection` com `aria-label="Meus dados"`. Tem um `div.pick` por importado, com `<BotaoDeDado kind/>` de `selecao/cena`, o `InkButton` (só `printed`) e a lixeira, e no fim o botão "Importar dado", que chama `alternarImportacao()`. É o JSX de hoje, sem mudança.
   - **`<Importacao/>`:** `{montado && <Suspense fallback={null}><AssistenteDeImportacao open={importando} onClose={fecharImportacao} /></Suspense>}`.
   - O `Controls` coloca `<MeusDados/>` e `<Importacao/>` **nos mesmos lugares** de hoje: o grupo depois de `<BotoesDeDados/>`, e o assistente depois de `<TablePanel/>`.
   - O `InkButton` vai para `ui/InkButton.tsx`, sem mudança.
3. **`inspecao()`** no `index.ts` devolve os dados salvos como o test hook espera hoje: `{ kind, id, name, slug, base, printed }[]`. O tipo vai para o `contracts.ts`. `Cena.tsx:237` passa a ser `customs: () => inspecao()`. Use outro nome no import se colidir com o `inspecao` de `dados`.
4. **DOM idêntico.**
   - Faça como na OS-0026: antes de mexer, capture o HTML do `<header>` do `Controls` do HEAD com `renderToStaticMarkup`. Use quatro casos:
     - sem importados;
     - um importado sem gravação;
     - um com gravação (com Tinta);
     - o assistente montado e fechado.
   - Guarde como fixture em `src/modules/meus-dados/tests/fixtures/`.
   - Depois da mudança, um teste do módulo renderiza `<MeusDados/>` (e `<Importacao/>`, se der) e compara com o trecho da fixture.
   - O assistente é lazy e no SSR vira `null`. Registre o que foi possível comparar.
5. **Testes da OS-0027, reforçados** (observação da revisão):
   - no mock de `deleteCustomDie` em `tests/acoes.test.ts`, confirme que `customDie(kind)` ainda existe quando ele é chamado, porque essa é a ordem da decisão 4 daquela OS;
   - o caso "mantém `sessionOnly`" parte de `sessionOnly: true`.
6. **`CLAUDE.md` do módulo.** Tem os cinco blocos da spec: Responsabilidade, Regras de negócio, Expõe, Consome e Fora do escopo. Fica entre 30 e 50 linhas e usa os nomes reais. Ele diz:
   - as duas portas;
   - que o importador e o assistente só entram por `import()` (`carregarImportador`, `AssistenteDeImportacao` lazy);
   - que o `repository.ts` precisa ser carregado estaticamente (`defineStore`);
   - o que o módulo possui: `customDice`, a lista, `sessionOnly` e o estado do assistente.

Entregáveis:
1. O store com o estado do assistente, e os componentes `MeusDados`, `Importacao` e `InkButton`.
2. O `Controls.tsx` só com o que não é de `meus-dados`.
3. `inspecao()` e o test hook.
4. O teste de DOM, os testes reforçados e o `CLAUDE.md`.

Critérios de aceite:
- `grep -n "InkButton\|excluir\|atualizar\|useMeusDados\|importing\|mounted" src/ui/Controls.tsx` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam.
- O assistente continua sob demanda e a carga inicial não cresce mais que cerca de 1 kB.
- O `index.ts` fica sem React, e a arquitetura passa.
- **Sem E2E no dev.** O orquestrador roda o E2E de aceite (`import`, `controls`, `screens` em especial).

Fora do escopo:
- `RollMode`, `Force`, o resultado e os textos de status, que são do `arremesso` e da `vitrine`.
- O CSS.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev
- Fixture `tests/fixtures/lista-antes.json` capturada do `Controls` do HEAD, antes da mudança: o `<header>` inteiro, com quatro casos (vazio, sem gravação, com Tinta, montado e fechado). O caso montado foi capturado com `useState` forçado por um teste temporário (já apagado), e o lazy foi pré-carregado: o `<aside id="import-die">` está na fixture.
- `tests/componentes.test.ts`: `<MeusDados/>` aparece na fixture logo antes do `p.pool` nos quatro casos, e `<Importacao/>` é o fim exato do cabeçalho montado (no 1º render suspende → `''`). A única normalização é o nome gerado por `useId` nos rádios da Tinta, que depende da posição na árvore. Numa verificação avulsa (também apagada), o `Controls` depois da mudança deu igual à fixture nos quatro casos, com a mesma normalização.
- Decisão 1: o estado do assistente está num 2º store vanilla do `store.ts` (`assistente`). Assim, `meusDados()` e o `MeusDados` do contrato não mudam, e os `toEqual` da OS-0027 continuam valendo.
- Divergência: `<Importacao/>` está no próprio `cena.ts`, com `createElement`, e não em `ui/`. O `tests/arquitetura/leitor.test.ts` (fora do escopo) fixa a aresta `import()` `cena.ts → ui/AssistenteDeImportacao.tsx`. Pôr o componente em `ui/` exigiria mover o lazy (e o teste quebra) ou criar um ciclo de arquivos.
- `cena.ts` deixou de exportar `InkChoice`, que só o `InkButton` usava e agora é interno. O `Cena.tsx` perdeu os imports órfãos `customKind` e `meusDados`. A linha do test hook é a 238 (a ordem diz 237).
- Testes reforçados: no `excluir`, o mock de `deleteCustomDie` confirma que `customDie(kind)` ainda existe. O caso "mantém sessionOnly" parte de `true`.
- Gate: `npm test` 481/481; `test:server` 23/23; `build` ok (worker 2.379.760 B, igual e com o mesmo hash; `index` 2.928.947 → 2.929.184 B, +237 B; `AssistenteDeImportacao` continua como chunk à parte, 40.572 B); `lint` ok; grep de aceite vazio. A base é o `dist/` de 09:38, gerado logo antes do commit do HEAD. Sem E2E.

## Parecer do revisor

**APROVADO COM RESSALVAS** (revisão da OS e auditoria de aceite do `meus-dados`).
- **DOM:** conferido de forma independente. Com `renderToStaticMarkup` do `<Controls/>` do HEAD e do novo, em 6 casos, a saída é idêntica byte a byte, inclusive o `useId`.
- **Assistente:** abrir e fechar se comportam como no HEAD, e o `Controls` é montado uma vez só.
- **Divergências do dev, aceitas:** o `<Importacao/>` ficou no `cena.ts`, com `createElement`, porque o `leitor.test.ts` fixa a aresta `import()` ali. O estado do assistente ficou num segundo store, para não mudar o `meusDados()`.
- **`inspecao()` e testes:** `inspecao()` faz o mesmo `map` de antes, e os testes reforçados testam o que dizem.
- **Auditoria:** está tudo cumprido.
  - `montarDado` é puro e testado.
  - `tintaPermitida` é o único lugar da regra.
  - Só o E2E do esquema do banco mexe em `customDice` fora do módulo.
  - Os testes do importador estão no módulo com as mesmas asserções.
  - O assistente é sob demanda.
  - As duas duplicações de `regras` sumiram.
- **Ressalvas, corrigidas pelo orquestrador:**
  - `dados.md:3`, sobre o que resta em `src/dice`;
  - o bloco Consome do `CLAUDE.md` do módulo;
  - o mapa: `meus-dados` concluído, com o estado do assistente;
  - o `CLAUDE.md` raiz.
- **Ressalva aceita:** o `componentes.test.ts:58` espera 50 ms pelo lazy. O E2E cobre abrir e fechar.

## Gate

2026-11-14, rodado pelo orquestrador. É o **aceite do módulo `meus-dados`**, com E2E e com a máquina livre (VS Code e Firefox fechados).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 50 arquivos, 481 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 de 98 (18,4 min), inclusive os botões Kraken, Tempestade e Dualidade, que tinham falhado por carga no aceite do `selecao` |
