# Ordem de serviço: `arremesso`, domínio (gesto, mira, parada, física, pré-simulação)

Ordem: OS-0030 (extração nº 6, `arremesso`, parte 1 de 4)
Módulo: `arremesso`
Escopo de escrita:
- **Módulo novo** `src/modules/arremesso/`: `contracts.ts`, `index.ts`, `domain/*.ts` e `tests/`. O `CLAUDE.md` fica para a última parte.
- **Legado movido** com `git mv` para `src/modules/arremesso/domain/`: `src/throw/gesture.ts`, `aim.ts`, `settle.ts`, `vortex.ts` e `src/physics/world.ts`, `apply.ts`, `presim.ts`, `presim.worker.ts`.
- **`src/dice/omenTest.ts`:** `plays` e o tipo `OmenTest` saem (decisão 3).
- **Pontos de chamada, só os imports:**
  - em `src/`: `app/Cena.tsx` (também o `new Worker`, decisão 4), `app/testHook.ts`, `scene/Die.tsx`, `Fire.ts`, `fireMotion.ts`, `Hand.tsx`, `krakenMotion.ts`, `showcase.ts`, `tableBuild.ts`, `tableFile.ts`, `Tray.tsx`, `store.ts` e `ui/` (se houver);
  - em `tests/`: `fire.test.ts`, `omenTest.test.ts` e `helpers/sim.ts`;
  - em `e2e/`: os que importam `/src/physics/...` ou `/src/throw/...` por URL (`grep -rn "physics/\|throw/" e2e`).
- **Testes que mudam de lugar** (`git mv` para `src/modules/arremesso/tests/`): `tests/aim.test.ts`, `gesture.test.ts`, `settle.test.ts`, `vortex.test.ts`, `world.test.ts` e `physics.test.ts`.
- **Arquitetura:** `tests/arquitetura/config.ts`. Sai a entrada `src/physics ↔ src/throw` de `CICLOS_CONHECIDOS`. Também `tests/arquitetura/leitor.test.ts`, se a aresta do worker mudar.
- **Docs:** `docs/contexto/arremesso.md` e `visao-geral.md`, onde citam os caminhos.

Objetivo: a parte pura do arremesso passa a viver em `src/modules/arremesso/`. São o reducer de fases, a mira e a carga, a parada, o redemoinho, o mundo físico (`TRAY`, `HAND`, `STEP`…), a aplicação do lançamento e da parada nos corpos, a pré-simulação e o worker.
- O ciclo de pastas `physics ↔ throw` some.
- O store, a cena e os componentes continuam no legado, nesta ordem.
- O comportamento não muda e a física fica determinística igual.

Leia antes de começar:
- `docs/specs/arremesso.md`, nas seções "Regras de negócio", "Dados de que é dono" e "Origem do código"
- `src/modules/dados/CLAUDE.md` e `src/modules/selecao/index.ts`, como modelo de módulo
- os imports e os `export` dos 8 arquivos (`grep -n "^import\|^export"`)
- `src/dice/omenTest.ts`, inteiro (é curto)
- `src/app/Cena.tsx:50-60`, o `new Worker`
- `tests/arquitetura/config.ts:10-20` e `tests/arquitetura/leitor.test.ts`
- `docs/contexto/armadilhas.md`, no item `physics/apply.ts` e na física

Decisões do orquestrador:
1. **Nomes e estrutura.**
   - Os arquivos mantêm o nome dentro de `domain/`: `gesture.ts`, `aim.ts`, `settle.ts`, `vortex.ts`, `world.ts`, `apply.ts`, `presim.ts` e `presim.worker.ts`.
   - Os nomes exportados também ficam (`reduce`, `initialGesture`, `charge`, `TRAY`, `HAND`, `presimulateFor`…), pela decisão 1 da OS-0020.
   - O `index.ts` reexporta só o que alguém de fora usa hoje. Ache com `grep`.
