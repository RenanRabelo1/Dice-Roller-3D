# Arremesso: input → física → resultado

Cobre o domínio, o estado e a cena do arremesso em `src/modules/arremesso/` (`domain/*`, `store.ts`, `scene/*`, portas `index.ts` e `cena.ts`, tipos em `contracts.ts`; antes `throw/*`, `physics/*`, o `useDice` de `src/store.ts`, o `ThrowLoop` de `app/Cena.tsx`, `scene/Die.tsx`, os colisores de `scene/Tray.tsx` e a parte de input/mão de `scene/Hand.tsx`). Na cena, o módulo tem `MaoDoArremesso` (entrada por ponteiro e teclado, mira, seta, redemoinho, `motion` e retorno; montada logo antes do `Hand` do legado, que ficou só com a parte `settled`), `LoopDoArremesso` (o laço abaixo), `CorpoDoDado` (o corpo cinemático de cada dado, sem CCD, com a `AparenciaDoDado` de `dados`) e `ColisoresDaBandeja` (o corpo fixo com `trayColliders()`; o `Tray` da mesa passa a mesa como filha dele); `app/Cena.tsx` os compõe e ainda cria o registro de corpos (`bodies`) e o passa por prop. O que acontece **depois** de publicar está em [apresentacao.md](apresentacao.md).

## Ideia central

O resultado é decidido **no momento do arremesso**, não lido ao vivo. Ao soltar, o arremesso inteiro é simulado offline com o Rapier real (`presimulate`), gravando uma pose por corpo por passo. A cena então **reproduz** a gravação, um quadro gravado por passo físico, e publica o resultado no último quadro. É uma rolagem física de verdade, mostrada em tempo real, cujo valor já é conhecido.

## Fases (`arremesso/domain/gesture.ts`, reducer puro)

```
hand --press--> charging --release(mesma origem)--> rolling --published--> settled --press--> returning --returned--> hand
         charging --cancel--> hand          selection (qualquer fase) --> hand
```

- `Source` = ponteiro (`pointerId`) ou tecla. Só a mesma origem solta; `repeat` de tecla é ignorado.
- `release` devolve `Effect { type: 'throw', force: charge(ms, mode) }` (o store põe no evento o modo escolhido); `press` em `settled` devolve `{ type: 'return' }`.
- Gestos em `rolling`/`returning` são ignorados.

## Store (`arremesso/store.ts`)

O estado do arremesso mora num store zustand vanilla do módulo (OS-0031), escrito só lá. De fora: `arremesso()` (o estado atual, com as ações), as ações soltas (`input`, `publish`, `reiniciar`, `setAim`, `setForce`, `setChargeMode`, `setReady`), `assinarArremesso(listener)` (o `subscribe`, com o estado anterior) e o evento `resultadoPublicado` (só `subscribe`), todos pelo `index.ts`; o hook `useArremesso(selector)` vem do `cena.ts`. Tipos em `contracts.ts` (`EstadoDoArremesso`, `ResultadoPublicado`, `HandMotion`). Campos:

- `dice: DieKind[]` — os dados do arremesso corrente, alinhados com `results`/`raw`: cópia da mão (`selecao`) recebida por `selecaoAlterada`, ordenada (`sortDice`), 1..`MAX_DICE` (10).
- `gesture`, `throwId`, `aim`, `force`, `launch`, `results`, `raw`, `ready`.
- `chargeMode` — `'relative'` (padrão) ou `'static'`, escolhido no canto inferior esquerdo (`RollMode` em `Controls.tsx`) e lembrado no `localStorage` (`diceroller.rolagem`, lido e gravado em `arremesso/repository.ts`).

O que ficou no store legado `useDice` (`src/store.ts`): `omen`, `omenAt`, `omenDone`, `omenRig`, `omenTest`, `showcased` — sincronizam apresentação (ver apresentacao.md). `omenPlaying()` lê os dois estados (`arremesso()` e `useDice.getState()`) e diz se o presságio deste arremesso está na tela; `useOmenPlaying()` é o mesmo como hook, assinando os dois. Quem passa estado às funções puras (`trayBrokenAt`, `Show.frame`, `Hand`, o test hook) junta os dois com `{ ...arremesso(), ...useDice.getState() }` ou com os campos necessários.

