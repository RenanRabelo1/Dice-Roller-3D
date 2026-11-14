# Ordem de serviço: `dados`, pontos de chamada e fim das pontes

Ordem: OS-0022 (extração nº 3, `dados`, parte 3 de 4)
Módulo: `dados` (consumido)
Escopo de escrita:
- **Pontes:** `src/dice/polyhedra.ts`, `custom.ts`, `read.ts` e `symbols.ts` são removidos com `git rm`. Em `src/scene/Die.tsx`, `src/dice/importer.ts` e `src/dice/notation.ts`, saem só os reexports.
- **Pontos de chamada:** todo arquivo de `src/`, `tests/` e `e2e/` que recebe algo de `dados` por essas pontes, alterado só nos imports. Ache-os com `grep`. Pelo levantamento do orquestrador, em `src/` são: `app/Cena.tsx`, `app/historico.ts`, `dice/customStore.ts`, `dice/importer.ts`, `dice/notation.ts`, `dice/omen.ts`, `dice/omenTest.ts`, `physics/presim.ts`, `physics/presim.worker.ts`, `scene/Hand.tsx`, `scene/showcase.ts`, `store.ts`, `ui/Controls.tsx`, `ui/ImportDie.tsx` e `ui/InkChoice.tsx`.
- **`src/dice/omen.ts`:** o `isD20`.
- **`src/dice/importer.ts`:** o comentário do `LIMITS`.
- **Docs:** `docs/contexto/dados.md`, `visao-geral.md`, `arremesso.md` e `apresentacao.md`, onde citam os arquivos que saem.

**Escopo ampliado pelo orquestrador (2026-11-14), depois do levantamento do dev:**
- **Mais pontos de chamada:**
  - em `tests/`: `custom`, `history`, `importer`, `kraken`, `read`, `showcase` e `helpers/models.ts`;
  - em `e2e/`: `import.spec.ts`;
  - `src/scene/Hand.tsx` importa de `./Die`.
- **`notation.ts`:** as duas chamadas internas de `dieName` (linhas 32 e 46) passam a ser `nomeDoTipo`.
- **`src/ui/Controls.tsx:21`:** a expressão `import('../dice/importer')` passa a usar `carregarModelo` e `hasTexture` do `index` de `dados`. O modelo continua sob demanda, porque é o `carregarModelo` que faz o `import()`.
- **`LIMITES_DO_MODELO_SALVO`:** decisão do orquestrador, um acréscimo ao contrato.
  - A constante sai de `domain/modelo.ts` e vai para um arquivo novo e puro, `src/modules/dados/domain/limites.ts`.
  - `modelo.ts` passa a importá-la de lá.
  - O `index.ts` a exporta.
  - Não pode ir para `aparencia.ts`, porque `aparencia.ts → modelo.ts` por `import()` fecharia um ciclo.
  - Entram no escopo `domain/limites.ts`, `domain/modelo.ts` (só o import e a constante) e uma linha no `index.ts`.

Objetivo: ninguém mais recebe nada de `dados` por arquivo do legado. Componentes e hooks vêm de `src/modules/dados/cena.ts`, e o resto vem de `index.ts` (ADR 0010). As pontes das OS-0020/0021 deixam de existir. O comportamento não muda.

**Tamanho.** São cerca de 20 a 25 arquivos, acima dos ~15 do plano §3. Vale a mesma exceção da OS-0016: em cada arquivo só muda a linha de import. Se algum pedir mais que isso, pare e reporte.

Leia antes de começar:
- `src/modules/dados/index.ts` e `src/modules/dados/cena.ts`
- as pontes: `polyhedra.ts`, `custom.ts`, `read.ts`, `symbols.ts`, e os trechos de reexport de `Die.tsx`, `importer.ts` e `notation.ts`
- as linhas de import de cada arquivo do escopo (`grep -n "^import"`)
- `src/dice/omen.ts` e `src/dice/importer.ts:12-16`

Entregáveis:
1. **Imports.** Cada nome que hoje chega por ponte passa a ser importado de `../modules/dados/index` ou, se for componente ou hook, de `../modules/dados/cena`. Siga o estilo de import de cada arquivo:
   - sem extensão em `src/`, a não ser que o arquivo já use `.ts`;
   - em `tests/` e `e2e/`, como os arquivos vizinhos.

   Quem usava `dieName` passa a usar `nomeDoTipo`. Quem usava `modelObject` pela ponte do `importer` passa a usar `carregarModelo`.
