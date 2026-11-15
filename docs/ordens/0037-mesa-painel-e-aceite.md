# Ordem de serviço: `mesa`, painel, conversão da mesa importada, inspeção e CLAUDE.md

Ordem: OS-0037 (extração nº 7, `mesa`, parte 3 de 3)
Módulo: `mesa`
Escopo de escrita:
- `src/modules/mesa/`: `ui/PainelDaMesa.tsx` (novo), `domain/importacao.ts` (novo), `index.ts`, `cena.ts`, `contracts.ts` (só para acrescentar), `tests/` e `CLAUDE.md` (novo).
- **Legado:**
  - `src/ui/TablePanel.tsx` vai para `src/modules/mesa/ui/PainelDaMesa.tsx`, com `git mv`;
  - `src/ui/Controls.tsx`, só o import e a tag.
- **Casca:**
  - `src/app/Cena.tsx`, o `table()` do test hook (decisão 3);
  - `src/App.tsx`, só o nome de `carregar`, se mudar.
- **Docs:** `docs/contexto/mesa.md` sai, e o conteúdo vai para o `CLAUDE.md` e o `NOTAS.md` do módulo (`NOTAS.md` entra no escopo). Também os links para ele (`grep -rn "contexto/mesa.md" docs CLAUDE.md src`, fora de `docs/ordens`, `docs/diagnostico*` e `docs/superpowers`).

Objetivo: fechar a `mesa`.
- O painel "Personalizar mesa" passa a ser do módulo.
- A conversão "mesa importada → tema" vira uma função pura testada.
- O test hook `table()` passa a vir do `inspecao()` do módulo.
- O módulo ganha `CLAUDE.md` e `NOTAS.md`.

O DOM e o comportamento não mudam.

Leia antes de começar:
- `docs/specs/mesa.md`, inteiro
- `src/modules/mesa/index.ts`, `cena.ts`, `contracts.ts` e `store.ts`
- `src/ui/TablePanel.tsx`, inteiro (198 linhas)
- `src/app/Cena.tsx`, no `table()` (linhas 139-154)
- `docs/contexto/mesa.md`, inteiro
- `src/modules/arremesso/CLAUDE.md` e `NOTAS.md`, como modelo
- `src/modules/meus-dados/tests/componentes.test.ts`, como modelo de teste de DOM

Decisões do orquestrador:
1. **`PainelDaMesa`.** É o `TablePanel` movido, com o mesmo código e o mesmo DOM, a não ser pela decisão 2. O `Controls` o usa no mesmo lugar.
   - Teste de DOM: capture **antes** de mexer o HTML do painel aberto e fechado, com a mesa padrão e com uma salva, e compare depois.
   - Se o SSR não renderizar algo (por exemplo `inert`), registre no relatório.
2. **`temaDaMesaImportada`** (`domain/importacao.ts`, exportada pelo `index`). É a função pura que hoje está dentro de `importFile` no `TablePanel`, nas linhas de `const background` e `const next`.
   - Ela recebe `{ read, fileName, bytes, atual: Background, id, createdAt, colors }` e devolve o `TableTheme`.
   - `id` e `createdAt` entram por parâmetro, para o teste ser determinístico. O painel passa `crypto.randomUUID()` e `Date.now()`.
   - A expressão é a mesma de hoje, sem mudança. Os casos de teste são:
     - com `extras` e fundo `image`;
     - com `extras` e fundo `panorama`, com e sem `backdrop`;
     - com `extras` e fundo `color`;
     - sem `extras`, com `defaultPanorama`;
     - sem nada (mantém o fundo atual);
     - nome com mais de 40 caracteres;
     - nome vindo do arquivo.
3. **`inspecao()`.** O corpo de `table()` (Cena.tsx:139-154) passa ao módulo como `inspecao(scene, programas)`, que recebe a cena e a contagem de programas, porque a casca tem o `gl.info`. O resultado tem o mesmo formato, e o `DiceHook` não muda. A casca chama `table: () => inspecao(scene, info.current.programs?.length ?? 0)`. Use outro nome no import se colidir.
4. **Nome `carregar`.** A spec chama de `carregar()` o que hoje é o `load` do store. O `index.ts` passa a exportar `carregar` (o `load`), e o `App.tsx` o usa. O `load` continua no estado, como ação.
5. **`CLAUDE.md` e `NOTAS.md`.**
   - O `CLAUDE.md` tem os cinco blocos da spec, entre 30 e 50 linhas, com os nomes reais. Ele diz:
     - as duas portas;
     - o `tableFile` só por `carregarArquivoDeMesa`;
     - o `repository.ts` estático (`defineStore`);
     - `ocultarPiso`, chamado pelo legado de `pressagios` (`QuebraDaMesa`);
     - `coresDaMesa`;
     - que a casca decide `podeTrocar`;
     - o que o módulo possui: o store, `tables`, `mesa.ativa` e os caches.
   - O detalhe de `docs/contexto/mesa.md` vai para `NOTAS.md`. `docs/contexto/mesa.md` sai.

Entregáveis:
1. `PainelDaMesa` e o teste de DOM.
2. `temaDaMesaImportada` com testes.
3. `inspecao()` e o test hook.
4. `carregar`.
5. `CLAUDE.md`, `NOTAS.md` e as docs.

