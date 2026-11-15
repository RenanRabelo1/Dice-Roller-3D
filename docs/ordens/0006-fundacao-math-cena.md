# Ordem de serviço: `shared/math` na cena e fim da ponte

Ordem: OS-0006 (F-3, parte 2 de 2, fundação, dev de shared)
Escopo de escrita: `src/physics/world.ts` (só para retirar a ponte), `src/scene/Die.tsx`, `src/scene/Hand.tsx`, `src/scene/inkGlow.ts`, `src/scene/krakenMotion.ts`, `src/scene/showcase.ts`, `src/scene/Stage.tsx`, `src/scene/highlight.ts`, `src/scene/fireMotion.ts`, `src/scene/Kraken.ts`, `src/scene/Omens.tsx`, `src/store.ts`, `src/testHook.ts`, `tests/kraken.test.ts`, `e2e/screens.spec.ts` (só a linha do import de `Quat`)
Objetivo: todo o código importa `Vec3`, `Quat`, `Pose`, `easeOut`, `clamp01` e `span` de `src/shared/math.ts`, e a ponte da OS-0005 deixa de existir.

**Escopo ampliado pelo orquestrador (2026-11-13):** o levantamento inicial não pegou os testes que importam `'../src/physics/world'` (outro formato de caminho). Entram no escopo, **só na linha do import de `Vec3`/`Quat`**: `tests/helpers/models.ts`, `tests/helpers/sim.ts`, `tests/importer.test.ts`, `tests/omenTest.test.ts`, `tests/physics.test.ts`, `tests/read.test.ts`, `tests/settle.test.ts`, `tests/store.test.ts`, `tests/vortex.test.ts`, `tests/world.test.ts`. O que mais importarem de `world.ts` continua vindo de lá.

Pré-requisito: a OS-0005 aceita, com o `src/shared/math.ts` existente.

Leia antes de começar:
- `src/shared/math.ts`
- as linhas de import dos arquivos do escopo, e as declarações locais de `Pose` (`showcase.ts:5`), `easeOut`/`clamp01` (`highlight.ts:10-11`), `span` (`krakenMotion.ts:9`) e `clamp01` (`Omens.tsx:23`)

Entregáveis:
1. `Vec3`/`Quat` vêm de `shared/math` em `Die.tsx`, `Hand.tsx`, `inkGlow.ts`, `krakenMotion.ts`, `showcase.ts`, `Stage.tsx`, `store.ts`, `testHook.ts` e `e2e/screens.spec.ts:4`. Este último é verificado pelo `tsconfig.test.json`, e o build quebraria sem a troca. As constantes continuam vindo de `world.ts`.
2. `Pose`:
   - `showcase.ts` deixa de declarar `Pose` e passa a importá-lo de `shared/math`;
   - `Hand.tsx`, `krakenMotion.ts` e `tests/kraken.test.ts` importam `Pose` de `shared/math`.
3. `easeOut`, `clamp01` e `span`:
   - `highlight.ts` deixa de declará-los e passa a importá-los de `shared/math`. Se algum arquivo ainda os importar de `highlight.ts`, ajuste esse arquivo, e não deixe reexportação;
   - `krakenMotion.ts` deixa de declarar `span` e o importa de `shared/math`;
   - passam a vir de `shared/math` só os nomes que cada arquivo já importa hoje:
     - `fireMotion.ts`: `easeOut` e `span`;
     - `Hand.tsx`: `easeOut`;
     - `Kraken.ts`: `span`;
     - `Omens.tsx`: `span`.
4. `Omens.tsx`:
   - troque **só** o `clamp01` local pelo de `shared/math`;
   - o `easeOut` e o `easeIn` locais ficam. O `easeOut` de lá é outra curva, `1 - (1 - clamp01(t)) ** 3`, e precisa continuar se chamando de um jeito que não colida com o importado. Se não houver colisão (o arquivo não importa o `easeOut` compartilhado), não renomeie nada.
