# Notas do `arremesso`

O detalhe que não cabe no [CLAUDE.md](CLAUDE.md). Leia só quando a ordem mandar. Veio do antigo contexto do arremesso em `docs/contexto/`, que saiu na OS-0034.

## Ideia central

O resultado é decidido **no momento do arremesso**, não lido ao vivo. Ao soltar, o arremesso inteiro é simulado offline com o Rapier real (`presimulate`), gravando uma pose por corpo por passo. A cena então **reproduz** a gravação, um quadro gravado por passo físico, e publica o resultado no último quadro. É uma rolagem física de verdade, mostrada em tempo real, cujo valor já é conhecido.

## Fases (`domain/gesture.ts`, reducer puro)

```
hand --press--> charging --release(mesma origem)--> rolling --published--> settled --press--> returning --returned--> hand
         charging --cancel--> hand          selection (qualquer fase) --> hand
```

- `Source` = ponteiro (`pointerId`) ou tecla.
- `release` devolve `Effect { type: 'throw', force: charge(ms, mode) }` (o store põe no evento o modo escolhido); `press` em `settled` devolve `{ type: 'return' }`.

## Estado (`store.ts`)

Store zustand vanilla do módulo (OS-0031), escrito só lá. Campos de `EstadoDoArremesso`:

- `dice: DieKind[]`: os dados do arremesso corrente, alinhados com `results`/`raw`; cópia da mão (`selecao`) recebida por `selecaoAlterada`, ordenada (`sortDice`), 1..`MAX_DICE` (10).
- `gesture`, `throwId`, `aim`, `force`, `launch`, `results`, `raw` (o valor de cima por corpo: dígito do d10, vértice do d4), `ready`.
- `chargeMode`: `'relative'` (padrão) ou `'static'`, escolhido no `<ModoDeRolagem/>` e lembrado em `localStorage['diceroller.rolagem']` (`repository.ts`).

O estado do presságio (`omen`, `omenAt`, `omenDone`, `omenRig`, `omenTest`) saiu para `pressagios` na OS-0038: o store de lá assina `resultadoPublicado` e decide o presságio no mesmo tique (dois `set`, OS-0031); o `showcased` é da `vitrine` (`vitrine()`, OS-0041; o `useDice` legado deixou de existir). Quem precisa dos três junta `{ ...arremesso(), ...presagio(), ...vitrine() }`. A casca (`App.tsx`) assina o mesmo evento para gravar o histórico, depois que os módulos carregaram.

- A falha `'physics'` vive em `shared/plataforma` (`falha()`, `useFalha()`), não no store; `<DicaDaFase/>` a mostra.
- Movimento reduzido também vive em `shared/plataforma` (`movimentoReduzido()`); `MaoDoArremesso` o lê (sem balanço da mão, retorno curto com fade), como o `Hand` da vitrine, o `QuebraDaMesa` (`pressagios/scene`) e o `__dice.state().reducedMotion`; o `App.tsx` chama `observarPreferenciaDoSistema`.
- O registro de corpos e a contagem de lançamentos (`scene/corpos.ts`) valem para o módulo inteiro e não zeram se a `Cena` for remontada (no HEAD da OS-0033 eram refs da `Cena`). Hoje a `Cena` só desmonta numa falha e não volta na mesma sessão; cada E2E abre página nova.

## Cena (`scene/`)

- `corpos.ts`: `registroDeCorpos.current[i]` é o corpo do dado `i` (o `CorpoDoDado` grava na criação e põe `null` ao desmontar). `registrarLancamento` conta os lançamentos e guarda as poses antes/depois do último. `inspecao()` lê os dois. Sem React; o Rapier entra só como tipo.
- `MaoDoArremesso`: entrada por ponteiro e teclado, mira, seta (`ArrowHelper`), redemoinho, `motion` e retorno. É montada logo antes do `Hand` do legado (a parte `settled`), para o quadro dela rodar antes.
- `LoopDoArremesso`: o laço abaixo, em `useBeforePhysicsStep`.
- `CorpoDoDado`: o corpo cinemático de cada dado, sem CCD, com a `AparenciaDoDado` de `dados` e `userData.selection`.
- `ColisoresDaBandeja`: o corpo fixo com `trayColliders()`; a `MesaNaCena` (`mesa`) passa a mesa como filha dela.

## Linha do tempo de um arremesso

1. **Mira**: raycast do ponteiro no plano y=0, `clampTarget(hit)`. Os dados na mão (cinemáticos) giram num redemoinho (`domain/vortex.ts`): cada um numa órbita inclinada (planos de Fibonacci, `ORBITS`) e girando no próprio eixo; o centro segue `aim.x` e a velocidade cresce com a carga. A mão balança conforme a velocidade da mira (`omega`).
2. **Carga**: `pointerdown`/Espaço → `press`. A cada quadro `force = charge(agora - chargeStart, chargeMode)`. A seta muda de cor e tamanho com a força.
3. **Soltura**: `release` → o store cria `Launch` com `handCenter`/`handOmega` reais.
4. **Pré-simulação**: o `LoopDoArremesso` detecta `throwId` novo, captura as poses atuais dos corpos e manda `RollRequest { dice, start, launch, customs, bias? }` ao worker. `bias` só existe com um botão de teste de presságio ligado (`omenTest`, prop-função da casca; `kinds` vem de `omenKinds`) e faz `presimulateFor` procurar, dentro de `BIAS_BUDGET`, uma semente que produza aquele presságio. Sem worker, ou sem resposta em 2 s (`WORKER_TIMEOUT`), → `presimulateFor` síncrono (fallback); se ele também falhar, os dados voltam à mão com `error: 'physics'`. Logo depois grava o lançamento (`registrarLancamento`).
5. **Replay**: a cada passo físico aplica `rec.frames[at]` via `setNextKinematicTranslation/Rotation`. Quem simula dinâmica é só o mundo offline.
6. **Publicação**: no último quadro, fixa a pose final com `setTranslation/setRotation` **antes** de `publish(throwId, rec.results, rec.raw)`.
7. **Settled** → apresentação (presságio, voo, números). Clique/Espaço → `returning`.
8. **Retorno**: interpola as poses até os lugares do redemoinho (`restingPlaces`), fixa a pose final e só então emite `returned`.

