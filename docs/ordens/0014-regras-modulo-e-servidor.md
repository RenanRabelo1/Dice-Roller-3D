# Ordem de serviço: módulo `regras`, com o servidor passando a usá-lo

Ordem: OS-0014 (extração nº 1, `regras`, parte 1 de 2)
Módulo: `regras`

Escopo de escrita:
- **`src/modules/regras/`**, novo: `CLAUDE.md`, `index.ts`, `contracts.ts`, `domain/*.ts`, `tests/*.test.ts`.
- **Legado**, só as pontes:
  - `src/dice/kinds.ts`
  - `src/dice/omen.ts`
  - `src/dice/polyhedra.ts`, só o `MAX_DICE`
- **Servidor:** `server/src/app.ts`, `server/src/rolls.ts` e `server/src/rules.ts`, só nos imports e no uso das funções novas.
- **Testes de arquitetura:** `tests/arquitetura/config.ts`, só em `SERVIDOR_PODE_IMPORTAR`.

**Escopo ampliado pelo orquestrador (2026-11-13):** entra também `tests/arquitetura/fixtures/modulos/server/src/app.ts`: a linha 2, o comentário dela e a linha 5, que passou a ser `[v, outro]` para compilar com o export da fixture de `regras`. A fixture usava `src/dice/kinds.ts` como import permitido do servidor, e com o novo `SERVIDOR_PODE_IMPORTAR` o import permitido passa a ser `src/modules/regras/index.ts`.

Objetivo: as regras do jogo passam a viver em `src/modules/regras/`, puras, sem nenhuma dependência e testadas. O servidor passa a importar só o `index.ts` do módulo. O legado continua funcionando por pontes, que a OS-0015 retira.

Leia antes de começar:
- `docs/specs/regras.md`, inteira: são os cinco blocos do `CLAUDE.md`, a origem do código e os critérios.
- `docs/adr/0002-dominio-no-cliente-e-regras-compartilhadas.md`.
- `src/dice/kinds.ts` e `src/dice/omen.ts`.
- `server/src/rules.ts`, mais os imports de `server/src/app.ts` e `server/src/rolls.ts`.
- `src/dice/polyhedra.ts`, só a linha do `MAX_DICE`, que você acha com `grep -n`.

Entregáveis:

1. **`contracts.ts`.** Tipos: `Shape`, `BuiltinKind`, `CustomKind`, `DieKind`, `CustomBase`, `Omen`, `OmenKind`, mais o tipo de entrada de `valoresValidos`/`total`/`tipoParaPresagio`, que é `{ kind, value?, base?, omens? }`.
2. **`domain/`**, só funções puras e constantes, com o código vindo de onde a spec indica:
   - `KINDS`, `BASE`, `SIDES`, `CUSTOM_BASES`, `FREE_VALUES`, `MAX_DICE` e `isCustom`.
   - `valoresValidos`, que é o `range` + `shapeOf` de `server/src/rules.ts`.
   - `total`, a soma sem moedas.
   - `tipoParaPresagio`, que dá `'d20'` só para importado com `base === 'd20' && omens === true`.
   - `omenOf(kinds, results)`, que reconhece d20 **só** pelo `'d20'` literal: quem chama normaliza antes.
   - `omenKind`.

   **Não** entram em `regras`: `omenD20s`, `isD20`, `OMEN_MS`, `DUALITY_HIT` e `omenMs`.
3. **`index.ts`.** É a porta: reexporta o que a spec lista em "Expõe". Imports relativos **com extensão `.ts`** e só sintaxe apagável, porque o servidor roda TS direto no Node (ADR 0002, ADR 0007 ponto 4).
4. **`CLAUDE.md`** do módulo, com os cinco blocos da spec no formato final, com 30 a 50 linhas.
5. **`tests/`.** São os critérios da spec:
   - faces válidas por base, incluindo d10 = 10, moeda 1–2, forma livre −99/999 e importado sem base inválido;
   - total com moedas;
   - crítico, falha e dualidade em d20 e d100;
   - `tipoParaPresagio`: importado d20 com e sem `omens`, importado de outra base e forma livre.
6. **Pontes no legado, sem mudar comportamento:**
   - **`src/dice/kinds.ts`:** passa a reexportar de `../modules/regras/index.ts` tudo o que exportava, menos `omenD20s`. O `Set` `omenD20s` continua declarado ali, como hoje. Marque com o comentário `// ponte até a OS-0015`.
   - **`src/dice/omen.ts`:** `Omen`, `OmenKind` e `omenKind` passam a ser reexportados de `regras`. O `omenOf` do legado vira um invólucro: `(dice, results) => regras.omenOf(dice.map((k) => (isD20(k) ? 'd20' : k)), results)`. O resultado é idêntico ao de hoje, porque `isD20` continua consultando `omenD20s`. `OMEN_MS`, `DUALITY_HIT`, `omenMs` e `isD20` ficam como estão.
   - **`src/dice/polyhedra.ts`:** `MAX_DICE` passa a ser reexportado de `regras`.
7. **Servidor.** `app.ts`, `rolls.ts` e `rules.ts` importam só de `../../src/modules/regras/index.ts`.
   - Em `rules.ts`, o `range` local é trocado por `valoresValidos`.
   - A soma é trocada por `total`.
   - O `isCustom(d.kind) && d.base === 'd20' && d.omens ? 'd20' : d.kind` é trocado por `tipoParaPresagio(d)`.
   - O `clean` fica como está, porque o que o servidor guarda é regra do `historico`.
   - As mensagens de erro do servidor não mudam.
