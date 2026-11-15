# Ordem de serviço: `meus-dados`, importador e assistente

Ordem: OS-0028 (extração nº 5, `meus-dados`, parte 2 de 3)
Módulo: `meus-dados`
Escopo de escrita:
- `src/modules/meus-dados/`: `domain/*.ts`, `ui/*.tsx`, `index.ts`, `cena.ts`, `contracts.ts` (só para acrescentar) e `tests/`.
- **Legado movido** com `git mv`:
  - `src/dice/importer.ts` vai para `src/modules/meus-dados/domain/importador.ts`;
  - `src/ui/ImportDie.tsx` vai para `src/modules/meus-dados/ui/AssistenteDeImportacao.tsx`;
  - `src/ui/InkChoice.tsx` vai para `src/modules/meus-dados/ui/InkChoice.tsx`.
- **Pontos de chamada:**
  - `src/ui/Controls.tsx`, só os imports e o `lazy`;
  - `tests/custom.test.ts`, `tests/read.test.ts` e `tests/helpers/models.ts`;
  - `e2e/import.spec.ts`, só os imports;
  - `tests/importer.test.ts`, que vai para o módulo com `git mv`.
- **Arquitetura:** `tests/arquitetura/leitor.test.ts`, a aresta esperada de `import()` dinâmico (`Controls.tsx → ImportDie.tsx`).
- **Docs:**
  - o comentário de `src/modules/dados/domain/limites.ts`, que cita `src/dice/importer.ts`;
  - `docs/contexto/dados.md` e `visao-geral.md`, onde citam os arquivos movidos.

Objetivo: o importador (detecção, sólido ideal, forma livre, calibração, `LIMITS`) e o assistente de importação passam a ser do `meus-dados`.
- A montagem do `CustomDie` vira uma função pura testada.
- As duas duplicações de `regras` registradas na spec somem.
- O assistente continua **sob demanda**: nada do importador entra na carga inicial.

O comportamento e o DOM não mudam.

Leia antes de começar:
- `docs/specs/meus-dados.md`, inteiro
- `src/modules/meus-dados/index.ts`, `cena.ts` e `store.ts`
- `docs/adr/0007-diferencas-de-stack.md`, no ponto sobre chunks sob demanda e `carregarImportador`
- `src/dice/importer.ts:1-35` e a lista de `export` (`grep -n "^export"`)
- `src/ui/ImportDie.tsx:1-15` e `:250-285`
- `src/ui/InkChoice.tsx`, inteiro, e `src/ui/Controls.tsx:1-30`
- os imports dos testes do escopo e de `e2e/import.spec.ts`

Decisões do orquestrador:
1. **Sob demanda (ADR 0007).**
   - O `index.ts` **não** reexporta nada de `domain/importador.ts` estaticamente. Ele exporta `carregarImportador = () => import('./domain/importador.ts')` e, se precisar, os tipos com `export type`.
   - Dentro do módulo, o assistente importa `domain/importador.ts` diretamente.
   - O `cena.ts` exporta `AssistenteDeImportacao` como `lazy(() => import('./ui/AssistenteDeImportacao.tsx').then(...))`, e o `Controls.tsx` usa esse.
   - O `cena.ts` não pode importar estaticamente o assistente nem o importador.
   - No `vite build`, confira que existe um chunk sob demanda do assistente (com o importador dentro) e que `index`, `dados`, `plataforma` e `three` não contêm o importador. Mostre os chunks.
2. **Testes fora do módulo.**
   - `tests/helpers/models.ts`, `tests/custom.test.ts`, `tests/read.test.ts` e `e2e/import.spec.ts` passam a obter as funções do importador com `const { … } = await carregarImportador();` (top-level await), importando de `src/modules/meus-dados/index.ts`.
   - Confira que o Playwright carrega o arquivo com `npx playwright test --list e2e/import.spec.ts`, que só lista, sem abrir navegador. Isso é permitido nesta ordem.
   - Se o top-level await não funcionar em algum deles, pare e reporte.
3. **`tests/importer.test.ts`** vai para `src/modules/meus-dados/tests/importador.test.ts` com `git mv`. Ele importa `../domain/importador.ts` diretamente, por ser de dentro do módulo, e as asserções não mudam. O teste `LIMITS` × `LIMITES_DO_MODELO_SALVO` vai junto.
4. **`montarDado`** (função pura nova, `domain/montagem.ts`, exportada pelo `index`).
   - Recebe o que o assistente tem: nome, apelido, `imp`, o arquivo, `printed`, `omens`, `color`, `ink`, `surface`, `textured`, o `poly` final. Devolve o `CustomDie`.
   - As regras são as de `ImportDie.tsx:268-273`:
     - `omens` só em base d20;
     - cor só em STL;
     - tinta só se `printed`; com textura, só `escura` ou `nenhuma`;
     - acabamento só em STL.
   - `id` e `createdAt` entram por parâmetro, para o teste ser determinístico. O assistente passa `crypto.randomUUID()` e `Date.now()`.
   - Testes com os quatro casos de regra.
   - A renumeração (`renumbered`) continua no assistente.
5. **"Com textura, só escura ou nenhuma" num lugar só.**
   - Ache onde mais essa regra aparece (`InkChoice.tsx`, `Controls.tsx` `InkButton`): `grep -n "hasTexture\|textured" src`.
   - Crie `tintaPermitida(ink, textured)` (ou `tintasPermitidas(textured)`) em `domain/montagem.ts`. `montarDado` e quem oferece as opções a usam.
   - Se a mudança no `Controls.tsx` passar de trocar uma expressão, pare e reporte.
