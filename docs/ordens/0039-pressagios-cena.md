# Ordem de serviço: `pressagios`, a cena do presságio, o plano e o percurso do d100

Ordem: OS-0039 (extração nº 8, `pressagios`, parte 2 de 3)
Módulo: `pressagios`
Escopo de escrita:
- `src/modules/pressagios/`: `scene/*`, `domain/plano.ts` (novo), `domain/percurso.ts` (novo), `index.ts`, `cena.ts`, `contracts.ts` (só para acrescentar) e `tests/`.
- **Legado movido** com `git mv` para `src/modules/pressagios/scene/`:
  - `src/scene/Omens.tsx`, que vira `PresagiosNaCena.tsx` (o componente `Omens` vira `PresagiosNaCena`);
  - `src/scene/Kraken.ts`, `src/scene/Fire.ts` e `src/scene/QuebraDaMesa.tsx`.
- **Legado da vitrine:** `src/scene/Hand.tsx`. Só o percurso do d100 passa a chamar `movimentoNoPresagio`/`indicesComPercurso` (decisão 3).
- **Camada HTML:** `src/ui/OmenOverlay.tsx`. Só o cálculo de `kraken`/`storm` passa a vir de `planoDoPresagio`, e só se a decisão 2 provar que é equivalente.
- **Casca:** `src/app/Cena.tsx`, só a composição e os imports.
- **Testes:** `tests/krakenShards.test.ts` e `tests/kraken.test.ts` vão para o módulo com `git mv`, se não dependerem mais do legado. Se dependerem, ficam e só mudam os imports.
- **Docs:** `docs/contexto/apresentacao.md` e `visao-geral.md`, nos caminhos; `docs/specs/vitrine.md`, na origem de `Hand.tsx`, se mudar.

Objetivo: a cena do presságio passa a ser do módulo. São os raios, o kraken e a tempestade, o fogo, os peixes da dualidade, a luz do efeito, o aquecimento de shaders e a quebra da mesa.
- A regra "que efeito em que dado" fica num lugar só, `planoDoPresagio`, com teste.
- O percurso próprio do d100 no kraken e na tempestade vira `movimentoNoPresagio`, que a vitrine (o `Hand.tsx` legado) pergunta.
- O comportamento, o visual e o número de luzes não mudam.

Leia antes de começar:
- `docs/specs/pressagios.md`, inteiro
- `src/modules/pressagios/index.ts`, `cena.ts`, `store.ts` e `domain/*`
- `src/scene/Omens.tsx`, inteiro (258 linhas), e os imports e `export` de `Kraken.ts` e `Fire.ts`
- `src/scene/Hand.tsx:95-175`, o showcase e o percurso do d100
- `src/ui/OmenOverlay.tsx`, inteiro
- `docs/contexto/armadilhas.md`, nos itens de luzes, shaders e desempenho

Decisões do orquestrador:
1. **`PresagiosNaCena`.**
   - É o `Omens.tsx` movido, com o mesmo código: a classe `Show`, o aquecimento, o `useFrame`, as luzes sempre na cena.
   - `Kraken`, `Fire` e `QuebraDaMesa` vão junto, sem mudança.
   - O `cena.ts` exporta `PresagiosNaCena` e `QuebraDaMesa`, e a casca os compõe **nos mesmos lugares** de hoje.
2. **`planoDoPresagio(omen, dice) → { kind, raios, kraken, tempestade, fogo, ms }`** (`domain/plano.ts`).
   - É a seleção de `Omens.tsx:198-209`:
     - `raios` são os `crits` em d20, em `crit`;
     - `kraken` é `krakenIndices`;
     - `tempestade` é `stormIndices`;
     - `fogo` é `fireIndices`;
     - `ms` é `omenMs`.
   - O `PresagiosNaCena` o usa no lugar do cálculo inline.
   - **A camada HTML** calcula hoje `kraken = kind === 'crit' && has(crits, d100)` e `storm = kind === 'fumble' && has(fumbles, d100)`. Ela só passa a usar `plano.kraken.length > 0` e `plano.tempestade.length > 0` se um teste do módulo provar que são iguais para todo `omen`/`dice` relevante. O teste percorre crítico, falha e dualidade, com d20, d100, d20 importado e misturas.
   - Se não forem iguais em algum caso, a camada HTML continua com o cálculo dela. Registre o caso no relatório (é a dúvida 4 da spec), sem mudar comportamento.