Critérios de aceite:
- `src/ui/TablePanel.tsx` não existe, e `docs/contexto/mesa.md` também não.
- `grep -rn "useMesa\|mesa()" src --include=*.ts --include=*.tsx | grep -v src/modules/mesa` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O `tableFile` continua sob demanda, o `index` fica sem React, o worker não cresce e a arquitetura passa.
- **Sem E2E no dev.** O orquestrador roda o E2E completo de aceite.

Fora do escopo:
- A regra de quebra e os cacos do kraken, que são de `pressagios`.
- O CSS.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Fixture capturada antes da mudança: `tests/fixtures/painel-antes.json`, com 4 casos (padrão e salva, cada um fechado e aberto), gerada por um teste temporário que já foi apagado. O SSR não clica, então `tests/painel.test.ts` mocka o `useState` do React: o único `useState(false)` (`open`) vira `true` nos casos abertos. O SSR renderiza `inert=""`, e o teste confere isso.
- `git mv` de `src/ui/TablePanel.tsx` para `ui/PainelDaMesa.tsx`. Mudaram só os imports (`../index.ts` e `./useMesa.tsx`), o nome da função e o `importFile`, que agora chama `temaDaMesaImportada`. O DOM é igual à fixture. No `Controls`, só o import e a tag.
- TDD: `tests/importacao.test.ts` foi escrito primeiro (8 casos, falhavam com "not a function"), depois `domain/importacao.ts`. A expressão é a mesma de antes; só os nomes mudaram (`bg` virou `atual`, `file.name` virou `fileName`). `read` é tipado como `Pick<ImportedTable, ...>`, com `import type` para não puxar o `tableFile`.
- `inspecao(scene, programas)` está no `index.ts`, como no `meus-dados`, com o corpo de `table()` sem mudança. O tipo `MesaInspecionada` foi para `contracts.ts`, junto com o reexport de `MesaImportada`. A casca importa `inspecao as inspecaoDaMesa` e tirei os imports de three que ficaram sem uso (`Box3`, `Vector3`, `Object3D`).
- `carregar` (`load as carregar`) entra no `index` no lugar de `load`. O `App.tsx` usa `carregar as carregarMesa`, porque o nome colide com o `carregar` de `meus-dados`.
- Docs: o `CLAUDE.md` do módulo tem 32 linhas. `docs/contexto/mesa.md` foi para `NOTAS.md` com `git mv`, com o cabeçalho e a tabela de arquivos atualizados. Links atualizados no `CLAUDE.md` raiz e no `backlog.md`, e também os "ver mesa.md"/"→ mesa.md" sem caminho em `apresentacao.md`, `armadilhas.md` e `visao-geral.md`. No `visao-geral.md` também saíram o "(em extração)" e a linha do `TablePanel`.
- Gate: `npm test` 507/507, `test:server` 23/23, build ok (worker 2.379,76 kB, igual; `tableFile` 42,40 kB em chunk próprio, igual; `index` 690,15 kB, +0,14 kB), lint sem avisos e greps de aceite vazios. E2E não rodados.
- Pendências do orquestrador: o status `pendente` da `mesa` em `docs/mapa-modulos.md` e a lista "Já foram extraídos" no `CLAUDE.md` raiz.

## Parecer do revisor

**APROVADO COM RESSALVAS** (revisão da OS e auditoria de aceite da `mesa`).

**Revisão:**
- **`PainelDaMesa`:** é o `TablePanel` com a conversão trocada por `temaDaMesaImportada`. A expressão é a mesma, e os 8 testes cobrem a decisão 2.
- **DOM:** idêntico em 4 estados, aberto e fechado, numa comparação independente. Desta vez o painel aberto foi gerado trocando o `useState` no fonte, sem mock.
- **`inspecao(scene, programas)`:** é o `table()` campo a campo.
- **`carregar`:** é o `load`.
- **`CLAUDE.md`:** 32 linhas, com os 5 blocos.

**Auditoria:**
- A conversão é uma função pura testada.
- `tables` e `mesa.ativa` só são acessados no módulo, fora o E2E do esquema do banco.
- `useTable` não existe mais em lugar nenhum.
- O chunk `tableFile` existe.
- Tudo o que a spec "Expõe" existe, com os mesmos nomes.

**Ressalvas, corrigidas pelo orquestrador:**
- `docs/backlog.md:56`, a lista da UI;
- `mesa/CLAUDE.md:17`, o teste compara com a fixture.

**Observação:** o mock de `useState(false)` no `painel.test.ts` é frágil se aparecer um segundo `useState(false)`. Fica registrado.

O orquestrador também atualizou o mapa (`mesa` concluído) e o `CLAUDE.md` raiz, e removeu `docs/specs/mesa.md`.

## Gate

2026-11-14, rodado pelo orquestrador. É o **aceite do módulo `mesa`**, com E2E e com a máquina livre.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB; `tableFile` sob demanda |
| `npm run lint` | ✅ |
| `npm test` | ✅ 56 arquivos, 507 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 de 98 (18,3 min) |