6. **`FACES`** (`importer.ts:18`, cópia de `regras.SIDES` para d4–d20) sai, e no lugar dele entra `SIDES` de `regras`.
7. **Nomes.** O `ImportDie` vira `AssistenteDeImportacao` (nome da spec), e o resto dos nomes do importador fica igual. O `InkChoice` fica com o nome.

Entregáveis:
1. Os três arquivos movidos, com os imports ajustados para o módulo.
2. `domain/montagem.ts` com `montarDado` e a regra da tinta, e testes.
3. `index.ts` com `carregarImportador` e `montarDado`, e `cena.ts` com o `AssistenteDeImportacao` lazy e o `InkChoice`.
4. Os pontos de chamada, os testes e o `leitor.test.ts` ajustados.
5. Docs.

Critérios de aceite:
- `src/dice/importer.ts`, `src/ui/ImportDie.tsx` e `src/ui/InkChoice.tsx` não existem.
- `grep -rn "FACES" src/modules/meus-dados` volta vazio.
- O `vite build` mostra o chunk sob demanda do assistente, e a carga inicial não cresce mais que cerca de 1 kB. Mostre os tamanhos de `index`, `dados`, `plataforma` e `three`, antes e depois.
- Os testes movidos passam sem mudar asserções. Mostre o `git diff -M --stat`.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa: sem ciclo, `index` sem React, módulo sem legado.
- O worker não cresce além de 2379,76 kB.
- **Sem E2E**, a não ser o `--list` da decisão 2.

Fora do escopo:
- O grupo "Meus dados" do `Controls` (`InkButton`, lixeira, "Importar dado"), o `inspecao()` e o `CLAUDE.md`, que são a OS-0029.
- Mudar texto, classe ou estrutura do assistente.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Movidos com `git mv`: `importer.ts` → `domain/importador.ts`, `ImportDie.tsx` → `ui/AssistenteDeImportacao.tsx`, `InkChoice.tsx` → `ui/InkChoice.tsx`, `tests/importer.test.ts` → `tests/importador.test.ts`. Novos: `domain/montagem.ts` (`montarDado`, `tintaPermitida`) e `tests/montagem.test.ts`, escrito antes (6 testes vermelhos, depois verdes). `PedidoDeMontagem` acrescentado em `contracts.ts`.
- `index.ts`: `montarDado`, `tintaPermitida`, `carregarImportador = () => import('./domain/importador.ts')` e só tipos do importador. `cena.ts`: `InkChoice` e `AssistenteDeImportacao` com `lazy`.
- `FACES` saiu e `SIDES` de `regras` entrou. A lista local `SIDES` (bases d4–d20) virou `BASES` para não colidir. `omens` usa `regras.tipoParaPresagio`.
- "Com textura, só escura ou nenhuma" está só em `tintaPermitida`: `montarDado`, a cor da prévia do assistente (`:134`) e o `InkChoice` (filtro e opção mostrada). O `Controls.tsx` não precisou mudar a regra.
- `Controls.tsx`: imports, o `lazy` removido (e `lazy` do import do React) e a tag `<ImportDie>` virou `<AssistenteDeImportacao>`.
- `tests/helpers/models.ts`, `custom.test.ts`, `read.test.ts` e `e2e/import.spec.ts` usam top-level await em `carregarImportador()`, e funcionou nos quatro. O `--list` listou 9 testes.
- `importador.test.ts`: só os imports mudaram, mais o `FACES` local do teste trocado por `SIDES` de `regras` (mesmos valores) para o grep de aceite voltar vazio.
- Build antes → depois: `index` 2.928,54 → 2.928,94 kB (+0,40); `dados` 13,08 → 13,08; `three` 744,42 → 744,42; worker 2.379,76 → 2.379,76. Não existe chunk `plataforma`, nem antes nem depois. Sob demanda: `ImportDie` 40,69 → `AssistenteDeImportacao` 40,57 kB, com o importador dentro (as mensagens dele só aparecem nesse chunk). `tableFile`, `HDRLoader`, `ler`, `modelo` e `BufferGeometryUtils` (19,47 → 19,54) continuam lá. O importador não tem chunk próprio, nem antes nem agora.
- Gate: `npm test` 49 arquivos e 477 testes; `test:server` 23; `build` e `lint` ok. Sem E2E além do `--list`.

## Parecer do revisor

**APROVADO COM RESSALVAS.** O checklist §7 passou.
- **Importador sob demanda:** as mensagens dele só aparecem no chunk `AssistenteDeImportacao`, e `cena.ts`/`index.ts` só o carregam por `import()`.
- **`montarDado`:** equivale ao HEAD. Com `tipoParaPresagio`, o `omens` dá o mesmo que `base === 'd20' && omens` em todas as bases.
- **`tintaPermitida`:** é o único lugar da regra da tinta com textura.
- **Arquivos movidos:** só mudaram imports, `FACES`→`SIDES`, `SIDES`→`BASES` e o nome do componente; o JSX é idêntico.
- **Testes e build:** as asserções não mudaram, o top-level await funciona nos quatro arquivos e o `--list` lista os 9 E2E.
- **Tamanhos:** o `index` ficou com +0,40 kB, e `dados`, `three` e o worker ficaram iguais.

Ressalvas, corrigidas pelo orquestrador:
1. `docs/contexto/testes.md:21` citava o `import()` de `ImportDie`.
2. `src/scene/inkGlow.ts:6` dizia que o `dentTester` ficava em `importer.ts`.
3. `src/ui/Controls.tsx` tinha duas linhas em branco seguidas.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB; assistente sob demanda |
| `npm run lint` | ✅ |
| `npm test` | ✅ 49 arquivos, 477 testes |
| `npm run test:server` | ✅ 23 testes |