3. **`movimentoNoPresagio` e `indicesComPercurso`** (`domain/percurso.ts`).
   - `indicesComPercurso(omen, dice)` é o `krakenIndices` mais o `stormIndices` que o `Hand.tsx:103` calcula.
   - `movimentoNoPresagio(i, ms, de, para, kraken, tempestade) → { pose, revela } | null` é o trecho de `Hand.tsx:166-172`: `grabbed ? krakenDieAt : stormDieAt`, e `reveal` de `krakenAt`/`stormAt`. Devolve `null` se o dado não faz percurso.
   - O `Hand.tsx` passa a chamar as duas, sem mudar o resultado.
   - Teste com os dois casos e o `null`.
4. **Sem React no `index.ts`.** `planoDoPresagio`, `movimentoNoPresagio` e `indicesComPercurso` são puros e saem pelo `index`. Os componentes e as classes de cena saem pelo `cena.ts`. O `Kraken.ts` e o `Fire.ts` não usam React, mas usam three na cena. Exporte pelo `cena.ts` o que for de cena, e o `SHARD_DEFAULT`/`shard` para teste, se o teste ficar no módulo.

Entregáveis:
1. `scene/` com `PresagiosNaCena`, `Kraken`, `Fire` e `QuebraDaMesa`.
2. `planoDoPresagio`, `movimentoNoPresagio` e `indicesComPercurso`, com testes.
3. `Hand.tsx` e, se a decisão 2 permitir, `OmenOverlay.tsx` usando as funções.
4. A casca compondo nos mesmos lugares. Mostre o JSX antes e depois.
5. Os testes movidos e as docs.

Critérios de aceite:
- `src/scene/Omens.tsx`, `Kraken.ts`, `Fire.ts` e `QuebraDaMesa.tsx` não existem.
- `grep -n "krakenDieAt\|stormDieAt\|krakenAt\|stormAt" src/scene/Hand.tsx` volta vazio.
- O cálculo de `lit`/`grab`/`storm`/`fire` existe num lugar só (`planoDoPresagio`), e a camada HTML fica como a decisão 2 disser.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. A arquitetura passa: sem ciclo, `index` sem React e módulo sem legado. O worker não cresce.
- **Sem E2E no dev.** O orquestrador roda uma amostra (`omen`, `kraken`, `table-kraken`, `screens`, `roll`).

