# Ordem de serviço: `mesa`, domínio, gravação e estado

Ordem: OS-0035 (extração nº 7, `mesa`, parte 1 de 3)
Módulo: `mesa`
Escopo de escrita:
- **Módulo novo** `src/modules/mesa/`: `contracts.ts`, `index.ts`, `store.ts`, `repository.ts`, `cena.ts`, `ui/useMesa.tsx`, `domain/*.ts` e `tests/`. O `CLAUDE.md` fica para a parte 3.
- **Legado movido** com `git mv`:
  - para `src/modules/mesa/domain/`: `src/scene/tableTheme.ts`, `tableTextures.ts`, `tableImages.ts`, `tableBuild.ts` e `tableFile.ts`;
  - para `src/modules/mesa/repository.ts`: `src/scene/tableStore.ts`;
  - para `src/modules/mesa/store.ts`: `src/scene/tableState.ts`, convertido em store vanilla (decisão 2).
- **Pontos de chamada, só os imports e a forma de ler o store:** `src/App.tsx`, `src/app/Cena.tsx`, `src/scene/Backdrop.tsx`, `Omens.tsx` e `Tray.tsx`, e `src/ui/TablePanel.tsx`.
- **Testes:**
  - `tests/table.test.ts` vai para o módulo com `git mv`. Se uma parte testar os cacos do kraken (`pressagios`), ela fica em `tests/`;
  - `e2e/table-kraken.spec.ts:5`, o caminho por URL.
- **Arquitetura:** `tests/arquitetura/config.ts`. Saem as exceções de `tableStore.ts` (`tables`, `mesa.ativa`) e de `tableState.ts` (`zustand`), porque os arquivos agora estão no módulo dono. Também `tests/arquitetura/leitor.test.ts`, se uma aresta esperada mudar.
- **Docs:** `docs/contexto/mesa.md` e `visao-geral.md`, nos caminhos.

Objetivo: o tema da mesa, as texturas, as imagens e o panorama, a construção da mesa padrão, o arquivo `.glb` (exportar e importar), a gravação no IndexedDB e o estado da mesa passam a ser do módulo `mesa`.
- Os componentes (`Tray` visual, `Backdrop`, `TablePanel`, o ambiente na `Cena`) continuam no legado nesta ordem e leem o módulo pela porta.
- O comportamento não muda e o `tableFile` continua **sob demanda**.

Leia antes de começar:
- `docs/specs/mesa.md`, inteiro
- `src/modules/meus-dados/` (`index.ts`, `store.ts`, `repository.ts`, `cena.ts`, `ui/useMeusDados.tsx`), como modelo de store vanilla, repositório, hook e importador sob demanda (`carregarImportador`)
- os imports e `export` dos 7 arquivos (`grep -n "^import\|^export"`) e `src/scene/tableState.ts`, inteiro
- as linhas de cada ponto de chamada que usam `useTable` e os `table*`
- `docs/contexto/armadilhas.md`, no item `defineStore`

Decisões do orquestrador:
1. **Nomes.**
   - Os nomes de arquivo ficam dentro de `domain/` (`tableTheme.ts`…), e os nomes exportados também (`DEFAULT_THEME`, `buildDefault`, `colorsOf`, `panoramaTexture`…), pela decisão 1 da OS-0020.
   - O `index.ts` reexporta só o que alguém de fora usa hoje.
2. **Store.**
   - `store.ts` é vanilla (`zustand/vanilla`), com o mesmo estado e as mesmas ações do `useTable` de hoje (`theme`, `tables`, `sessionOnly`, `colors`, `load`, `edit`, `apply`, `copy`, `remove`, `reset`, `setColors`…).
   - O `index.ts` exporta `mesa()` (o estado atual) e as ações.
   - `useMesa(selector)` é o hook, em `ui/useMesa.tsx`, reexportado pelo `cena.ts`.
   - Os pontos de chamada trocam `useTable(sel)` por `useMesa(sel)` e `useTable.getState()` por `mesa()`.
   - A lógica das ações não muda: o atraso de 300 ms, o `pagehide`, o `remove` que cancela a gravação pendente e a mesa padrão que nunca é salva.
3. **Repositório.**
   - `repository.ts` (o `tableStore.ts`) tem o `defineStore('tables')` e a chave `mesa.ativa`. Ele é **importado estaticamente** pelo `store.ts`, e este pelo `index.ts`, e o `App.tsx` chama o `load`.
   - Confira o caminho `main → App → mesa/index` (armadilhas, `defineStore`).
4. **`tableFile` sob demanda.**
   - O `index.ts` **não** o reexporta estaticamente. Ele expõe `carregarArquivoDeMesa = () => import('./domain/tableFile.ts')`.
   - Os pontos de chamada que hoje fazem `import('../scene/tableFile')` (o `Tray.tsx` e o `TablePanel.tsx`, por exemplo) passam a usar essa função.
   - No `vite build`, confira que o chunk sob demanda do `tableFile` continua saindo e que o `GLTFExporter` não entrou na carga inicial.