Descartes por `throwId`: resposta do worker de arremesso antigo, publish atrasado, seleção trocada no meio; tudo comparado com `arremesso().throwId` e fase `rolling`.

## Pré-simulação (`domain/presim.ts`)

`presimulate(dice, start, launch, perturb?) → Recording { frames, raw, results, timedOut, escaped, recovered }`

- Cria um `RAPIER.World` próprio (`GRAVITY`, `STEP = 1/60`), bandeja de `trayColliders()` (chão, 4 paredes, tampa em y=7), um corpo por dado com CCD e `DAMPING` por shape.
- Colisor: `convexHull(poly.points)`; a moeda usa `roundCylinder` (casco fino balança para sempre).
- `applyLaunch`: torna dinâmico, velocidade linear `launchVelocity(handCenter, target, force)`, angular = giro da mão + `spin(seed, i)`.
- Loop até `SETTLE.timeoutSteps` (240 = 4 s): `world.step()` → trava a rotação da moeda lenta e deitada → `stepSettle` → `applySettle` → grava o quadro. No `reveal`, lê `readUp` de cada pose e converte com `toResults` (forma livre, `readsDown`: lê a face de baixo, ver `docs/contexto/dados.md`).
- Determinístico (testado em `tests/physics.test.ts`). `perturb` existe só para testes (forçar fuga/timeout).

## Parada (`domain/settle.ts`, puro)

`stepSettle(state, { throwId, phase, radii, bodies })` → `wait | recover | reveal`. Prioridade:

1. Outro `throwId`, fase ≠ `rolling` ou já concluído → `wait` sem contar.
2. Lista de corpos incompleta → `wait`.
3. `steps >= SETTLE.timeoutSteps` → `reveal(timedOut: true)` (corpos fora vão para `recoveryPoint`).
4. Algum corpo fora (`isOutside` usa o raio, não só o centro) → `recover` (zera a calma).
5. Todos com `speed < 0.08` e `spin < 0.15` por `calmSteps` (12) seguidos → `reveal(false)`.

Não lê faces: o valor sai das poses do `reveal`.

## Aplicação nos corpos (`domain/apply.ts`)

Único lugar que muda tipo de corpo, velocidade e pose, usado pela cena e pelos testes Node: `applyLaunch`, `toKinematic`, `applySettle`, `bodyStates`.

## Constantes (`domain/world.ts`)

| Constante | Valor | Uso |
|---|---|---|
| `STEP` / `GRAVITY` | 1/60 / y = -40 | mundo offline e `<Physics>` da cena |
| `TRAY` | interior 14×9, parede 1,5, tampa y=7 | `+z` é a borda do jogador |
| `MATERIAL` | die, velvet (chão), wall | atrito/restituição/densidade |
| `LAUNCH` | velocidade 6–22, lift 0,35 | `launchVelocity` |
| `SPIN` | 10–25 rad/s | `spin` |
| `SETTLE` | 240 passos, 12 calmos, 0,08 / 0,15 | `stepSettle` |
| `HAND` | y 3, z 3, espaçamento 1,9, 5 colunas | `handPositions` (testes de física), `clampHandX` |
| `VORTEX` (`domain/vortex.ts`) | raio, ritmo, ganho com a carga | redemoinho da mão (`stepWhirl`, `spinAngle`) |
| `DAMPING` | d100 e moeda | rolam demais sem amortecimento |
| `RAIO_MAXIMO` (de `dados`) | 0,9 | precisa bater com `max(RADIUS)` (há teste) |

Ajuste de "sensação" do arremesso = mexer aqui. Os testes de física usam os mesmos valores.

## Worker

`criarWorkerDePresimulacao()` (`new Worker(new URL('./domain/presim.worker.ts', import.meta.url), { type: 'module' })`); a casca não aponta para o arquivo do worker. `customs` (`customsOf(dice)`) leva o poliedro de cada dado importado da seleção; o worker os registra com `registerPoly` antes de `presimulate` (ele não tem o registro do app; o fallback síncrono tem). Inicializa o Rapier assim que a cena monta (aquece enquanto o jogador mira). Erro de init, `onerror` ou `onmessageerror` → `fallback()` termina o worker e simula na thread principal. Acrescenta ~2,4 MB ao build (WASM do Rapier). O `index.ts` não importa React, e `scene/corpos.ts` traz o `RapierRigidBody` de `@react-three/rapier` só como tipo.
