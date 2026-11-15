# Ordem de serviço: imports diretos de `regras` e aceite do módulo

Ordem: OS-0016 (extração nº 1, `regras`, parte 3 de 3)
Módulo: `regras` (consumido)
Escopo de escrita:
- **as pontes:** `src/dice/polyhedra.ts` (linhas 17 e 253) e `src/dice/omen.ts` (linhas 5 e 6)
- **os arquivos que hoje recebem `BASE`, `KINDS`, `BuiltinKind`, `DieKind`, `Shape`, `MAX_DICE`, `Omen`, `OmenKind` ou `omenKind` por essas pontes**, nos imports. Encontre-os com `grep`. Pelo levantamento do orquestrador, são:
  - **em `src/`:** `app/Cena.tsx`, `app/testHook.ts`, `dice/custom.ts`, `dice/notation.ts`, `dice/omenTest.ts`, `dice/read.ts`, `physics/presim.ts`, `scene/Die.tsx`, `scene/Fire.ts`, `scene/fireMotion.ts`, `scene/Hand.tsx`, `scene/krakenMotion.ts`, `scene/Omens.tsx`, `store.ts`, `throw/vortex.ts`, `ui/Controls.tsx`, `ui/ImportDie.tsx`, `ui/OmenOverlay.tsx`;
  - **em `tests/` e `e2e/`:** os que importam esses nomes de `polyhedra`/`omen`.
- **testes:** `tests/omen.test.ts` (a parte de `omenOf`/`omenKind`) → `src/modules/regras/tests/`
- **docs:** `docs/contexto/dados.md` e `docs/contexto/apresentacao.md`, só o que mudou de lugar

Objetivo: ninguém mais recebe símbolos de `regras` por arquivo do legado. Todo consumidor importa de `src/modules/regras/index.ts`, e as pontes das OS-0014/0015 deixam de existir. Os testes puros de presságio passam para dentro do módulo. Com isso a extração de `regras` termina (fase 5, passos 3 e 4).

**Tamanho.** São cerca de 25 arquivos, acima dos ~15 do plano §3. A exceção se justifica porque cada arquivo muda **só na linha de import**, sem nada para ler além dela. Se algum arquivo pedir mais que isso, pare e reporte.

Leia antes de começar:
- `src/modules/regras/CLAUDE.md` e `src/modules/regras/index.ts`
- as linhas de import de cada arquivo do escopo (`grep -n "^import"`)
- `tests/omen.test.ts`

Entregáveis:
1. **Remover os reexports.** Saem `polyhedra.ts:17`, `polyhedra.ts:253` e `omen.ts:5-6`. Os nomes reexportados passam a ser importados de `regras/index.ts` em cada arquivo que os usa. Respeite o estilo de import de cada arquivo:
   - em `src/`, sem extensão;
   - em `omen.ts`, mantenha o `.ts` só se o arquivo já usar;
   - em `e2e/` e `tests/`, como os vizinhos.

   Exemplos: um arquivo que importava `{ MAX_DICE, polyhedron, RADIUS }` de `polyhedra` fica com `{ polyhedron, RADIUS }` de `polyhedra` e `{ MAX_DICE }` de `regras`. Quem importava `{ isD20, type Omen }` de `omen` fica com `{ isD20 }` de `omen` e `type { Omen }` de `regras`.

   O `polyhedra.ts` e o `omen.ts` continuam importando de `regras` o que usam internamente.
2. **Mover os testes puros.** Os casos de `omenOf` e `omenKind` de `tests/omen.test.ts` vão para `src/modules/regras/tests/pressagio.test.ts`, sem duplicar o que já está lá. Os de `omenMs`/`OMEN_MS` (legado, `pressagios`) ficam em `tests/omen.test.ts`. As asserções não mudam.
3. **Docs.** Em `dados.md` e `apresentacao.md`, onde se diz que `KINDS`, `MAX_DICE`, `omenOf` ou `omenKind` vêm de `polyhedra`/`omen`, passa a constar `modules/regras`.