2. **Pontes removidas.** Saem `polyhedra.ts`, `custom.ts`, `read.ts` e `symbols.ts`, e os reexports de `Die.tsx`, `importer.ts` e `notation.ts`.
3. **`isD20`** (`omen.ts`). Passa a ser `paraRegras(kind) === 'd20'`, com `paraRegras` vindo de `dados`. O resultado é o mesmo, e é o que `tests/custom.test.ts` prova.
4. **`LIMITS`** (`importer.ts`). Ganha o comentário recíproco: "precisam acompanhar `LIMITES_DO_MODELO_SALVO` de `dados`". Acrescente também um teste em `tests/importer.test.ts` comparando os dois, com `LIMITES_DO_MODELO_SALVO` vindo do `index` de `dados`. Ele vem de `index`, conforme a ampliação acima.
5. **Docs.**
   - Em `dados.md`, o passo "adicionar dado" e as citações de `Die.tsx`/`polyhedra.ts`/`custom.ts` passam a apontar para `src/modules/dados/` (`domain/aparencia.ts`, `scene/GemMaterial.tsx`, `domain/solidos.ts`).
   - Em `visao-geral.md`, a árvore perde `dice/polyhedra.ts`, `custom.ts`, `read.ts` e `symbols.ts` e ganha `modules/dados/`.
   - `arremesso.md` e `apresentacao.md` são corrigidas onde citam esses arquivos.

Critérios de aceite:
- `src/dice/polyhedra.ts`, `custom.ts`, `read.ts` e `symbols.ts` não existem.
- `grep -rn "ponte até a OS-0022" src` volta vazio.
- `grep -rnE "from '[^']*(dice/(polyhedra|custom|read|symbols)|/Die)(\.tsx?)?'" src tests e2e` só mostra imports de `Die` (o componente físico) em quem o desenha, nunca outro nome vindo de `Die`.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa, sem ciclo novo. O worker não cresce além dos 2379,76 kB atuais.
- **Sem E2E**, pela regra de gate. O aceite do `dados` é a OS-0023.

Fora do escopo:
- O evento `catalogoAlterado`, o `forgetModel` chamado por `removerTipo`, a saída das props `custom`/`color` do `Die.tsx`, o `inspecao()` e o `CLAUDE.md` do módulo. Isso é a OS-0023.
- Qualquer mudança além de imports, fora os itens 3 e 4.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

**Primeira rodada:** o dev parou no item 4. `LIMITES_DO_MODELO_SALVO` era local ao `modelo.ts`, que é carregado sob demanda. O dev também levantou pontos de chamada que faltavam na ordem (`tests/`, `e2e/import.spec.ts`, `Hand.tsx` → `./Die`, `dieName` interno, `Controls.tsx:21`). O orquestrador ampliou o escopo e decidiu criar `domain/limites.ts`.

**Feito:**
- **Pontes removidas:** `polyhedra.ts`, `custom.ts`, `read.ts` e `symbols.ts` (com `git rm`), mais os reexports de `Die.tsx`, `importer.ts` e `notation.ts`.
- **Imports trocados para `dados/index` ou `dados/cena`:**
  - em `src/`: `Cena`, `historico`, `customStore`, `omenTest`, `presim`, `presim.worker`, `Hand`, `showcase`, `store`, `ImportDie`, `InkChoice`;
  - em `tests/`: `custom`, `history`, `kraken`, `read`, `showcase`, `helpers/models`;
  - em `e2e/`: `import.spec.ts`.
- **`notation.ts`:** usa `nomeDoTipo`.
- **`Controls.tsx:21`:** `carregarModelo(die).then((o) => setTextured(hasTexture(o)))`.
- **`isD20`:** `paraRegras(kind) === 'd20'`.
- **`LIMITS`:** ganhou o comentário recíproco e o teste de igualdade com `LIMITES_DO_MODELO_SALVO`, que agora está em `domain/limites.ts` e é exportado pelo `index`.
- **Docs:** `dados.md` (incluindo "adicionar dado") e `visao-geral.md`. `arremesso.md` e `apresentacao.md` não citavam os arquivos removidos.

## Parecer do revisor

**APROVADO COM RESSALVAS.** O checklist §7 passou.
- Só mudaram imports, fora as exceções listadas.
- O `isD20` é equivalente, e o `Controls.tsx:21` também.
- O worker continua com 2379,76 kB.

Ressalvas, todas tratadas pelo orquestrador neste commit:
1. **Doc:** `dados.md:99` ainda citava `tipoParaPresagio` no `isD20`. Corrigido para `paraRegras`.
2. **Carga inicial:** o `hasTexture` estático em `Controls.tsx` trouxe `domain/gravacao.ts` para a carga inicial (+0,68 kB, 3703,23 → 3703,91 kB, de 5 para 4 requisições). **Aceito:** o ganho acumulado do `dados` fica em cerca de 1,1 kB, e são 1,12 kB de funções puras.
3. **Chunks:** o chunk `importer` foi absorvido pelo `ImportDie`, que continua sob demanda. Agora só o `ImportDie` importa o `importer`. A lista de chunks das próximas ordens passa a ser `ImportDie`, `tableFile`, `HDRLoader`, `ler` e `modelo`. O ADR 0007 é histórico e não foi editado.
4. **Comentários e docs:**
   - o comentário de `limites.ts` foi reescrito;
   - o de `app/historico.ts`, que falava em "legacy registry", também;
   - `testes.md:123` citava `INK` em `Die.tsx` e agora cita `numeralInk` em `domain/aparencia.ts`;
   - `armadilhas.md:15` citava `custom.ts` e agora cita `src/modules/dados`.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 40 arquivos, 433 testes |
| `npm run test:server` | ✅ 23 testes |