- A falha `'physics'` (nem o worker nem o cálculo local conseguem simular: os dados voltam à mão e o painel avisa) vive em `shared/plataforma` (`falha()`), não no store.
- Movimento reduzido **não** é campo do store: vive em `shared/plataforma` (`movimentoReduzido()`, `useMovimentoReduzido()`, `definirMovimentoReduzido`, evento `aoMudarMovimentoReduzido`). `App.tsx` chama `observarPreferenciaDoSistema()`, que segue `prefers-reduced-motion`. Desliga presságios e voo; o assinante do presságio, `MaoDoArremesso`, `Hand`, `Tray` e o `window.__dice.state().reducedMotion` leem `movimentoReduzido()`. O `useDice` assina o evento no carregamento e, a cada `true` (mesmo repetido), descarta o presságio (`omen: null`).

Regras:

- Toda mudança da mão (`adicionar`/`remover`/`definir` de `selecao`, que emitem `selecaoAlterada`) e o `reiniciar` passam por `selection()`: fase volta a `hand`, `throwId++`, limpa `launch`/`results`/`force`. A reação a `selecaoAlterada` é um único `set`, com a cópia `dice` junto.
- `input(event, hand?)` roda o reducer; se o efeito é `throw`, cria **num único `set`** o `Launch` com `throwId` novo, semente `crypto.getRandomValues`, cópia do `aim`, força e movimento da mão.
- `publish(throwId, results, raw)` só tem efeito se `throwId` é o atual **e** a fase é `rolling`. Faz um `set` com resultado, `raw` e transição `published` e, logo depois, de forma síncrona, emite `resultadoPublicado({ throwId, dice, results, raw, force })`. O presságio é decidido por um assinante desse evento no `useDice` (`omenRig ?? omenOf(omenKinds(dice), results)`, `null` com movimento reduzido), que faz `set({ omen, omenAt })`: são dois `set` no mesmo tique (o React agrupa e o `useFrame` lê no quadro seguinte). Só um `assinarArremesso` veria o resultado sem o presságio; nenhum assinante lê `omen`. A casca (`App.tsx`) assina o mesmo evento para gravar o histórico (`registrarArremesso`).

## Linha do tempo de um arremesso

1. **Mira** — `MaoDoArremesso` (`arremesso/scene/MaoDoArremesso.tsx`) faz raycast do ponteiro no plano y=0 e grava `clampTarget(hit)`. Setas movem 0,5. Os dados na mão (cinemáticos) giram num redemoinho (`arremesso/domain/vortex.ts`): cada um numa órbita inclinada (planos de Fibonacci, `ORBITS`) e girando no próprio eixo, separados entre si; o centro segue `aim.x` e a velocidade cresce com a carga. A mão balança conforme a velocidade da mira (`omega`).
2. **Carga** — `pointerdown`/Espaço → `press`. A cada quadro `force = charge(agora - chargeStart, chargeMode)`: **relativa** = onda triangular 0→1→0, ciclo 1400 ms; **estática** = sobe até 1 em 700 ms e fica em 1 (o máximo de `LAUNCH`, com o redemoinho na velocidade máxima) até soltar. A seta (`ArrowHelper`) muda de cor/tamanho com a força.
3. **Soltura** — `release` → store cria `Launch` com `handCenter`/`handOmega` reais.
4. **Pré-simulação** — `LoopDoArremesso` (`arremesso/scene/LoopDoArremesso.tsx`, dentro de `useBeforePhysicsStep`) detecta `throwId` novo, captura as poses atuais dos corpos e manda `RollRequest { dice, start, launch, customs, bias? }` ao worker (`arremesso/domain/presim.worker.ts`, criado por `criarWorkerDePresimulacao()` do `index.ts`); `bias` só existe com um botão de teste de presságio ligado (`omenTest`, que ainda mora no `useDice` e chega ao laço por uma prop-getter da casca; `kinds` vem de `omenKinds`, do `index.ts`) e faz `presimulateFor` procurar, dentro de `BIAS_BUDGET`, uma semente que produza aquele presságio. Sem worker, ou sem resposta em 2 s (`WORKER_TIMEOUT`, mais `BIAS_BUDGET.worker` com `bias`) → `presimulateFor` síncrono na thread principal (fallback); se ele também falhar, os dados voltam à mão com `error: 'physics'`.
5. **Replay** — a cada passo físico aplica `rec.frames[at]` via `setNextKinematicTranslation/Rotation`. Os corpos da cena continuam **cinemáticos** o tempo todo; quem simula dinâmica é só o mundo offline.
6. **Publicação** — no último quadro, fixa a pose final com `setTranslation/setRotation` **antes** de `publish(throwId, rec.results, rec.raw)`.
7. **Settled** → apresentação (presságio, voo, números). Clique/Espaço → `returning`.
8. **Retorno** — `MaoDoArremesso` interpola as poses até os lugares do redemoinho (`restingPlaces`) em 400 ms (150 ms com reduced motion), fixa a pose final e só então emite `returned`.

