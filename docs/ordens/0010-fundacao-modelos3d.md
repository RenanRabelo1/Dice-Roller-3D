# Ordem de serviço: `shared/modelos3d` — leitura de GLB e STL com limites por parâmetro

Ordem: OS-0010 (F-6, fundação, dev de shared)

Escopo de escrita:
- novos: `src/shared/modelos3d/index.ts`, `src/shared/modelos3d/ler.ts`, `src/shared/modelos3d/tests/ler.test.ts`
- alterados: `src/dice/importer.ts` (só as linhas 22-92, a leitura do arquivo), `src/scene/tableFile.ts` (só o import e o `catch` de `readTable`)
- docs: `docs/contexto/dados.md` e `docs/contexto/mesa.md`, só onde citam `parseGlb`/`readModel`

Objetivo: a leitura de modelos 3D (GLB e STL, só `data:`/`blob:`) sai de `dice/importer.ts` e vai para `src/shared/modelos3d`, com os limites recebidos por parâmetro (ADR 0008). O `tableFile.ts` passa a usá-la e deixa de identificar o erro pelo nome da classe. O comportamento visível ao jogador não muda.

Leia antes de começar:
- `docs/adr/0008-casca-e-shared-do-cliente.md`, item `modelos3d/`
- `src/dice/importer.ts:1-95`
- `src/scene/tableFile.ts:150-170` e `src/scene/tableImages.ts:6` (`TableError`)
- o uso de `ImportError`, `readModel` e `LIMITS` em `src/ui/ImportDie.tsx` e em `tests/importer.test.ts` (só `grep -n`)

Desenho (decidido pelo orquestrador):

1. **`ler.ts`** recebe o código das linhas 33-92 de hoje: `collect`, `parseGlb` e `readModel`. Ficam iguais, com estas trocas:
   - **`ModelError extends Error`**, a classe de erro da leitura. As mensagens não mudam nenhuma letra:
     - `'O GLB precisa ser autocontido (sem arquivos externos).'`
     - `` `Textura maior que ${n} px no modelo.` ``
     - `'O arquivo …'`
   - **`parseGlb(bytes, textureMax: (mesh: Mesh) => number)`**: o `textureMax` passa a ser obrigatório, porque `shared` não conhece o limite de nenhum domínio.
   - **`readModel(bytes, format, limits: { bytes: number; triangles: number; texture: number })`**: usa os limites recebidos onde hoje usa `LIMITS`.
   - **`ModelFormat`, `formatOf` e `Model`** também vão para `ler.ts`.
2. **`index.ts`** é a porta: reexporta `ModelError`, `ModelFormat`, `formatOf`, `Model`, `parseGlb` e `readModel`.
3. **`dice/importer.ts`** fica dono de `LIMITS` e de `ImportError`, e continua exportando o que exporta hoje, com as mesmas assinaturas:
   - **`readModel(bytes, format)`** chama o `readModel` de `shared/modelos3d` com `LIMITS`. Se receber um `ModelError`, relança `new ImportError(e.message)`, com a mesma mensagem e sem `code`. Os outros erros passam como estão.
   - **`ModelFormat`, `formatOf` e `Model`** passam a ser reexportados de `shared/modelos3d`, para `ImportDie.tsx` e os testes continuarem iguais.
   - **`parseGlb` deixa de ser exportado** pelo `importer`. O único consumidor externo era o `tableFile.ts`.
   - **O resto do arquivo** (linhas 94 em diante) não muda. O `refuse` usado pela detecção de forma continua criando `ImportError`.
4. **`tableFile.ts`** importa `parseGlb` e `ModelError` de `src/shared/modelos3d` e passa o mesmo `textureMax` de hoje. O `catch` passa a testar `e instanceof ModelError` no lugar de `e.constructor.name === 'ImportError'`, com o mesmo `replace('O GLB precisa', 'A mesa precisa')` e o mesmo texto genérico.

   Registre no relatório: no build minificado, o `constructor.name` podia não ser `'ImportError'`, e aí a mesa recusada mostrava a mensagem genérica. Com o `instanceof`, a mensagem específica passa a aparecer também em produção. É a correção que a spec da `mesa` já previa, e não exige mais nada.
5. **Restrições:**
   - `shared/modelos3d` importa só `three` e os loaders de `three/examples`.
   - Nada de `dice/`, de `scene/` nem nome de domínio. Os limites só chegam por parâmetro.