5. **Testes.**
   - `tests/table.test.ts` vai para `src/modules/mesa/tests/` e importa o `domain/` direto, porque está dentro do módulo. As asserções não mudam.
   - `table-kraken.spec.ts` passa a importar o store do módulo por URL (`/src/modules/mesa/store.ts`), como o `kraken.spec.ts` na OS-0031. Confira com `npx playwright test --list`.

Entregáveis:
1. O módulo com o domínio, o repositório, o store, o hook e as portas.
2. Os pontos de chamada trocados.
3. O teste movido, o E2E ajustado e as exceções de arquitetura removidas.
4. As docs.

Critérios de aceite:
- `ls src/scene/table*.ts` não acha nada, e `grep -rn "useTable" src tests e2e` volta vazio.
- O teste de dono aceita `tables`, `mesa.ativa` e o store zustand no módulo, sem exceção.
- O `vite build` mostra o chunk sob demanda do `tableFile`, e a carga inicial não cresce mais que cerca de 1 kB.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa: sem ciclo, `index` sem React e módulo sem legado. O worker não cresce.
- **Sem E2E**, só o `--list`.

Fora do escopo:
- Os componentes (`<MesaNaCena/>`, `<FundoCss/>`, `<AmbienteDaMesa/>`, `<PainelDaMesa/>`), `coresDaMesa`, `ocultarPiso`, a conversão pura da mesa importada, `inspecao()` e o `CLAUDE.md`, que são as OS-0036 e 0037.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- `git mv`: os 5 `table*.ts` para `domain/`, `tableStore.ts` → `repository.ts`, `tableState.ts` → `store.ts` (`createStore` de `zustand/vanilla`, lógica igual), `tests/table.test.ts` → `src/modules/mesa/tests/`. Novos: `contracts.ts` (`TableState`, tipos do tema), `index.ts`, `cena.ts`, `ui/useMesa.tsx`.
- `index.ts`: `mesa()`, `load/apply/edit/copy/remove/reset/setColors` (desestruturadas de `store.getState()`, como em `arremesso`) e o domínio que o legado usa. O `tableFile` só sai por `carregarArquivoDeMesa`. As ações continuam também no estado, então `useMesa()` sem seletor serve ao `TablePanel`.
- Pontos de chamada: `App` chama `load` (como `carregarMesa`); `Cena`, `Backdrop`, `Omens`, `Tray` e `TablePanel` usam `useMesa`/`mesa()`. `Tray` e `TablePanel` carregam o `tableFile` por `carregarArquivoDeMesa()`.
- A parte "kraken shards" do `table.test.ts` ficou em `tests/krakenShards.test.ts`, sem mudar asserção. No `table.test.ts` só mudaram os imports.
- E2E: `STATE = '/src/modules/mesa/store.ts'` e `store.getState()`. O `--list` lista os 2 testes.
- Arquitetura: saíram as 3 exceções (`tables`, `mesa.ativa`, `zustand` do `tableState`). O `leitor.test.ts` não precisou mudar.
- Build: `index` inicial de 689,97 para 689,84 kB (gz de 228,28 para 228,30); `tableFile` de 42,36 para 42,40 kB, ainda em chunk próprio; o `GLTFExporter` só aparece no `tableFile`; worker em 2.379,76 kB, igual.
- Gate: `npm test` com 53 arquivos e 492 testes; `test:server` com 23; build passa; lint passa sem apontamentos.
- Pendente, fora do escopo de escrita: `docs/contexto/armadilhas.md:16` ainda cita `tableStore.ts`, e `docs/mapa-modulos.md:69` ainda cita `useTable.colors`/`tableState`.
- Usei `git add -N` nos arquivos novos só para tirar o `git diff -M --stat`.

## Parecer do revisor

**APROVADO.**
- **`store.ts`:** tem o mesmo corpo do `tableState.ts`, com os 300 ms, o `pagehide`, o `remove`, a mesa padrão e `mesa.ativa`. O `set`/`get` vanilla equivalem ao `create`.
- **`domain/` e `repository.ts`:** só mudaram imports.
- **`useMesa()` sem seletor:** assina o mesmo que o `useTable()` assinava.
- **`tableFile`:** o chunk é o único com `GLTFExporter`.
- **`defineStore('tables')`:** fica no chunk inicial, por caminho estático.
- **Testes:** nenhuma asserção mudou, e `krakenShards.test.ts` ficou idêntico.
- **Arquitetura:** limpa, e `mesa` chega a `arremesso` pela porta.

Observações:
1. `mapa-modulos.md:96` (`Omens → useTable.colors`) foi corrigido pelo orquestrador, junto com `armadilhas.md:16`, `mapa-modulos.md:69` e `apresentacao.md:52`.
2. A spec chama `carregar()`, e a porta expõe `load` (decisão 1). Fica anotado para a OS-0037.
3. O `index.ts` exporta o tipo `TableState` sem uso fora do módulo. Inofensivo.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB; `tableFile` sob demanda |
| `npm run lint` | ✅ |
| `npm test` | ✅ 53 arquivos, 492 testes |
| `npm run test:server` | ✅ 23 testes |