5. Retire a ponte:
   - remova a reexportação de `Vec3`/`Quat` em `world.ts:2`. O `import type { Vec3 }` da linha 1 é uso interno e **fica**;
   - a OS-0005 não deixou ponte de `Pose` em `presim.ts`, então não há nada a retirar lá;
   - `grep -rn "type \(Vec3\|Quat\|Pose\)\b" src tests` mostra a declaração só em `shared/math.ts`.

Critérios de aceite:
- `grep -rn "Vec3\|Quat" src tests | grep "physics/world"` volta vazio.
- O comportamento não muda:
  - `npm test` passa sem alterar asserção;
  - `npm run build`, `npm run lint` e `npm run test:server` passam;
  - `npm run e2e` completo passa. É o orquestrador quem roda; a ordem toca a cena.
- Os E2E que importam `src/` por URL (`kraken`, `coin-performance`, `table-kraken`) continuam funcionando. Se um deles importa `span`, `easeOut` ou `Pose` de um arquivo de `scene/`, reporte em vez de mexer: `e2e/` está fora do escopo.

Fora do escopo:
- Qualquer arquivo fora do escopo de escrita. Em `e2e/`, só a linha 4 de `screens.spec.ts`.
- Unificar o `easeOut` do `Omens.tsx` com o de `shared/math`.
- Mudar qualquer valor numérico.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

25 arquivos: os 15 do escopo original mais os 10 de `tests/` da ampliação.

- **Linhas que não são import:** 6. São as declarações retiradas de `easeOut`/`clamp01` (`highlight.ts`), `span` (`krakenMotion.ts`), `Pose` (`showcase.ts`) e `clamp01` (`Omens.tsx`), mais 1 linha em branco. Não ficou reexportação.
- **`Omens.tsx`:** importa só `clamp01` e `span`. O `easeOut` cúbico e o `easeIn` locais ficam, sem colisão.
- **Ponte:** `world.ts:2` retirada. O `import type { Vec3 }` da linha 1 fica para uso interno.
- **Testes:** em `tests/fire.test.ts` e `tests/polyhedra.test.ts` não houve mudança, porque eles só importam constantes.

**Divergência:** na primeira rodada a ponte não pôde sair. O build quebrava em 10 arquivos de `tests/` que importam `'../src/physics/world'`, um formato de caminho que o levantamento do orquestrador não pegou. O dev parou e reportou. O orquestrador ampliou o escopo (registrado no topo) e o dev concluiu.

Verificação do dev:
- `npm test`: 343;
- build e lint: ok;
- `test:server`: 23;
- `screens` + `omen` + `kraken`: 30/30, antes da ampliação, que só mexeu em testes.

## Parecer do revisor

**APROVADO.**
- ✅ (a) Só os 25 arquivos do escopo ampliado. Em `e2e/`, só `screens.spec.ts:4`.
- ✅ (b) Comportamento igual:
  - fora os imports, o diff só retira as 6 linhas e a ponte;
  - as curvas são idênticas às originais;
  - `span` = `MathUtils.clamp` para todo `x`, inclusive `NaN`, ±Infinity e `-0`.
- ✅ (c) A ponte saiu. `type Vec3|Quat|Pose` só é declarado em `shared/math.ts:3-5`.
- ✅ (d) `shared/math.ts` não mudou.
- ✅ (e) Os E2E que importam por URL não usam esses símbolos.

Observações sem bloqueio:
1. `world.ts:44` tem um `span` local, outra função (espaçamento da mão). É homônimo enganoso; fica como candidato a renomear numa ordem futura.
2. `krakenMotion.ts` mantém o `MathUtils`, que `smooth` ainda usa.

## Gate

2026-11-13, pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ (worker de física com o mesmo hash, `presim.worker-C9tdnkZJ.js`) |
| `npm run lint` | ✅ |
| `npm test` | ✅ 24 arquivos, 343 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e`, 1ª rodada | interrompida pelo Claude Code por falta de memória (0,4 GB livres), com 37 passando e 1 falha de orçamento de tempo (botão Raio, a 31 min) |
| `npm run e2e`, depois de o usuário liberar memória | ✅ 98 passaram (19,1 min) |