Entregáveis:
1. Os arquivos novos e as alterações acima.
2. `src/shared/modelos3d/tests/ler.test.ts`, em Node, cobrindo com STL gerado no próprio teste:
   - os limites chegam por parâmetro: um limite de bytes ou de triângulos menor recusa com `ModelError` e a mensagem com o número recebido;
   - arquivo vazio e STL inválido dão `ModelError` com as mensagens de hoje;
   - um STL válido devolve `positions`, `triangles` e `object`.

   Se houver um GLB de teste em `tests/` ou em `e2e/`, cubra também a recusa de URL externa e de textura acima do `textureMax`. Se não houver, não crie o fixture e registre no relatório.
3. `tests/importer.test.ts` não muda e continua passando, porque prova que o `importer` mantém as mensagens e o `ImportError`.
4. As docs citadas no escopo são atualizadas.

Critérios de aceite:
- `grep -rn "constructor.name" src` volta vazio.
- `grep -rn "parseGlb" src` só encontra o que está em `src/shared/modelos3d/` e o `tableFile.ts`.
- `grep -n "dice/\|scene/\|LIMITS" src/shared/modelos3d/*.ts` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passando.
- A lista de chunks sob demanda do `vite build` continua com `importer`, `tableFile`, `ImportDie` e `HDRLoader`.
- O `npm run e2e` completo passa, rodado pelo orquestrador. Atenção especial a `import.spec.ts` (importar, calibrar e recusar dados) e a `table.spec.ts` (importar mesa, recusas, ida e volta).

Fora do escopo:
- Qualquer arquivo fora do escopo de escrita, inclusive `ImportDie.tsx` e `TablePanel.tsx`.
- Mudar texto de mensagem, limite numérico ou a ordem das verificações.
- Mover a detecção de forma, a calibração ou o `modelObject`. Isso vai com `meus-dados` e `dados`.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**Arquivos novos:** `src/shared/modelos3d/ler.ts`, `index.ts` e `tests/ler.test.ts` (7 testes, escritos antes do código).

**Arquivos alterados:**
- `dice/importer.ts`: as linhas 22-92 viram um `readModel(bytes, format)` que chama o do `shared` com `LIMITS`. Quando recebe um `ModelError`, relança como `ImportError(e.message)`. `ModelFormat`, `Model` e `formatOf` passam a ser reexportados do `shared`, e `parseGlb` deixou de ser exportado.
- `tableFile.ts`: mudaram só o import e o `catch`.
- `dados.md` e `mesa.md`: ajustados à mudança.

**Comportamento que mudou:** só `tableFile.ts:161`. No build minificado, o `constructor.name` podia não ser `'ImportError'`. Nesse caso, uma mesa recusada por URL externa ou por textura grande mostrava a mensagem genérica. Com o `instanceof ModelError`, a mensagem específica ("A mesa precisa…" ou "Textura maior que…") passa a aparecer também em produção. É a correção que a spec da `mesa` já previa.

**Fixture GLB:** não há `.glb` em `tests/` nem em `e2e/`. A recusa de URL externa e o `textureMax` ficaram sem teste unitário em `ler.test.ts`. A URL externa continua coberta pelo `tests/importer.test.ts:62`, e o `textureMax` da mesa pelo `table.spec.ts`.

**Verificação do dev:**

| Verificação | Resultado |
|---|---|
| `npm test` | 366 testes, `importer.test.ts` sem alteração |
| build e lint | ok |
| `test:server` | 23 testes |
| `import` + `table` | 19/19 |

## Parecer do revisor

**APROVADO.**
- ✅ (a) Só arquivos do escopo.
- ✅ (b) `ler.ts` só importa `three` e os loaders. `parseGlb` exige `textureMax`.
- ✅ (c) O teste prova que os limites vêm por parâmetro: um limite de 3 MB aparece na mensagem, e um de 4 triângulos também.
- ✅ (d) Comparado linha a linha com o original. O `ModelError` lançado no `parseGlb` passa direto pelo `catch` do `readModel`, como o `ImportError` passava. Nenhum consumidor que testava `instanceof ImportError` ou `.code` recebe `ModelError` cru.
- ✅ (e) Docs atualizadas.
- ✅ (f) Os três greps batem.

Observação sem bloqueio: falta um fixture GLB com textura para cobrir o `textureMax` em teste unitário.

## Gate

2026-11-13, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ Os chunks sob demanda continuam fora do `index.html`: `importer`, `ImportDie`, `tableFile`, `HDRLoader` e o novo `ler`, comum aos três primeiros, com os loaders, 50 KB. A carga inicial é igual: `index` + `three.module` + `plataforma` somam 3.702 KB, contra 3.701 KB antes, só repartidos. O `importer` caiu de 60 para 11 KB. |
| `npm run lint` | ✅ |
| `npm test` | ✅ 28 arquivos, 366 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 passaram (18,2 min) |