Fora do escopo:
- A camada HTML como componente do módulo, o CSS, os botões de teste (`OmenTests`), `inspecao()` e o `CLAUDE.md`, que são a OS-0040.
- O voo comum e os números da vitrine, além de chamar as funções novas.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Movidos com `git mv` para `src/modules/pressagios/scene/`: `Omens.tsx` → `PresagiosNaCena.tsx` (só os imports, o nome do componente e o plano no lugar de `Omens.tsx:198-200,208`), `Kraken.ts` e `Fire.ts` (só os imports) e `QuebraDaMesa.tsx` (imports e comentário). `tests/krakenShards.test.ts` → `tests/` do módulo, importando de `cena.ts`. `tests/kraken.test.ts` fica na raiz porque usa `src/scene/showcase`, e os imports dele não mudam.
- Novos: `domain/plano.ts`, `domain/percurso.ts`, `PlanoDoPresagio` e `MovimentoNoPresagio` em `contracts.ts`, as duas funções no `index.ts` e `PresagiosNaCena`, `QuebraDaMesa` e `SHARD_DEFAULT`/`shard`/`shardWood` no `cena.ts`. Testes escritos antes, e falharam antes: `tests/plano.test.ts` e `tests/percurso.test.ts`.
- Decisão 2: o teste de equivalência percorre 208 presságios (todo crítico, falha e dualidade de 14 mãos com d20, d100, d20 importado com e sem `omens`, d6, d10 e misturas) e passou em todos. `OmenOverlay.tsx` passou a ler `kraken`/`storm` do plano. `flash`/`heat` (`has(..., isD20)`) ficam como estão, pelo escopo (OS-0040).
- Decisão 3: `indicesComPercurso` devolve `{ kraken, tempestade }`, porque `movimentoNoPresagio` precisa das duas listas separadas. O `Hand.tsx` ainda usa `KRAKEN.grab`/`STORM.approach` (sombra) e `KRAKEN.duration`/`STORM.duration` (fim). A ordem pede `{ pose, revela }`, e a `sombra` da spec ficou de fora.
- Casca: `import { Omens }` e `import { QuebraDaMesa }` de `../scene/` passaram a `import { PresagiosNaCena, QuebraDaMesa } from '../modules/pressagios/cena'`. No JSX, antes `<QuebraDaMesa />` (no `Physics`, antes da `<MesaNaCena />`) e `<Omens />` (depois do `</Guard>`). Depois, `<QuebraDaMesa />` no mesmo lugar e `<PresagiosNaCena />` no lugar do `<Omens />`.
- Gate: `npm test` 59 arquivos e 520 testes; `test:server` 23/23; build ok (worker 2.379,76 kB, igual; `index` 690,53 kB); lint sem avisos. Greps vazios: os 4 arquivos legados e `krakenDieAt|stormDieAt|krakenAt|stormAt` no `Hand.tsx`. E2E não rodados.
- Pendências fora do escopo: comentários que ainda citam `Omens`/"legado `QuebraDaMesa`" em `src/modules/arremesso/scene/corpos.ts:2`, `arremesso/CLAUDE.md:34`, `arremesso/NOTAS.md:30`, `mesa/CLAUDE.md:20,29`, `mesa/NOTAS.md:23,33` e `docs/mapa-modulos.md:17`.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Arquivos movidos:** só mudam imports, comentários, o nome `Omens` → `PresagiosNaCena` e o cálculo trocado por `planoDoPresagio`.
- **`planoDoPresagio`:** faz o mesmo cálculo da origem. A equivalência da camada HTML vale nos 208 casos e também por raciocínio: `kraken` só existe com `fumbles` vazio e um d100 crítico, e a tempestade é análoga.
- **`Hand.tsx`:** dá o mesmo resultado (prioridade do kraken, `revela`, sombra e fim).
- **Casca:** a composição ficou nos mesmos lugares.
- **Arquitetura:** limpa.

Ressalvas:
1. A spec prometia `sombra` em `movimentoNoPresagio`. **Decisão do orquestrador:** `sombra` e `fim` entram na OS-0040, para a vitrine deixar de ler `KRAKEN`/`STORM`. A spec foi ajustada.
2. A assinatura de `indicesComPercurso(omen, dice) → { kraken, tempestade }` foi alinhada na spec.

O orquestrador também corrigiu as citações a `Omens` e ao "legado `QuebraDaMesa`" em `arremesso/scene/corpos.ts`, `arremesso/CLAUDE.md`, `arremesso/NOTAS.md`, `mesa/CLAUDE.md` e `mesa/NOTAS.md`.

## Gate

2026-11-14, rodado pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 59 arquivos, 520 testes |
| `npm run test:server` | ✅ 23 testes |
| amostra de E2E (`omen`, `kraken`, `table-kraken`, `screens`, `roll`) | ✅ 48 de 48 (9,4 min) |