2. **`MAX_RADIUS`.** A ponte em `world.ts:23` sai. `aim.ts` e quem mais usar `MAX_RADIUS` passam a usar `RAIO_MAXIMO` de `dados`.
3. **`plays` e `OmenTest`.**
   - A pré-simulação com viés precisa de `plays`, que está em `src/dice/omenTest.ts`, no legado, e o módulo não pode importar o legado.
   - `plays` e o tipo `OmenTest` vão para `src/modules/arremesso/domain/vies.ts`. São puros e só usam `omenOf`/`omenKind` de `regras`.
   - O `index.ts` os exporta, e `omenTest.ts` passa a importá-los de lá.
   - `OMEN_TESTS`, `omenKinds` e `withDiceFor` ficam no legado, porque são de `pressagios`.
4. **Worker.**
   - O `index.ts` exporta `criarWorkerDePresimulacao = () => new Worker(new URL('./domain/presim.worker.ts', import.meta.url), { type: 'module' })`, e `Cena.tsx:55` passa a chamá-lo.
   - A casca não aponta para arquivo interno do módulo.
   - Confira no `vite build` que o chunk `presim.worker-*.js` continua sendo gerado e que o tamanho não passa de 2379,76 kB.
5. **E2E por URL.**
   - `kraken.spec.ts` e `coin-performance.spec.ts` importam `/src/physics/presim.ts` dentro do navegador. Eles passam a importar `/src/modules/arremesso/index.ts`.
   - Não rode os E2E. Só confira, com `npx playwright test --list`, que os arquivos carregam.
6. **Testes.**
   - Os movidos ajustam só os imports e ficam sem mudar asserções.
   - `tests/helpers/sim.ts` passa a importar do `index.ts` do módulo.
   - Se algum teste movido usar `tests/helpers/*` que puxe o legado, deixe esse teste em `tests/`, ajustando só os imports, e registre no relatório.

Entregáveis:
1. O módulo com `contracts.ts` (os tipos que saem para fora: `Phase`, `GestureState`, `GestureEvent`, `Effect`, `ChargeMode`, `Launch`, `RollRequest`, `RollResponse`, `OmenTest`…), `index.ts` e `domain/`.
2. `omenTest.ts` sem `plays`/`OmenTest`.
3. Os pontos de chamada e o `new Worker` trocados.
4. Os testes movidos e a entrada de ciclo removida.
5. As docs.

Critérios de aceite:
- `src/throw/` e `src/physics/` não existem.
- `grep -rn "MAX_RADIUS\|ponte até a extração de arremesso" src tests e2e` volta vazio.
- A arquitetura passa sem `src/physics ↔ src/throw` em `CICLOS_CONHECIDOS` e sem ciclo novo. O módulo não importa o legado, e o `index` fica sem React.
- Os testes movidos passam sem mudar asserções, inclusive os de determinismo, fuga, timeout e seleção mista em `physics.test.ts`. Mostre o `git diff -M --stat`.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. Os chunks sob demanda continuam (`AssistenteDeImportacao`, `tableFile`, `HDRLoader`, `ler` e `modelo`), e o worker também.
- **Sem E2E**, só o `--list` da decisão 5.

