# Ordem de serviço: `shared/math` e os importadores de dados, arremesso e física

Ordem: OS-0005 (F-3, parte 1 de 2, fundação, dev de shared)
Escopo de escrita: `src/shared/math.ts` (novo), `src/shared/tests/math.test.ts` (novo), `src/physics/world.ts`, `src/physics/presim.ts`, `src/physics/apply.ts`, `src/dice/custom.ts`, `src/dice/importer.ts`, `src/dice/polyhedra.ts`, `src/dice/read.ts`, `src/throw/aim.ts`, `src/throw/settle.ts`, `src/throw/vortex.ts`
Objetivo: os tipos geométricos e as funções de curva passam a morar em `src/shared/math.ts`, e `dice/`, `throw/` e `physics/` deixam de importar tipos de `physics/world.ts`. Isso desfaz o ciclo de tipos `dice → physics`.

A F-3 toca 23 arquivos e foi dividida. Esta parte cria o `shared/math` e troca os importadores fora de `scene/`. A OS-0006 troca os de `scene/`, `store.ts` e `testHook.ts` e retira a ponte.

Leia antes de começar:
- `docs/adr/0008-casca-e-shared-do-cliente.md` (o que vai em `shared/math`)
- `src/physics/world.ts` (linhas 1-2: `Vec3` e `Quat`), `src/physics/presim.ts:10` (`Pose`), `src/scene/showcase.ts:5` (outro `Pose`, idêntico), `src/scene/highlight.ts:10-11` (`easeOut`, `clamp01`), `src/scene/krakenMotion.ts:9` (`span`). Os arquivos de `scene/` são só leitura nesta ordem.
- As linhas de import dos arquivos do escopo.

Entregáveis:
1. `src/shared/math.ts`, sem nenhum import, só com sintaxe apagável:
   - `Vec3`, `Quat` (com o comentário `x, y, z, w`) e `Pose = { p: Vec3; q: Quat }`;
   - `easeOut = (t) => 1 - (1 - t) ** 4`, exatamente a curva de `highlight.ts`;
   - `clamp01`;
   - `span(t, a, b)`, igual ao de `krakenMotion.ts`, mas com `clamp01((t - a) / (b - a))` no lugar de `MathUtils.clamp`, para não importar `three`. O resultado é o mesmo, inclusive para `NaN`.
2. `src/shared/tests/math.test.ts`:
   - `easeOut(0) = 0`, `easeOut(1) = 1` e `easeOut(0.5) = 0.9375`;
   - `clamp01` abaixo, dentro e acima do intervalo;
   - `span` antes de `a`, no meio e depois de `b`, e igual ao `MathUtils.clamp((t - a) / (b - a), 0, 1)` do three numa amostra de valores. O teste pode importar `three`.
3. **Ponte provisória:**
   - `physics/world.ts` deixa de declarar `Vec3`/`Quat` e passa a reexportá-los com `export type { Vec3, Quat } from '../shared/math'`, para os importadores de `scene/` continuarem funcionando até a OS-0006.
   - `physics/presim.ts` troca a declaração de `Pose` por `import type { Pose } from '../shared/math'` e mantém `export type { Pose }`, se algum arquivo importar `Pose` dele. Confira com grep antes de decidir.
   - Comente as duas reexportações com `// ponte até a OS-0006`.
4. **Importadores:** `custom.ts`, `importer.ts`, `polyhedra.ts`, `read.ts`, `apply.ts`, `presim.ts`, `aim.ts`, `settle.ts` e `vortex.ts` importam `Vec3`/`Quat`/`Pose` de `shared/math`. O que mais eles importam de `world.ts` (constantes, `trayColliders`, `isOutside`…) continua vindo de lá.

Critérios de aceite:
- Nenhum arquivo de `src/dice/` importa nada de `src/physics/`: `grep -rn "physics/" src/dice` volta vazio.
- O comportamento não muda: `npm test` passa com os 23 arquivos (22 + `events.test.ts`) e mais o `math.test.ts`. Os testes de física em Node (`tests/physics*`, `tests/settle*` e os demais) passam sem alteração.
- `npm run build`, `npm run lint` e `npm run test:server` passando. O servidor importa `src/dice/kinds.ts` e `omen.ts`: confira que nenhum dos dois passou a puxar `shared/math` de um jeito que o Node não carregue.
- Nenhum `easeOut` de outro arquivo trocado. O de `Omens.tsx` é **outra curva** (cúbica e com `clamp`) e fica como está.

Fora do escopo:
- Qualquer arquivo de `src/scene/`, `src/store.ts`, `src/testHook.ts` e `tests/` (OS-0006).
- Mexer nas constantes de `world.ts` ou mudar qualquer valor numérico.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Novos: `src/shared/math.ts` (sem imports) e `src/shared/tests/math.test.ts`, escrito antes e visto falhar. O teste cobre:
- `easeOut` em 0, 1 e 0,5;
- `clamp01`;
- `span` contra `MathUtils.clamp` numa grade com `NaN`, ±Infinity e intervalos degenerado e invertido.

Importadores trocados para `../shared/math`: `presim.ts`, `apply.ts`, `custom.ts`, `importer.ts`, `polyhedra.ts`, `read.ts`, `aim.ts`, `settle.ts` e `vortex.ts`. Constantes, `isOutside`, `trayColliders` e `recoveryPoint` continuam vindo de `world.ts`.

**Pontes:**
- A única é `world.ts:2`: `export type { Vec3, Quat } from '../shared/math'; // ponte até a OS-0006`. O `import type { Vec3 }` da linha 1 é uso interno e **fica** quando a ponte sair.
- **Não há ponte de `Pose` em `presim.ts`:** o grep mostrou que ninguém importa `Pose` de lá (`Hand.tsx` e `krakenMotion.ts` importam de `showcase.ts`).

O `tsc` acusou `Quat`/`Vec3` sem uso em `presim.ts`, porque só serviam à declaração antiga de `Pose`. Saíram.

## Parecer do revisor

**APROVADO.**
- ✅ (a) Só os 10 arquivos permitidos mais os 2 novos.
- ✅ (b) `math.ts` sem import: três `type` e três funções puras.
- ✅ (c) O teste usa `toBe` (`Object.is`), que pega até `-0`.
- ✅ (d) Sem mudança de comportamento:
  - `easeOut` e `clamp01` são idênticos aos de `highlight.ts`;
  - `span` dá o mesmo que `MathUtils.clamp` para `NaN`, ±Infinity e `-0`;
  - nenhuma constante mudou e o `easeOut` cúbico de `Omens.tsx` ficou intacto;
  - fora as linhas de import, o diff só traz as declarações retiradas e a ponte.
- ✅ (e) Ponte única, com comentário.
- ✅ (f) `grep -rn "physics/" src/dice` volta vazio. O servidor não puxa `shared/math`.

## Gate

2026-11-13, pelo orquestrador. Sem E2E: a mudança é só de tipos e imports, fora de cena e UI (plano §4). O E2E completo roda na OS-0006.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ O worker de física sai com o mesmo hash de antes (`presim.worker-C9tdnkZJ.js`), então a física não mudou no código que roda. |
| `npm run lint` | ✅ |
| `npm test` | ✅ 24 arquivos, 343 testes (+4) |
| `npm run test:server` | ✅ 23 testes |
