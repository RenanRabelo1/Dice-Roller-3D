# Ordem de serviço: fim do `kinds.ts`, do `omenD20s` e do invólucro de `omenOf`

Ordem: OS-0015 (extração nº 1, `regras`, parte 2 de 3)
Módulo: `regras`. Aqui o módulo só é consumido; a ordem altera os pontos de chamada no legado.

Escopo de escrita:
- legado:
  - `src/dice/kinds.ts` (será removido)
  - `src/dice/custom.ts`, `src/dice/importer.ts`, `src/dice/polyhedra.ts` (só os imports de `kinds`)
  - `src/dice/omen.ts`, `src/dice/omenTest.ts`, `src/dice/notation.ts` (só o total)
  - `src/api/history.ts`, `src/store.ts` (só o `publish`)
- testes:
  - `tests/custom.test.ts`, `tests/omen.test.ts` (só os casos que usam `omenOf` com importado, se houver)
  - `src/modules/regras/tests/pressagio.test.ts`
- docs: `docs/contexto/dados.md` e `docs/contexto/visao-geral.md`, só o que cita `kinds.ts` ou `omenD20s`

Objetivo: o legado passa a consumir `regras` pela porta (`src/modules/regras/index.ts`).
- `src/dice/kinds.ts` deixa de existir.
- O `Set` `omenD20s` deixa de existir: `isD20` passa a consultar o registro de importados, como manda o ADR 0003 ponto 6 e a spec de `regras`.
- O `omenOf` de `omen.ts` (o invólucro) sai: quem chama normaliza os tipos antes.
- O comportamento não muda.

Leia antes de começar:
- `docs/specs/regras.md`, a seção "Sobre `omenD20s`" e "Pontos de chamada"
- `src/modules/regras/CLAUDE.md` e `src/modules/regras/contracts.ts`
- `src/dice/kinds.ts`, `src/dice/omen.ts`, `src/dice/omenTest.ts:1-25`, `src/dice/custom.ts:1-60`
- `src/dice/notation.ts:37-50`, `src/store.ts` no `publish` (`grep -n "omenOf"`)
- os imports dos demais arquivos do escopo

Entregáveis:

1. **Remover `src/dice/kinds.ts`.** Quem o importa passa a importar de `../modules/regras/index.ts`: `custom.ts`, `importer.ts`, `polyhedra.ts` e `api/history.ts`.
   - `polyhedra.ts` continua reexportando `BASE`, `KINDS`, `BuiltinKind`, `DieKind`, `Shape` e `MAX_DICE` para os seus importadores atuais. A origem desses reexports passa a ser `regras`.
   - Marque esses reexports com `// ponte até a OS-0016`.
2. **Acabar com `omenD20s`.** Saem as linhas de `add` e `delete` em `custom.ts` (`registerCustom`, `unregisterCustom`).
   - Em `omen.ts`, `isD20(kind)` passa a ser `kind === 'd20' || (isCustom(kind) && tipoParaPresagio(customDie(kind) ?? { kind }) === 'd20')`, com `customDie` vindo de `custom.ts`. O resultado é o mesmo de hoje: `omenD20s` era exatamente o conjunto dos importados com `base === 'd20' && omens`, recalculado a cada registro, edição e remoção.
   - Antes de importar, confira que `omen.ts → custom.ts` não cria ciclo. A suíte `tests/arquitetura` diz. Se criar, pare e reporte.
3. **Tirar o invólucro de `omenOf`.**
   - `omen.ts` deixa de exportar `omenOf`. Ficam `OMEN_MS`, `DUALITY_HIT`, `omenMs`, `isD20` e a reexportação de `Omen`/`OmenKind`/`omenKind`, esta marcada `// ponte até a OS-0016`.
   - Quem chamava passa a chamar `omenOf` de `regras` com os tipos normalizados:
     - **`store.ts` (`publish`):** `omenOf(omenKinds(s.dice), results)`, com `omenKinds` de `omenTest.ts`.
     - **`omenTest.ts` (`plays`):** já recebe `kinds` normalizados. Troque o import para `regras`.
   - O `omenKinds` continua em `omenTest.ts`. Ele é a normalização do legado, que um dia vai para `dados`.