Fora do escopo:
- O store (`useDice`: `gesture`, `throwId`, `aim`, `force`, `launch`, `results`…), que é a OS-0031.
- A cena (`ThrowLoop`, `Die.tsx`, `Hand.tsx`, os colisores de `Tray.tsx`), que é a OS-0032.
- Os componentes (`Force`, a dica da fase, `RollMode`), o `inspecao()` e o `CLAUDE.md`, que são a OS-0033.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev
- Feito: os 8 arquivos e os 6 testes movidos com `git mv`. Os tipos de saída estão em `contracts.ts`, inclusive `Source`, porque `GestureEvent` o usa, e `Recording`. `plays` foi para `domain/vies.ts`. O `index.ts` reexporta só o que se usa de fora e tem `criarWorkerDePresimulacao`. `src/throw/` e `src/physics/` foram apagados, e `CICLOS_CONHECIDOS` ficou `[]`.
- `MAX_RADIUS` passou a ser `RAIO_MAXIMO` de `dados` em `world.ts`, `aim.ts`, `Cena.tsx` e `showcase.ts`. Nos testes `world` e `physics`, troquei também o identificador dentro das asserções. O valor é o mesmo, e o grep de aceite exige a troca. Em `vortex.ts:17` só mudou o comentário.
- `leitor.test.ts`: o import estático virou `Cena.tsx → arremesso/index.ts` e a aresta `url` virou `arremesso/index.ts → domain/presim.worker.ts`.
- `physics.test.ts` foi para o módulo e importa `tests/helpers/sim.ts`, como `meus-dados/tests/importador.test.ts`. O `sim.ts` agora só puxa o `index` do módulo.
- `coin-performance.spec.ts` não importa o presim, só `/src/store.ts`, e ficou como estava. O `kraken.spec.ts` foi trocado. `--list`: 8 testes em 2 arquivos.
- Gate: `npm test` 50 arquivos e 481 testes; `test:server` 2 e 23; `build` e `lint` passam, este com saída 0. Os greps de aceite voltam vazios, e o módulo não importa o legado nem React.
- Build: o worker fica igual, com 2379,76 kB. Os chunks sob demanda continuam: `AssistenteDeImportacao` 40,61, `tableFile` 42,37, `HDRLoader` 3,28, `ler` 49,95, `modelo` 0,46 e `dados` 13,19.
- **Divergência, build.** O `index` inicial de 2929,18 kB se dividiu em `index` 692,05, `rapier` 2236,63 e `rolldown-runtime` 0,72, que somam 2929,40 e são todos pré-carregados no `index.html`. A causa, confirmada por experimento já revertido: `tableBuild` e `tableFile`, do chunk sob demanda, passam a importar `TRAY` pelo barril `index.ts`. O barril puxa `presim`, e com ele o Rapier, que o rolldown separa num chunk compartilhado. A carga inicial continua com os mesmos bytes. Evitar a divisão pediria uma segunda porta pura ou um import interno, as duas fora do escopo.
- **Pendente, fora do escopo.** `docs/contexto/armadilhas.md:17` ainda cita `physics/apply.ts`. Também mudei os comentários de caminho em `Hand.tsx:31` e `ui/Controls.tsx:9`.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- As decisões 1 a 6 estão cumpridas.
- **Arquivos movidos:** os 8 só mudam imports, a troca de `MAX_RADIUS` por `RAIO_MAXIMO` e os tipos para `contracts.ts`. Lógica, constantes e ordem de operações ficaram iguais.
- **`vies.ts`:** cópia fiel do HEAD.
- **Worker:** 2379,76 kB, igual ao HEAD, e sem React.
- **Testes:** os 6 movidos têm 57 casos, e as asserções só trocam o identificador.
- **Arquitetura:** `CICLOS_CONHECIDOS` vazio e nenhum ciclo.
- **Build:** o `index` inicial se dividiu em `index` + `rapier` + `rolldown-runtime`, todos com preload. São os mesmos bytes e uma requisição a mais. O Rapier virou chunk compartilhado porque `@react-three/rapier` o importa sob demanda e o `presim` estaticamente. **Aceito pelo orquestrador.** Nada que era sob demanda virou estático.

Ressalvas, corrigidas pelo orquestrador:
1. `mapa-modulos.md`: a linha do ciclo `physics ↔ throw` foi riscada, e `arremesso` passou para "em extração".
2. Caminhos mortos foram corrigidos em `dados.md:38,118`, `mesa.md:3` e `apresentacao.md:86`. A correção de `armadilhas.md:17` foi feita antes da revisão.
3. O tipo `Source`, que ninguém de fora usava, saiu do `export type` do `index.ts`.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 50 arquivos, 481 testes |
| `npm run test:server` | ✅ 23 testes |
