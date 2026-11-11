# Arremesso: input → física → resultado

Cobre `store.ts`, `throw/*`, `physics/*`, `scene/Stage.tsx` (ThrowLoop) e a parte de input/mão de `scene/Hand.tsx`. O que acontece **depois** de publicar está em [apresentacao.md](apresentacao.md).

## Ideia central

O resultado é decidido **no momento do arremesso**, não lido ao vivo. Ao soltar, o arremesso inteiro é simulado offline com o Rapier real (`presimulate`), gravando uma pose por corpo por passo. A cena então **reproduz** a gravação, um quadro gravado por passo físico, e publica o resultado no último quadro. É uma rolagem física de verdade, mostrada em tempo real, cujo valor já é conhecido.

## Fases (`throw/gesture.ts`, reducer puro)

```
hand --press--> charging --release(mesma origem)--> rolling --published--> settled --press--> returning --returned--> hand
         charging --cancel--> hand          selection (qualquer fase) --> hand
```

- `Source` = ponteiro (`pointerId`) ou tecla. Só a mesma origem solta; `repeat` de tecla é ignorado.
- `release` devolve `Effect { type: 'throw', force: charge(ms) }`; `press` em `settled` devolve `{ type: 'return' }`.
- Gestos em `rolling`/`returning` são ignorados.

## Store (`store.ts`)

Um store zustand `useDice`. Campos que importam:

- `dice: DieKind[]` — seleção, um item por dado, sempre ordenada por `KINDS` (`sortDice`), 1..`MAX_DICE` (10).
- `gesture`, `throwId`, `aim`, `force`, `launch`, `results`, `raw`.
- `omen`, `omenAt`, `omenDone`, `showcased` — sincronizam apresentação (ver apresentacao.md).
- `reducedMotion` — vem de `prefers-reduced-motion` em `App.tsx`; desliga presságios e voo.

Regras:

- Toda mudança de seleção (`addDie`/`removeDie`/`setDice`) passa por `selection()`: fase volta a `hand`, `throwId++`, limpa `launch`/`results`/`force`.
- `input(event, hand?)` roda o reducer; se o efeito é `throw`, cria **num único `set`** o `Launch` com `throwId` novo, semente `crypto.getRandomValues`, cópia do `aim`, força e movimento da mão.
- `publish(throwId, results, raw)` só tem efeito se `throwId` é o atual **e** a fase é `rolling`. Publica resultado + presságio + transição `published` juntos (um snapshot só para os assinantes).

## Linha do tempo de um arremesso

1. **Mira** — `Hand.tsx` faz raycast do ponteiro no plano y=0 e grava `clampTarget(hit)`. Setas movem 0,5. A mão (dados cinemáticos) segue `aim.x` com suavização; balança e gira conforme a velocidade da mira (`omega`).
2. **Carga** — `pointerdown`/Espaço → `press`. A cada quadro `force = charge(agora - chargeStart)` (onda triangular 0→1→0, ciclo 1400 ms). A seta (`ArrowHelper`) muda de cor/tamanho com a força.
3. **Soltura** — `release` → store cria `Launch` com `handCenter`/`handOmega` reais.
4. **Pré-simulação** — `ThrowLoop` (em `Stage.tsx`, dentro de `useBeforePhysicsStep`) detecta `throwId` novo, captura as poses atuais dos corpos e manda `RollRequest { dice, start, launch, customs }` ao worker (`presim.worker.ts`). Sem worker → `presimulate` síncrono na thread principal (fallback).
5. **Replay** — a cada passo físico aplica `rec.frames[at]` via `setNextKinematicTranslation/Rotation`. Os corpos da cena continuam **cinemáticos** o tempo todo; quem simula dinâmica é só o mundo offline.
6. **Publicação** — no último quadro, fixa a pose final com `setTranslation/setRotation` **antes** de `publish(throwId, rec.results, rec.raw)`.
7. **Settled** → apresentação (presságio, voo, números). Clique/Espaço → `returning`.
8. **Retorno** — `Hand.tsx` interpola as poses até `handPositions(...)` em 400 ms (150 ms com reduced motion), fixa a pose final e só então emite `returned`.