4. **`notation.ts:43`.** A soma "sem moedas" passa a usar `total` de `regras`. A condição de "só moedas mostra as faces" e o texto ficam iguais.
5. **Testes.**
   - `tests/custom.test.ts:53-56,118`: continuam verificando `isD20` (agora pelo registro). Os casos de `omenOf` com importado passam a normalizar com `omenKinds` antes.
   - `tests/omen.test.ts`: os casos de `omenOf` que só usam embutidos passam a importar de `regras`. As asserções não mudam.
   - `src/modules/regras/tests/pressagio.test.ts`: acrescente falha e dualidade com o importado normalizado. É a lacuna que o revisor apontou na OS-0014.
6. **Doc.** `docs/contexto/dados.md` e `docs/contexto/visao-geral.md` deixam de citar `kinds.ts` e `omenD20s`.

Critérios de aceite:
- `src/dice/kinds.ts` não existe.
- `grep -rn "omenD20s" src tests` volta vazio.
- `grep -rn "dice/kinds\|from './kinds'" src tests e2e` volta vazio. As fixtures de `tests/arquitetura/` têm o próprio `kinds.ts` e não contam.
- `omen.ts` não exporta `omenOf`, e todo `omenOf` vem de `regras`.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A suíte de arquitetura passa sem ciclo novo.
- `npm run e2e` completo, que o orquestrador roda. Os casos que mais importam:
  - `omen.spec` (incluindo os botões de teste);
  - `import.spec` (importado d20 com e sem `omens`);
  - `chat.spec` (o total).

Fora do escopo:
- Trocar os importadores de `MAX_DICE`, `Omen`, `OmenKind` e `omenKind` que passam por `polyhedra.ts`/`omen.ts`. Isso é a OS-0016.
- Mover `OMEN_MS`, `omenMs` e `isD20` para fora do legado. Isso vai com `pressagios` e `dados`.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

`git rm src/dice/kinds.ts`. Arquivos alterados:
- `custom.ts`: saem o `add`/`delete` de `omenD20s`.
- `importer.ts`, `polyhedra.ts` e `api/history.ts`: importam de `regras`; os reexports de `polyhedra.ts` estão marcados `// ponte até a OS-0016`.
- `omen.ts`: novo `isD20`; sai o `omenOf`; a reexportação está marcada.
- `omenTest.ts`: o `omenOf` vem de `regras`.
- `store.ts`: o `publish` usa `omenOf(omenKinds(s.dice), results)`.
- `notation.ts`: o total usa `total` de `regras`.
- Testes: `custom.test.ts` e `omen.test.ts` só mudam nos imports e na normalização com `omenKinds`; `pressagio.test.ts` ganha falha e dualidade com o importado.
- Docs: `dados.md` e `visao-geral.md`.

Nenhuma linha de comportamento mudou.

**Divergência:** a fórmula da ordem, `tipoParaPresagio(customDie(kind) ?? { kind })`, não compila, porque `CustomDie` não tem `kind`. O dev usou `tipoParaPresagio({ kind, ...customDie(kind) })`, que tem a mesma semântica. A falha foi da ordem, não do dev.

Verificação do dev:
- `npm test`: 416;
- `test:server`: 23;
- build e lint: ok;
- `omen` + `import` + `chat`: 30/30.

## Parecer do revisor

**APROVADO.**

O spread não sobrescreve `kind`. Sem registro, o resultado é `false`, como o `Set` vazio dava.

`isD20` dá o mesmo conjunto que o `omenD20s` dava em todos os casos:
- registro e hidratação;
- edição (`updateCustom` registra um objeto novo);
- remoção;
- base diferente de d20 com `omens` ligado;
- embutido;
- worker (que recebe `bias.kinds` já normalizados).

O `publish` faz o mesmo `map` do invólucro antigo, e o `total` de `notation.ts` é idêntico. Itens da seção 7: 1, 2, 4, 5, 6, 7, 8 e 9 ✅; o 3 não se aplica.

Observações atendidas pelo orquestrador neste commit:
- `server/README.md` ainda citava `kinds.ts`/`omen.ts`;
- nova armadilha: o servidor só importa `regras/index.ts`, porque `omen.ts` agora puxa `three` via `custom.ts`.

## Gate

2026-11-13, pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 34 arquivos, 416 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e`, 1ª rodada | interrompida pelo Claude Code por falta de memória: 72 passaram; `smoke.spec.ts:8` marcou 3 h, sinal de que a máquina travou ou suspendeu |
| `npm run e2e`, com memória liberada | ✅ 98 passaram (19,8 min) |