8. **`tests/arquitetura/config.ts`.** `SERVIDOR_PODE_IMPORTAR` passa a ser `['src/modules/regras/index.ts']`. A suíte vai checar que `regras` não importa nada de fora.

Critérios de aceite:
- `cd server && npm run typecheck && npm test` passa, com os 23 testes sem alteração, porque eles provam que a validação, o total e o presságio do servidor não mudaram.
- `npm test`, `npm run build` e `npm run lint` passam. A suíte de arquitetura confere:
  - o servidor só importa `regras/index.ts`;
  - `regras` não importa nada de fora.
  - nenhum ciclo novo apareceu.
- `grep -rn "omenD20s\|isD20\|OMEN_MS" src/modules/regras` volta vazio.
- `npm run e2e` completo, que o orquestrador roda.

Fora do escopo:
- Trocar os outros importadores do legado (`kinds.ts`, `omen.ts`, `MAX_DICE`) para `regras/index.ts`, remover `kinds.ts`, mexer em `omenD20s`/`isD20` ou usar `total` em `notation.ts`: isso é a OS-0015.
- Qualquer outro arquivo de `src/`, `server/` ou `tests/`.

Se precisar de algo de outro módulo ou fora do escopo: pare e reporte. Não implemente.

## Relatório do dev

**Módulo novo, `src/modules/regras/`:**
- `CLAUDE.md` (38 linhas, os 5 blocos), `contracts.ts`, `index.ts`;
- `domain/catalogo.ts`, `pontuacao.ts` e `pressagio.ts`;
- `tests/catalogo.test.ts`, `pontuacao.test.ts` e `pressagio.test.ts`, com 19 testes escritos antes do código e vistos falhar.

O `index.ts` expõe só o que a spec lista em "Expõe". O `DieInput` fica em `contracts.ts`, sem reexport.

**Pontes `// ponte até a OS-0015`:**
- `kinds.ts` reexporta tudo de `regras` e mantém o `Set` `omenD20s`.
- `omen.ts` reexporta `Omen`, `OmenKind` e `omenKind`. O `omenOf` virou um invólucro que normaliza com `isD20` antes de chamar o de `regras`.
- `polyhedra.ts` reexporta `MAX_DICE`.

**Servidor:** `app.ts`, `rolls.ts` e `rules.ts` importam só `regras/index.ts`. Em `rules.ts`, o `range` virou `valoresValidos`, a soma virou `total` e a normalização virou `tipoParaPresagio`. O `clean` e as mensagens não mudaram.

**Divergência e ampliação de escopo:** a fixture `tests/arquitetura/fixtures/modulos/server/src/app.ts` usava `kinds.ts` como import permitido do servidor. O orquestrador ampliou o escopo: linhas 1, 2 e 5 passaram para `regras/index.ts` e `[v, outro]`, para compilar com a fixture de `regras`.

**Verificação do dev:**
- `npm test`: 415;
- `test:server`: typecheck + 23;
- build e lint: ok;
- `omen` + `chat` + `history`: 25/25.

## Parecer do revisor

**APROVADO.**
1. ✅ Só arquivos do escopo, com a ampliação.
2. ✅ O servidor e as pontes importam só `regras/index.ts`.
3. n.a. (sem tabela).
4. ✅ `contracts.ts` novo.
5. ✅ A regra saiu de `rules.ts` para `domain/`.
6. ✅ Módulo e arquitetura: 49/49.
7. ✅ Os testes cobrem a lista da spec, com uma lacuna pequena (ver observações).
8. ✅ O `CLAUDE.md` confere com o código.
9. ✅ Critérios da ordem atendidos.

**Equivalência conferida:**
- `valoresValidos` é igual a `range` + `shapeOf` em todos os casos: embutido, importado padrão, livre, sem base e desconhecido. A única diferença é `null` em vez de `undefined`, e `score` só testa `!r`.
- `total` é a mesma `reduce`.
- O invólucro `omenOf` dá o mesmo resultado que o `isD20` antigo.
- `kinds.ts`, `omen.ts` e `polyhedra.ts` exportam os mesmos nomes de antes.
- `regras` é pura.

**Observações sem bloqueio:**
1. `tipoParaPresagio` usa `omens === true`. O schema do servidor já garante um booleano, e o `clean` já usava `=== true`.
2. `CustomBase` é uma união escrita à mão, protegida pelo teste do array.
3. Falta o comentário de ponte no reexport de tipos de `omen.ts:5`. Vai para a OS-0015.
4. O importado só é testado em crítico. Falha e dualidade vão para a OS-0015.
5. `dados.md` e `visao-geral.md` ainda diziam que o servidor importa `kinds.ts`. O orquestrador corrigiu neste commit, e a árvore ganhou `modules/regras/`.

## Gate

2026-11-13, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ O worker de física muda de hash (`presim.worker-hhO7ClQi.js`, +0,04 KB), esperado: ele importa `kinds.ts`, que agora reexporta de `regras`. |
| `npm run lint` | ✅ |
| `npm test` | ✅ 34 arquivos, 415 testes |
| `npm run test:server` | ✅ typecheck + 23 testes, sem alteração |
| `npm run e2e` | ✅ 98 passaram (18,5 min) |