Descartes por `throwId`: resposta do worker de arremesso antigo, publish atrasado, seleção trocada no meio — tudo comparado com `useDice.getState().throwId` e fase `rolling`.

## Pré-simulação (`physics/presim.ts`)

`presimulate(dice, start, launch, perturb?) → Recording { frames, raw, results, timedOut, escaped, recovered }`

- Cria um `RAPIER.World` próprio (`GRAVITY`, `STEP = 1/60`), bandeja de `trayColliders()` (chão, 4 paredes, tampa em y=7), um corpo por dado com CCD e `DAMPING` por shape.
- Colisor: `convexHull(poly.points)`; moeda usa `roundCylinder` (casco fino balança para sempre).
- `applyLaunch`: torna dinâmico, velocidade linear `launchVelocity(handCenter, target, force)`, angular = giro da mão + `spin(seed, i)`.
- Loop até `SETTLE.timeoutSteps` (240 = 4 s): `world.step()` → trava rotação de moeda lenta e deitada → `stepSettle` → `applySettle` → grava quadro. No `reveal`, lê `readUp` de cada pose e converte com `toResults`.
- Determinístico: mesmos inputs → mesma gravação (testado em `tests/physics.test.ts`).
- `perturb` existe só para testes (forçar fuga/timeout).

## Parada (`throw/settle.ts`, puro)

`stepSettle(state, { throwId, phase, radii, bodies })` → `wait | recover | reveal`. Prioridade:

1. Outro `throwId`, fase ≠ `rolling` ou já concluído → `wait` sem contar.
2. Lista de corpos incompleta → `wait`.
3. `steps >= SETTLE.timeoutSteps` → `reveal(timedOut: true)` (corpos fora vão para `recoveryPoint`).
4. Algum corpo fora (`isOutside` usa o raio, não só o centro) → `recover` (zera calma).
5. Todos com `speed < 0.08` e `spin < 0.15` por `calmSteps` (12) seguidos → `reveal(false)`.

Não lê faces: o valor sai das poses do `reveal`.

## Aplicação nos corpos (`physics/apply.ts`)

Único lugar que muda tipo de corpo, velocidade e pose — usado pela cena e pelos testes Node. `applyLaunch`, `toKinematic`, `applySettle`, `bodyStates`.

## Constantes (`physics/world.ts`)

| Constante | Valor | Uso |
|---|---|---|
| `STEP` / `GRAVITY` | 1/60 / y = -40 | mundo offline e `<Physics>` da cena |
| `TRAY` | interior 14×9, parede 1,5, tampa y=7 | `+z` é a borda do jogador |
| `MATERIAL` | die, velvet (chão), wall | atrito/restituição/densidade |
| `LAUNCH` | velocidade 6–22, lift 0,35 | `launchVelocity` |
| `SPIN` | 10–25 rad/s | `spin` |
| `SETTLE` | 240 passos, 12 calmos, 0,08 / 0,15 | `stepSettle` |
| `HAND` | y 3, z 3, espaçamento 1,9, 5 colunas | `handPositions`, `clampHandX` |
| `DAMPING` | d100 e moeda | rolam demais sem amortecimento |
| `MAX_RADIUS` | 0,9 | precisa bater com `max(RADIUS)` (há teste) |

Ajuste de "sensação" do arremesso = mexer aqui. Os testes de física usam os mesmos valores.

## Worker

`new Worker(new URL('../physics/presim.worker.ts', import.meta.url), { type: 'module' })`. `customs` (`customsOf(dice)`) leva o poliedro de cada dado importado da seleção; o worker os registra com `registerPoly` antes de `presimulate` (ele não tem o registro do app; o fallback síncrono tem). Inicializa o Rapier assim que a cena monta (aquece enquanto o jogador mira). Erro de init, `onerror` ou `onmessageerror` → `fallback()` termina o worker e simula na thread principal. Acrescenta ~2,4 MB ao build (WASM do Rapier).