Descartes por `throwId`: resposta do worker de arremesso antigo, publish atrasado, seleção trocada no meio — tudo comparado com `arremesso().throwId` e fase `rolling`.

## Pré-simulação (`arremesso/domain/presim.ts`)

`presimulate(dice, start, launch, perturb?) → Recording { frames, raw, results, timedOut, escaped, recovered }`

- Cria um `RAPIER.World` próprio (`GRAVITY`, `STEP = 1/60`), bandeja de `trayColliders()` (chão, 4 paredes, tampa em y=7), um corpo por dado com CCD e `DAMPING` por shape.
- Colisor: `convexHull(poly.points)`; moeda usa `roundCylinder` (casco fino balança para sempre).
- `applyLaunch`: torna dinâmico, velocidade linear `launchVelocity(handCenter, target, force)`, angular = giro da mão + `spin(seed, i)`.
- Loop até `SETTLE.timeoutSteps` (240 = 4 s): `world.step()` → trava rotação de moeda lenta e deitada → `stepSettle` → `applySettle` → grava quadro. No `reveal`, lê `readUp` de cada pose e converte com `toResults` (dado de forma livre, `readsDown`: lê a face de baixo, ver dados.md).
- Determinístico: mesmos inputs → mesma gravação (testado em `src/modules/arremesso/tests/physics.test.ts`).
- `perturb` existe só para testes (forçar fuga/timeout).

## Parada (`arremesso/domain/settle.ts`, puro)

`stepSettle(state, { throwId, phase, radii, bodies })` → `wait | recover | reveal`. Prioridade:

1. Outro `throwId`, fase ≠ `rolling` ou já concluído → `wait` sem contar.
2. Lista de corpos incompleta → `wait`.
3. `steps >= SETTLE.timeoutSteps` → `reveal(timedOut: true)` (corpos fora vão para `recoveryPoint`).
4. Algum corpo fora (`isOutside` usa o raio, não só o centro) → `recover` (zera calma).
5. Todos com `speed < 0.08` e `spin < 0.15` por `calmSteps` (12) seguidos → `reveal(false)`.

Não lê faces: o valor sai das poses do `reveal`.

## Aplicação nos corpos (`arremesso/domain/apply.ts`)

Único lugar que muda tipo de corpo, velocidade e pose — usado pela cena e pelos testes Node. `applyLaunch`, `toKinematic`, `applySettle`, `bodyStates`.

## Constantes (`arremesso/domain/world.ts`)

| Constante | Valor | Uso |
|---|---|---|
| `STEP` / `GRAVITY` | 1/60 / y = -40 | mundo offline e `<Physics>` da cena |
| `TRAY` | interior 14×9, parede 1,5, tampa y=7 | `+z` é a borda do jogador |
| `MATERIAL` | die, velvet (chão), wall | atrito/restituição/densidade |
| `LAUNCH` | velocidade 6–22, lift 0,35 | `launchVelocity` |
| `SPIN` | 10–25 rad/s | `spin` |
| `SETTLE` | 240 passos, 12 calmos, 0,08 / 0,15 | `stepSettle` |
| `HAND` | y 3, z 3, espaçamento 1,9, 5 colunas | `handPositions` (testes de física), `clampHandX` |
| `VORTEX` (`arremesso/domain/vortex.ts`) | raio, ritmo, ganho com a carga | redemoinho da mão (`stepWhirl`, `spinAngle`) |
| `DAMPING` | d100 e moeda | rolam demais sem amortecimento |
| `RAIO_MAXIMO` (de `dados`) | 0,9 | precisa bater com `max(RADIUS)` (há teste) |

Ajuste de "sensação" do arremesso = mexer aqui. Os testes de física usam os mesmos valores.

## Worker

`criarWorkerDePresimulacao()` (no `index.ts` do módulo: `new Worker(new URL('./domain/presim.worker.ts', import.meta.url), { type: 'module' })`); a casca não aponta para o arquivo do worker. `customs` (`customsOf(dice)`) leva o poliedro de cada dado importado da seleção; o worker os registra com `registerPoly` antes de `presimulate` (ele não tem o registro do app; o fallback síncrono tem). Inicializa o Rapier assim que a cena monta (aquece enquanto o jogador mira). Erro de init, `onerror` ou `onmessageerror` → `fallback()` termina o worker e simula na thread principal. Acrescenta ~2,4 MB ao build (WASM do Rapier).