Critérios de aceite:
- `grep -rn "ponte até a OS-001[456]" src` volta vazio.
- Nenhum arquivo importa `BASE`, `KINDS`, `BuiltinKind`, `DieKind`, `Shape`, `MAX_DICE`, `Omen`, `OmenKind` ou `omenKind` de `polyhedra` nem de `omen`. Mostre o grep no relatório.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passando. A suíte de arquitetura passa sem ciclo novo.
- `npm run e2e` completo passa; quem roda é o orquestrador.

Fora do escopo:
- Qualquer mudança além de imports. A exceção é o item 2.
- Mover `isD20`, `omenMs`, `OMEN_MS`, `DUALITY_HIT` e `omenKinds`, que vão com `dados`/`pressagios`.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Foram alterados 32 arquivos:
- **Pontes removidas:** `polyhedra.ts` (linhas 17 e 253) e `omen.ts` (linhas 5 e 6).
- **Imports trocados:** os 18 arquivos de `src/` listados na ordem, 6 de `tests/` (`helpers/sim.ts`, `omenTest`, `physics`, `polyhedra`, `read` e `showcase`) e 2 de `e2e/` (`omen` e `screens`).
- **Docs:** `dados.md` e `apresentacao.md`.

**Testes movidos:** 8 linhas do `it.each` de `omenOf`/`omenKind` e o caso "só d20 e d100" saíram de `tests/omen.test.ts` e foram para `src/modules/regras/tests/pressagio.test.ts`, com as mesmas asserções. A linha "d100 100 is a fumble" não foi copiada porque o destino já tinha esse caso. Em `tests/omen.test.ts` ficaram `omenMs`/`OMEN_MS` e o caso "store omen".

**Divergência (aceita pelo revisor):** o estilo de import ficou misto em `src/`. Onde o arquivo já importava `regras` com `.ts`, os nomes foram juntados a essa linha e a extensão foi mantida. Nos outros, o import ficou sem extensão. Padronizar fica para a fase 7.

**Verificação do dev:**
- `npm test`: 415 (um a menos, porque a duplicata saiu);
- `test:server`: 23;
- build e lint: ok;
- `omen` + `smoke`: 21/21.

## Parecer do revisor

**APROVADO.** Itens 1, 2, 4, 5, 6, 8 e 9 ✅; 3 e 7 não se aplicam.
- Fora dos imports, só saiu o comentário do reexport.
- Nenhum caso de teste se perdeu.
- Os greps de aceite voltam vazios.

**Auditoria de aceite do módulo `regras`** (seção 8 do guia):
1. **Alta.** `custom.ts:6-7` ainda reexporta `isCustom`, `CustomBase` e `CustomKind` para 10 arquivos. Isso vira a **OS-0017**.
2. **Média.** `maxItems: 10` está fixo em `server/src/app.ts` e `rolls.ts`. Também vai para a OS-0017.
3. **Média.** O `FACES` de `importer.ts` repete `SIDES`. Fica registrado na spec de `meus-dados`.
4. **Baixa.** A regra "d20 com `omens`" aparece em `server/src/rules.ts` (`clean`, que vai para a OS-0017), em `ImportDie.tsx:271` (registrado na spec de `meus-dados`) e em `omenTest.ts:39` (registrado na spec de `pressagios`).
5. O estado do módulo no mapa estava desatualizado. O orquestrador atualizou.
6. `visao-geral.md` dizia "polyhedra reexporta os tipos", e `testes.md` dizia que `SERVIDOR_PODE_IMPORTAR` "cai". O orquestrador corrigiu os dois.
7. **Baixa.** O `CLAUDE.md` do módulo confere com o código. Faltam duas notas (tipo desconhecido inválido, `DieInput`), que vão para a OS-0017.
8. A spec `docs/specs/regras.md` não tem nada que o `CLAUDE.md`, o `contracts.ts` e o mapa não cubram. Ela é removida no aceite (OS-0017).

## Gate

2026-11-13, rodado pelo orquestrador. Esta foi a última rodada de E2E pela regra antiga e serve como E2E de aceite de `regras`.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 34 arquivos, 415 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 passaram (21,2 min) |
