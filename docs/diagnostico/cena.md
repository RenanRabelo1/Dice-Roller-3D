# Inventário fase 1: `src/scene/*` (+ leitura de `store.ts`, `testHook.ts`)

Somente leitura. Linhas = última linha lida pelo Read (o grafo conta +1). "inferência" = não conferido no código.
Grupos usados abaixo: **ARR** arremesso (input, mão, replay) · **VIS** dado visual · **APR** apresentação (presságio PRE, showcase/destaque SHW) · **MESA** mesa e fundo · **CASCA** casca/infra de cena.

---

## 1. Tabela por arquivo

| Arquivo | Linhas | Papel | Exports | Plataforma | Domínio |
|---|---|---|---|---|---|
| Stage.tsx | 336 | raiz da cena: ThrowLoop (worker/replay/publish), panorama, DPR, câmera, luzes, `<Physics>`, test hook | `Stage` | R3F, Rapier, three, drei, troika (só `instanceof Text`), Worker, DOM (`location`) | **misto** (ARR+MESA+CASCA+teste) |
| Hand.tsx | 363 | input DOM, redemoinho, carga/seta, retorno, showcase pós-resultado, números em destaque, movimento do dado no kraken/tempestade | `Hand` | R3F, Rapier (tipo), three, troika, DOM | **misto** (ARR+SHW+PRE+VIS) |
| Die.tsx | 227 | corpo cinemático + colisor + malha/material + numerais (BatchedText) + modelo importado (STL/GLB), pintura de tinta | `GEM`, `gemColor`, `FONT_URL`, `FONT`, `SYMBOL`, `usePainted`, `paintGlb`, `GemMaterial`, `Die` | R3F, Rapier, three, troika, import dinâmico | VIS (+ corpo físico e posição inicial ARR) |
| Tray.tsx | 57 | colisores fixos da bandeja + objeto visual da mesa ativa; esconde o piso na quebra do kraken | `Tray` | R3F, Rapier, three, import dinâmico | **misto** (MESA+PRE+física) |
| Backdrop.tsx | 29 | fundo foto/preset em CSS atrás do canvas | `Backdrop` | React DOM, FileReader | MESA |
| Omens.tsx | 258 | presságios 3D: `Bolt`, `TaiJi`, orquestrador `Show` (escolhe efeitos, relógio, fim), aquecimento de shaders | `Omens` | R3F, three, DOM (canvas p/ textura) | PRE (+ regra de escolha de efeito, + lê cores da MESA) |
| Kraken.ts | 271 | malha dos tentáculos (grab/storm), cacos do piso, rachaduras, abismo | `SHARD_DEFAULT`, `shardWood`, `shard`, `Kraken` | three | PRE (+ regra de cor dos cacos derivada da MESA) |
| krakenMotion.ts | 117 | linha do tempo pura kraken/tempestade, pose do d100, quebra da bandeja, células de fratura, util `span` | `span`, `KRAKEN`, `FAR`, `krakenIndices`, `trayBrokenAt`, `krakenAt`, `krakenDieAt`, `STORM`, `stormIndices`, `stormAt`, `stormDieAt`, `fractureCells` | puro (three math: Vector3/Quaternion/MathUtils) | PRE (+ `trayBrokenAt` = regra que a MESA consome) |
| Fire.ts | 125 | partículas de fogo em shader + feltro queimado | `Fire` | three (ShaderMaterial) | PRE |
| fireMotion.ts | 24 | linha do tempo pura do fogo | `FIRE`, `fireIndices`, `fireReach`, `fireAt` | puro (MathUtils) | PRE |
| showcase.ts | 46 | poses do "voo até a câmera" (grade na frente da câmera) | `Pose`, `View`, `CAPTION`, `showcasePoses` | puro (three math) | SHW |
| highlight.ts | 28 | linha do tempo do número em destaque | `SHOW`, `HL_SIZE`, `easeOut`, `Highlight`, `highlightAt` | puro (Vector3) | SHW |
| inkGlow.ts | 78 | triângulos de tinta voltados para cima + malha de brilho (cache) | `UP_INK`, `upInk`, `glowMesh` | three (puro + cache de módulo) | SHW (sobre dado importado VIS) |
| tableTheme.ts | 103 | tipos do tema, padrão, presets CSS, limites, validação, extras do .glb | `FeltTexture`, `PresetName`, `Background`, `PanoramaFormat`, `TableTheme`, `DEFAULT_ID`, `DEFAULT_THEME`, `PRESETS`, `LIMITS`, `isHex`, `clamp*` (6), `checkTheme`, `ThemeExtras`, `EXTRAS_KEY`, `extrasOf`, `readExtras`, `fileSafe` | puro | MESA |
| tableState.ts | 73 | store zustand `useTable` + debounce de gravação + listener `pagehide` | `TableState`, `useTable` | zustand, DOM (`addEventListener`) | MESA |
| tableStore.ts | 11 | IndexedDB `tables` + `localStorage['mesa.ativa']` | `listTables`, `saveTable`, `deleteTable`, `activeId`, `setActiveId` | IndexedDB, localStorage | MESA |
| tableTextures.ts | 43 | texturas de feltro (veludo/couro em canvas, imagem do jogador) | `feltMap` | three, DOM canvas | MESA |
| tableImages.ts | 128 | redução de imagem, decodificador, panorama LDR/HDR (cache), picture p/ .glb | `TableError`, `reduceImage`, `blobOfImage`, `isOpaque`, `warmImageDecoder`, `markSoftwareGl`, `preparePanorama`, `panoramaTexture`, `panoramaPicture` | three, DOM (canvas, createImageBitmap), import dinâmico HDRLoader | MESA (+ flag de renderizador da CASCA) |
| tableBuild.ts | 106 | monta a mesa padrão, nomes/papéis, sombras, cores reais, descarte | `GUIDE`, `PLACEHOLDER`, `isPlaceholder`, `SURFACE`, `defaultTable`, `backdrop`, `shade`, `buildDefault`, `disposeTable`, `colorsOf`, `roleOf`, `find` | three | MESA |
| tableFile.ts | 188 | sob demanda: `buildFor`, exportar/importar .glb, encaixe e avisos | `buildFor`, `exportTable`, `cleanTable`, `fitTable`, `ImportedTable`, `readTable` | three, GLTFExporter, `parseGlb` (dice/importer) | MESA |
| (apoio) store.ts | 147 | store `useDice` | `DiceError`, `omenPlaying`, `useDice` | zustand, IndexedDB via customStore, `crypto`, `performance.now` | ARR+APR+dados importados (fora do escopo deste agente) |
| (apoio) testHook.ts | 35 | contrato `DiceHook` + `installTestHook` | `DiceHook`, `installTestHook` | DOM (`window`) | teste |

---

## 2. Arquivos mistos: faixas, amarras, corte

### 2.1 Stage.tsx

| Faixa | Responsabilidade (domínio) |
|---|---|
| 1–24 | imports (puxa ARR, VIS, MESA, PRE, teste, `ui/Safeguard`) |
| 26 | `WORKER_TIMEOUT = 2000` (ARR) |
| 27–28 | `isPreview()` modo de teste `surface-preview` (teste/CASCA) |
| 30–98 | **`ThrowLoop`** (ARR): worker (50–64), `fallback` (38–49), `live()` (65), replay em `useBeforePhysicsStep` (68–96), publish (88–95) |
| 100 | tipo `Pano` (MESA) |
| 102–106 | assinaturas: `useDice(dice)` (VIS/ARR), `useTable(theme.background)` (MESA), `useThree` (CASCA) |
| 107–113 | detecção SwiftShader → DPR 0,35 + `markSoftwareGl()` (CASCA, efeito colateral na MESA) |
| 114–132 | panorama: carrega textura (118–124), aplica só "entre animações" em `useFrame` (125–132) (MESA, com regra de fase de ARR/APR) |
| 133–139 | refs `info`, `bodies` (registro de corpos compartilhado), `launches`, `dice` (grupo), `recordLaunch` (CASCA/teste) |
| 140–150 | `adjustDpr` + `useFrame` que aplica DPR "entre animações" (CASCA, regra de fase) |
| 151–153 | `register(index, body)` (CASCA ↔ VIS) |
| 155–192 | enquadramento da câmera em retrato (CASCA; usa `TRAY`, `HAND`, `handPositions`, `vortexCenter/Radius`, `VORTEX` de ARR) |
| 194 | `numbersOf(i)` (teste, procura `die-${i}` e `userData.labels`) |
| 196–295 | `installTestHook({...})` (teste; lê tudo, ver §7) |
| 296 | `useDice.getState().setReady()` (ARR: prontidão!) dentro do efeito do test hook |
| 300–335 | JSX: `PerformanceMonitor` 303–304 (CASCA), `<color attach>` 306 (MESA), luzes 307–310 (CASCA), `EnvironmentPortal` + Lightformers 313–319 (MESA panorama + CASCA iluminação), `Guard kind="physics"` 320, `<Physics>` 321, `Tray` 322 (MESA), `Hand` 323 (ARR/APR), `ThrowLoop` 324 (ARR), grupo de `Die` 325–330 (VIS), `Omens` 333 (PRE, fora do `<Physics>`) |

**Amarras:** ref `bodies` (134) é o registro de corpos: escrito por `Die` via `register` (151), lido por `ThrowLoop` (65), `Hand` (75–80), `Omens` (254), test hook (203, 212, 219, 288). `recordLaunch` callback ThrowLoop→Stage (137–139) só serve ao test hook. O predicado "entre animações" `phase==='hand' || (phase==='settled' && showcased===throwId)` está duplicado em 128 e 148. `setReady` acoplado ao efeito do test hook (deps `[camera, gameArea, key, selected, scene]`).

**Corte sugerido:**
- `ThrowLoop` → módulo **arremesso** (replay). Interface necessária: porta de registro de corpos (`liveBodies(): RigidBody[]`, "seleção completa?"), `customsOf` (dados), fábrica do worker.
- 114–132 + 306 + 313–319 (props do portal) → módulo **mesa/fundo** como `<SceneBackground/>`; precisa do predicado `isBetweenAnimations(state)` exportado por arremesso/apresentação (hoje inline).
- 107–113, 140–150, 303–304 → **casca** `<AdaptiveDpr/>`; `markSoftwareGl` vira parâmetro/capacidade publicada pela casca (`renderTier`) lida pela mesa, ou argumento de `panoramaTexture`.
- 155–192 → casca, consumindo de arremesso um `handEnvelope()` (pontos extremos de mão/redemoinho) em vez de importar `HAND`/`VORTEX`/`handPositions`.
- 196–295 → ponte de teste montada por partes (cada módulo contribui o seu trecho do `DiceHook`); `setReady` (296) sai do test hook e vai para o registro de corpos/arremesso.
- Composição JSX fica na casca.

### 2.2 Hand.tsx

| Faixa | Responsabilidade (domínio) |
|---|---|
| 1–19 | imports (ARR, SHW, PRE `krakenMotion`, VIS `Die`, dados `custom`/`symbols`) |
| 21 | tipo `Mark` (SHW) |
| 23–24 | `shade(gem, on)` liga/desliga `castShadow` nas malhas do dado (VIS manipulado por ARR/SHW) |
| 29–37 | refs de ARR: `motion`, `previousAim`, `handX`, `whirl`, `whirled`, `rotations` |
| 37 | `mode` (detector de transição de fase, **compartilhado** por todas as partes) |
| 38 | `returning` (ARR retorno) |
| 39 | `showcase` (SHW + snapshot `kraken`/`storm`/`omenAt` de PRE) |
| 40–67 | criação dos `Text`/glifos em destaque no grupo `result-highlights` (SHW) |
| 68–72 | `dropGlows` (SHW/VIS) |
| 73–74 | `arrow` (ARR), `preview` (teste) |
| 75–80 | `live()` corpos válidos da seleção atual e `ready` (ARR/CASCA) |
| 82–146 | listeners DOM no `gameArea`: press/release/cancel/mira por ponteiro e teclado, blur (ARR input) |
| 148–357 | **um único `useFrame`**: |
| 149–158 | preparação comum (`current = live()`, `now`, `dt`, `nextMode`) |
| 153 | visibilidade da seta (ARR) |
| 159–164 | `setOpacity`, `shadows` → escrevem material/sombra do dado (VIS) |
| 165–183 | entrada em hand/charging: cinemático, slots do redemoinho, rotações, opacidade 1 (ARR) |
| 184–190 | entrada em returning: captura poses (ARR) |
| 191 | esconde números/brilhos fora de `settled` (SHW) |
| 192–247 | entrada em settled: `from`/`to` (`showcasePoses`), regra `above`, índices kraken/tempestade (PRE), `marks`, glifos/números, `glowMesh` adicionado dentro de `die-${i}` (SHW+PRE+VIS) |
| 248 | `mode.current = nextMode` |
| 249–313 | animação em settled: espera do presságio (251–252), modo reduzido (270–274), **pose do d100 no kraken/tempestade** (277–287, PRE), voo comum (288–298), brilho/número/moeda (299–307), `setShowcased` (309–311) (SHW+PRE) |
| 314–333 | animação de retorno + `input({type:'returned'})` (ARR) |
| 334–356 | hand/charging: `charge`→`setForce`, centro da mão, `omega`, `stepWhirl`, alvos cinemáticos, `motion`, seta (ARR) |
| 359–362 | JSX: `<arrowHelper>` (ARR), `<group name="result-highlights">` (SHW) |

**Amarras:** mesmo `useFrame` com `return` precoce por fase (exclusão mútua implícita); `mode` ref usado pelas três entradas de fase; `current` (de `live()`) compartilhado; `whirl` usado por hand (342) e retorno (318); `handX` escrito no fim do retorno (329) e lido em hand (337); `setOpacity` usado por hand (182) e retorno (327); `showcase.current` lido em 192 (re-entrada por reduced motion) e por `dropGlows`; `bodies` (prop do Stage). Pose de corpo é escrita por Hand em hand/charging/settled/returning e por ThrowLoop em rolling: contrato de "quem é dono da pose em cada fase" implícito.

**Corte sugerido:** `ThrowHand` (ARR: 29–38, 73–146, 165–190, 314–356, arrow) e `Showcase` (APR: 39–72, 191–313, grupo `result-highlights`). Interfaces necessárias:
1. registro de corpos (`live()`), hoje duplicado com critérios diferentes (Stage:65 sem filtro de seleção; Hand:75–80 com `userData.selection` + `ready`);
2. contrato de posse da pose por fase (cada parte só escreve na sua fase);
3. detector de transição por parte (cada um com seu `mode`);
4. API do dado visual: `setDieOpacity(i, o)`, `setDieShadow(i, on)`, `dieGroup(i)`/`gem(i)` (hoje via `scene.getObjectByName`), `gemColor`, `FONT`, `FONT_URL`, `SYMBOL`;
5. presságio exporta "movimento do dado no presságio" (`omenDieMotion(i, ms, from, to) → {pose, reveal, shadow, done} | null`) no lugar de Hand importar `KRAKEN/STORM/krakenDieAt/stormDieAt/krakenAt/stormAt/krakenIndices/stormIndices` (18, 214–215, 277–287);
6. tipo `Pose` e `easeOut` precisam sair de `showcase.ts`/`highlight.ts` para um núcleo comum, senão Showcase→presságio→showcase vira ciclo (§5).

### 2.3 Omens.tsx
- 18–25 utilitários locais (`clamp01`, `easeOut` cúbico, `easeIn`) — duplicam `highlight.ts`.
- 27–36 textura de brilho em canvas (DOM).
- 38–103 `Bolt` (raio, PRE render). 105–158 `TaiJi` (dualidade, PRE render).
- 162–241 `Show`: construção/compile/hide/dispose (render) **e** regras de orquestração 193–230: quando há presságio vivo (196), quais efeitos (199–209: raio só em `kind==='crit'` sobre d20; kraken, tempestade, fogo pelos `*Indices`), duração `omenMs` (209), fogo continua depois do fim (212–218), parada por `omenPlaying` (219), fim devolve `throwId` uma vez (225–229). Lê `useTable.getState().colors` (203, MESA).
- 243–258 componente: `useMemo(new Show)`, compile no mount (247), aquecimento após `scene.environment` e `frame>5` sem presságio (250–252), posições dos dados via `bodies` (254), `setOmenDone` (255).
- **Corte:** regra 199–209 → função pura `omenPlan(omen, dice)` no módulo presságio; cores da mesa entram por parâmetro (`<Omens tableColors=...>`) ou pelo index da mesa, nunca lendo o store dela.

### 2.4 Tray.tsx
- 11–15 `broken()` lê `useDice` e chama `trayBrokenAt` (PRE).
- 19–37 tema → mesa rápida/lenta, compile, descarte, `setColors` (MESA; escreve no `useTable`).
- 38–47 esconder `tray-surface` por `useLayoutEffect` + `useFrame` (PRE executado na MESA).
- 48–56 `RigidBody fixed` + `trayColliders()` + `MATERIAL` (física, hoje dono `physics/world`).
- **Corte:** a mesa expõe `surfaceObject()`/`setFloorHidden(on)` ou recebe `floorHidden: () => boolean` da casca; a regra fica no presságio. Colisores podem ir para um componente próprio de arremesso/física.

### 2.5 Die.tsx
- 14–38 paleta, fontes, tintas (VIS, regras de aparência). 40–83 numerais (VIS). 85–110 modelo importado sob demanda (VIS). 112–154 pintura de tinta (VIS; `usePainted`/`paintGlb` também usados por `ui/ImportDie`). 156–167 `GemMaterial` (VIS; `transparent` porque o retorno de Hand faz fade, 161).
- 169–227 `Die`: registro do corpo (173–175, CASCA), assinatura `useDice.customs` (186), aquecimento de material (192–204), `RigidBody kinematicPosition` + `ConvexHullCollider` + `MATERIAL.die` (209–211, física), posição inicial `vortexCenter(count,0)` (210, ARR), `userData={{selection}}` (210, lido por Hand:78).
- **Corte:** separar corpo físico (registro + colisor + posição inicial vinda por prop) da aparência (`DieLook`).

### 2.6 Outros conferidos
- **Kraken.ts**: 14–20 `SHARD_DEFAULT`/`shardWood` = regra de cor da mesa (madeira padrão `#3b2416` hard-coded, = `DEFAULT_THEME.wood.color`); 94/118 recebe cores por parâmetro (bom). Fora isso, PRE puro de render.
- **krakenMotion.ts**: 26–30 `trayBrokenAt` é a ponte PRE→MESA; 9 `span` é util genérico usado por fireMotion, Omens, Kraken. 7 importa `Phase` de `throw/gesture`.
- **tableImages.ts**: 53–54 flag `softwareGl` escrita pela CASCA (Stage:112).
- Demais (`Fire`, `fireMotion`, `showcase`, `highlight`, `inkGlow`, `table*` restantes, `Backdrop`): domínio único.

---

## 3. Acesso a dados

### 3a. `useDice` em `src/scene` (campo lido / ação chamada)

| Arquivo:linha | Lê | Chama |
|---|---|---|
| Stage.tsx:40–41 | `throwId`, `gesture.phase`, `dice` (45) | `setDice(state.dice)` 45, `setError('physics')` 46 |
| Stage.tsx:55–56 | `throwId`, `gesture.phase` | — |
| Stage.tsx:69 | `gesture`, `throwId`, `launch`, `dice` | `publish` (94: `publish(throwId, rec.results, rec.raw)`) |
| Stage.tsx:77 | — | `setError(null)` |
| Stage.tsx:103 | `dice` (assinatura React) | — |
| Stage.tsx:127, 146 | `gesture`, `showcased`, `throwId` | — |
| Stage.tsx:199–207 | `dice`, `gesture.phase`, `throwId`, `results`, `ready`, `error`, `aim`, `showcased`, `omen`, `omenDone`, `reducedMotion`, `omenAt` | — |
| Stage.tsx:210 / 211 / 263 / 287 / 296 | `customs` (263), `gesture.phase` (287) | `setDice` 210, `rigOmen` 211, `setReady` 296 |
| Hand.tsx:31 | `aim` | — |
| Hand.tsx:76–79 | `dice`, `ready` | — |
| Hand.tsx:87–99 | `gesture.phase`, `gesture.source` | `input({cancel})` 87, `input({press,pointer})` 97 |
| Hand.tsx:102 | — | `input({release,pointer}, motion)` |
| Hand.tsx:106–111 | `gesture.phase` | `setAim(clampTarget(hit))` 111 |
| Hand.tsx:117–131 | `aim`, `gesture.phase` | `input({press,key})` 117, `setAim` 125, `input({release,key}, motion)` 131 |
| Hand.tsx:150–356 (useFrame) | `gesture.phase` 150, `dice` 156/200/210/215/236–239/302/306/318/342, `aim` 181/317/337–340/352, `reducedMotion` 192/208/315–327/339/342/345, `raw` 197–199, `throwId` 197/214/244/245, `omen` 214, `omenAt` 244, `showcased` 310, `gesture.chargeStart` 335; `omenPlaying(state)` 251 (`gesture`, `omen`, `omenDone`, `throwId`) | `setShowcased` 197/245/310, `input({returned})` 330, `setForce` 336 |
| Die.tsx:186 | `customs` (assinatura) | — |
| Omens.tsx:194–209 | `omen`, `throwId`, `gesture.phase`, `dice`, `omenAt` | — |
| Omens.tsx:219 | `omenPlaying(s)` | — |
| Omens.tsx:250 / 255 | `omen` | `setOmenDone(done)` 255 |
| Tray.tsx:13–14 | `gesture.phase`, `throwId`, `omen`, `omenDone`, `omenAt`, `dice`, `reducedMotion` | — |

Registro de módulo de `dice/custom` lido direto (não pelo store): Die.tsx:23 (`customDie` em `gemColor`), Hand.tsx:210, 236.

Notas: `omenPlaying` (store.ts:61–62) é regra de apresentação morando no store. `ready` só vai a `true` (store.ts:117) e nunca volta a `false`.

### 3b. `useTable` (tableState.ts)

| Campo/ação | Tipo / efeito | Persistido? quando |
|---|---|---|
| `theme` | `TableTheme` ativo | registro em IndexedDB `tables` (via `persist`), exceto `id==='padrao'` (27) |
| `tables` | `TableTheme[]` salvos | cada item é um registro `tables` |
| `sessionOnly` | `boolean`, vira `true` em qualquer falha de load/save/delete (28, 46, 63); nunca volta a `false` | não |
| `colors` | `{felt, wood}` "o que a mesa realmente mostra" | não |
| `load()` 41–47 | `listTables()` + `activeId()`; `set({tables})`; `activate(found)` se achar | lê IDB + localStorage |
| `apply(theme)` 48 | `activate` + `persist(now)` | grava já |
| `edit(patch)` 49–55 | se ativo é o padrão, cria `id` novo, nome "Minha mesa", `setActiveId` (52), adiciona em `tables`; `colors` acompanham o tema só sem modelo (53) | grava com debounce 300 ms (30) |
| `copy()` 56–60 | novo id, `"<nome> (cópia)"` cortado em 40 | grava já |
| `remove(id)` 61–66 | cancela **qualquer** gravação pendente (62), `deleteTable`, tira da lista, volta ao padrão se era o ativo | apaga do IDB |
| `reset()` 67 | `activate(DEFAULT_THEME)` → remove `mesa.ativa` | só localStorage |
| `setColors(c)` 68 | sobrescreve `colors` | não |
| módulo 22–23, 73 | `timer`, `unsaved`; `pagehide` → `unsaved?.()` | grava pendente ao fechar |

`activate` (32–38): `setActiveId(id|null)` (localStorage), `theme`, `colors` = cores do tema, upsert em `tables`.

**Quem lê/escreve em todo `src/`:**
- App.tsx:18 → `load()`.
- Backdrop.tsx:8 → lê `theme.background` (assinatura).
- Stage.tsx:104 → lê `theme.background` (assinatura); 265 `theme` (getState, test hook); 276 `tables.length` (test hook).
- Tray.tsx:20 → lê `theme` (assinatura); 37 → **escreve** `setColors(colorsOf(table) ?? cores do tema)`.
- Omens.tsx:203 → lê `colors` (getState).
- ui/TablePanel.tsx:14 → lê `theme`, `tables`, `sessionOnly`; chama `edit` (40, 49, 51, 136, 137, 142, 152, 157), `apply` (82, 176, 187), `copy` (163), `remove` (188), `reset` (164).
- **`colors` tem dois escritores** (tableState `activate`/`edit` e Tray:37); o último a escrever é Tray (efeito após render), então a cena é a fonte de verdade de fato.

### 3c. IndexedDB / localStorage da mesa
- Banco `dice-roller` v2 (indexedDb.ts:3, 11), stores `customDice` e `tables`, ambos `keyPath: 'id'` (12). `opened` (7) é singleton de módulo.
- Store `tables` (tableStore.ts:5–7): valor = `TableTheme` inteiro (com `Blob` de imagem/panorama/textura e `ArrayBuffer` do modelo .glb). `listTables` filtra `version === 1` e ordena por `createdAt` (5). `saveTable` = `put`, `deleteTable` = `delete(id)`.
- `localStorage['mesa.ativa']` (tableStore.ts:9–11) = id do tema ativo; removido quando o ativo é o padrão; erros engolidos.
- Quando: leitura em `load()` (App mount); escrita em `apply`/`copy` (já), `edit` (300 ms), `pagehide`, `remove`; `mesa.ativa` em `activate` e `edit` a partir do padrão.
- Fora da mesa, mas mesmo padrão: `api/history.ts:13–14` usa localStorage (chave própria) — outro agente.

### 3d. Estado mutável de módulo, caches, singletons em `src/scene`
| Arquivo:linha | O quê | Escrito por | Lido por |
|---|---|---|---|
| tableState.ts:22–23 | `timer`, `unsaved` (debounce) | `persist`, `remove` | `pagehide` (73) |
| tableState.ts:73 | listener global `pagehide` registrado **no import** | — | — |
| tableImages.ts:53 | `softwareGl` | `markSoftwareGl()` ← Stage:112 | `loadPanorama` 76 |
| tableImages.ts:66 | `panoramas: WeakMap<Blob, Promise<Texture>>` (texturas nunca descartadas; inferência: retidas enquanto o Blob viver no store) | `panoramaTexture` | Stage:122, TablePanel:44, `panoramaPicture` 118 |
| tableTextures.ts:6 | `generated` (canvas veludo/couro) | `feltMap` | `feltMap` (clona por material) |
| tableBuild.ts:15–16 | `PLACEHOLDER` DataTexture única, compartilhada por todas as mesas | — | `defaultTable`, `disposeTable` (não descarta), `exportTable`, test hook (Stage:267 via `userData.placeholder`) |
| inkGlow.ts:28 | `kept: Map<string, BufferGeometry>` por `kind|valor`, nunca limpo | `glowMesh` | `glowMesh`; Hand descarta só o material (71) |
| Kraken.ts:10–11, krakenMotion.ts:11 | `UP`, `Z`, `FLESH`, `SKIN`, `TIP` (Vector3/Color de módulo) — mutáveis em tese, só lidos/clonados (conferido) | — | — |
| Die.tsx:16, 24, 28, 33, 38 | `GEM`, `EMBER`, `FONT`, `INK`, `GOLD` objetos exportados/consts | — | Die, Hand (FONT), ImportDie (GEM) |
| Omens.tsx:245 | `Show` por instância (`useMemo`), não módulo | — | — |
| Stage.tsx:134 | ref `bodies` = registro de corpos (estado mutável compartilhado por props) | Die (`register`), test hook `previewSurface` | ThrowLoop, Hand, Omens, test hook |

---

## 4. Regras de negócio na cena

### (i) Em arquivos puros (ou funções three sem componente)
1. **Kraken só se não houver falha**: `krakenIndices` = d100 críticos sem fumbles — krakenMotion.ts:20–21.
2. **Tempestade só se não houver crítico**: `stormIndices` — krakenMotion.ts:82–83.
3. **Fogo só se não houver crítico**: d20 (`isD20`) com falha — fireMotion.ts:12–13. (1–3 ⇒ dualidade anula kraken/tempestade/fogo.)
4. **Mesa quebrada**: falsa com reduced motion; só em `settled`, presságio do throw atual, não concluído, com d100 do kraken e `t ∈ [rupture, restored)` — krakenMotion.ts:26–30, 34.
5. Linhas do tempo: `KRAKEN` 16, `STORM` 80 (krakenMotion.ts); `FIRE` fireMotion.ts:10; `SHOW` highlight.ts:5. Duplicam `OMEN_MS` (dice/omen.ts:11: kraken 6500 = `KRAKEN.duration`, storm 4600 = `STORM.duration`) e o CSS (index.css:103 4600 ms, :106 delay 450 ms = `KRAKEN.rupture`, :113 1100 ms = `DUALITY_HIT`).
6. Pose do d100: fica no chão até `grab`, vai a `FAR` fora da tela, termina na pose do showcase em `shown` — krakenMotion.ts:51–76; tempestade 90–98.
7. Revelação do número no kraken/tempestade — krakenMotion.ts:41, 87.
8. **Layout do showcase**: 5 colunas em paisagem, 3 em retrato; distância mínima 6; fileiras com moeda +0,45; face sorteada para a câmera; `above` inverte a normal; erro se `raw` não tem rótulo — showcase.ts:18–46, 9, 12.
9. Destaque: sobe 550 ms, voo em 1000 ms, 650 ms, escalonado 70 ms; pulso 0,9 Hz — highlight.ts:5–28.
10. Cone da tinta acesa `UP_INK = 0.5` (~60°) e dono da face = mais próxima abaixo — inkGlow.ts:8–22.
11. Tema: `DEFAULT_THEME` (tableTheme.ts:20–24), `LIMITS` (33–38), clamps (42–47), `checkTheme` (50–64, **só usado em testes**), `extrasOf`/`readExtras` (76–101, nome cortado em 40), `fileSafe` (103).
12. Persistência: padrão nunca salvo (tableState.ts:27); editar o padrão cria "Minha mesa" (51); debounce 300 ms (30); `apply`/`copy` imediatos (48, 59); cópia "(cópia)" ≤ 40 (58); `remove` cancela pendente e volta ao padrão (62, 65); `colors` não seguem o tema com modelo (53); `listTables` só `version===1` (tableStore.ts:5).
13. Cor dos cacos: madeira `#3b2416` → `#815435`; outra madeira L×2,24 (≤ 0,85) — Kraken.ts:14–20.
14. Imagens: tamanho máx. (tableImages.ts:8), WebP 0,9 (16), panorama `.hdr` ≤ 25 MB, só jpg/png/webp/hdr (56–63), 2:1 com tolerância 1,9–2,1 (113), teto ÷2 com SwiftShader (76), HDR por média 2×2 e half float (97–108), HDR→8 bit `c/(1+c)` γ 2,2 (116–127).
15. Mesa padrão: tamanhos `BASE` 15×0,42×10, `FELT` 14×0,08×9 (tableBuild.ts:11), guia 14×1,5×9 (10), feltro sempre com mapa (13–17), sombras por papel (61–68), `colorsOf` (90–94), papel pelo nome com sufixo do Blender (99).
16. Feltro: repetição `14/tile × 9/tile`, tile padrão 2 (tableTextures.ts:39–40).
17. **Limites de arquivo da mesa**: 20 MB, vazio, 100 mil triângulos, textura 2048 px (`fundo` 4096, `fundo-360` 4096), remove luzes/câmeras — tableFile.ts:154–166, 67–72.
18. **Encaixe e avisos**: rotação X ∈ {0, ±90°} de menor dispersão, escala média geométrica, guia em (0, 0,75, 0); sem guia: piso 15×10 com topo em 0; sem ambos = erro; avisos de moldura dentro/baixa/ausente, piso fora de ±0,1, sem piso (modelo inteiro some na quebra) — tableFile.ts:85–149.
19. Fundo do arquivo: panorama vs. foto vs. `fundo-360` sem ajustes, avisos — tableFile.ts:170–186.
20. Exportação: JPEG para textura opaca, `fundo`/`fundo-360` substituídos, `tray-surface`→`piso` só no arquivo — tableFile.ts:23–64.

### (ii) Dentro de componente React/R3F ou classe three
1. **Timeout do worker 2000 ms → cálculo local**; descarta resposta de throw/fase antiga; falha do motor → `setDice` + `setError('physics')` — Stage.tsx:26, 38–49, 54–62, 83.
2. Sem worker, `presimulate` síncrono **sem try/catch** — Stage.tsx:79 (inferência: exceção dentro do callback do passo físico não é pega pelo `Guard`, que só pega erro de render).
3. **Replay e publicação**: espera todos os corpos (73), um quadro gravado por passo (84–87), fixa pose final antes de `publish` (88–95) — Stage.tsx.
4. **Regra do DPR**: SwiftShader começa em 0,35 (112); alvo entre 0,35 e o inicial, ×0,75 na queda / ×1,1 na folga (140–143), `PerformanceMonitor` 200 ms × 3, faixa 28–55 fps (303–304); aplica só "entre animações" (144–150); desligado no preview de teste (141).
5. **Panorama aplicado só entre animações** (mesmo predicado) — Stage.tsx:125–132; cor de fundo só para `kind==='color'` (306).
6. Enquadramento em retrato `aspect < 1.6`, folga 0,94 do FOV, mão de 20 corpos e redemoinho máximo — Stage.tsx:155–192.
7. `ready` liga junto com o test hook — Stage.tsx:296.
8. Input: press só em `hand`/`settled` e com `live()` (Hand.tsx:93–95); captura do ponteiro (99); mira só em `hand`/`charging` (107, 125); setas passo 0,5 (121–124); teclado só com foco na área (114, 129); blur da área/janela cancela (136, 138).
9. Redemoinho mantém slots numa seleção nova — Hand.tsx:170–175.
10. **Quando o showcase começa**: na entrada em `settled`; sem `raw` → `setShowcased` imediato (197); reduced motion → parado, `setShowcased` imediato (208, 245); enquanto `omenPlaying`, o relógio do showcase é reiniciado (251–252); `setShowcased` **um quadro depois de pousar** (309–311).
11. Regra `above`: dado importado gravado (`printed`) com `readsDown` é visto de cima — Hand.tsx:210; sem gravação achada, número na frente em `FONT.livre` (241).
12. Dados do kraken/tempestade não fazem o voo comum; sombra até `KRAKEN.grab`/`STORM.approach` — Hand.tsx:214–215, 278–286.
13. Moeda mostra o nome embaixo; face com símbolo sobe glifo — Hand.tsx:221–225, 306; escala do número (230); arco de 0,6 (293); sombra some na decolagem (290).
14. Retorno 400 ms (150 ms reduced), easing cúbico, fade com reduced motion, `returned` só após pose exata — Hand.tsx:315–331.
15. Força = `charge`, giro da mão `omega` (zero com reduced motion), suavização `exp(-12 dt)` — Hand.tsx:335–340.
16. **Presságio vivo** = `settled` + throw atual (Omens.tsx:196); raio só em `kind==='crit'` sobre d20 (200); efeitos escolhidos por `*Indices` (201–205); duração `omenMs` (209); fogo continua após o fim até a fase sair de `settled` (212–218); para quando `!omenPlaying` (219); fim → `setOmenDone` uma vez (225–229, 255); aquecimento após `environment` e `frame > 5` sem presságio (250).
17. Tempos do raio `FLASHES` (Omens.tsx:41) e da dualidade 2000–2600 (146).
18. Centro do kraken limitado a ±4,1 / ±2,1; braço 0 atrás do dado — Kraken.ts:110, 113.
19. **Quando a mesa quebra** (aplicação): `setVisible(surface, !broken())` em layout effect e a cada quadro — Tray.tsx:41–47.
20. Mesa lenta (modelo ou imagem de feltro) espera decodificar + `compileAsync`; a padrão aparece na hora e fica se a lenta falhar — Tray.tsx:22–36.
21. Material novo (tinta/fosco) só aparece após `compileAsync`; o sólido ideal fica no lugar — Die.tsx:192–204.
22. `gemColor`: cor escolhida do importado, senão gema da base (`livre`→d20) — Die.tsx:23; tinta por tipo (33–38); sem CCD (206–209); posição inicial `vortexCenter(count,0)` (210).
23. Backdrop: nada para cor/panorama; inset −2×blur; dim/100 — Backdrop.tsx:19–26.

---

## 5. Dependências entre grupos dentro de `src/scene`

Grupos: **MESA** (`table*`, Tray, Backdrop) · **PRE** (Omens, Kraken, krakenMotion, Fire, fireMotion) · **SHW** (showcase, highlight, inkGlow) · **VIS** (Die) · **ARR/CASCA** (Stage, Hand).

| De → Para | Arestas (arquivo:linha {símbolos}) |
|---|---|
| MESA → PRE | Tray.tsx:7 → krakenMotion {trayBrokenAt} |
| PRE → MESA | Omens.tsx:14 → tableState {useTable} (lê `colors`, 203) |
| PRE → SHW | krakenMotion.ts:5 → highlight {easeOut}; krakenMotion.ts:6 → showcase [type] {Pose}; fireMotion.ts:5 → highlight {easeOut} |
| SHW → * | nenhuma (showcase/highlight/inkGlow não importam nada de scene) |
| VIS → * | nenhuma dentro de scene |
| ARR/CASCA → VIS | Stage.tsx:14 {Die, gemColor}; Hand.tsx:17 {FONT, FONT_URL, gemColor, SYMBOL} |
| ARR/CASCA → MESA | Stage.tsx:15 {Tray}, :22 {useTable}, :23 {markSoftwareGl, panoramaTexture} |
| ARR/CASCA → PRE | Stage.tsx:17 {Omens}; Hand.tsx:18 {KRAKEN, krakenAt, krakenDieAt, krakenIndices, STORM, stormAt, stormDieAt, stormIndices} |
| ARR/CASCA → SHW | Hand.tsx:12,19 {CAPTION, showcasePoses, type Pose}, :13 {glowMesh}, :15 {easeOut, highlightAt, HL_SIZE, SHOW} |
| intra-PRE | fireMotion.ts:6 → krakenMotion {span}; Fire.ts:6 → fireMotion {fireAt, fireReach}; Kraken.ts:6 → krakenMotion {fractureCells, KRAKEN, krakenAt, span, stormAt}; Omens.tsx:12,13,15,16 → krakenMotion {krakenIndices, span, stormIndices}, Kraken, Fire, fireMotion {fireAt, fireIndices} |
| intra-MESA | Tray → tableBuild {buildDefault, colorsOf, disposeTable, SURFACE}, tableState, tableFile [dinâmico :32]; Backdrop → tableState, tableTheme {PRESETS}; tableBuild → tableTextures, tableTheme; tableFile → tableBuild, tableImages, tableTheme; tableState → tableStore, tableTheme; tableImages → tableTheme |

**Ciclos entre grupos (hoje):**
- **MESA ↔ PRE**: Tray→krakenMotion(`trayBrokenAt`) e Omens→tableState(`useTable.colors`). Único ciclo real hoje.

**Ciclos latentes (aparecem ao partir Hand/Stage):**
- **SHW ↔ PRE**: se a parte `settled` de Hand for para SHW, SHW→PRE (Hand:18, pose do d100) e PRE→SHW (`Pose`, `easeOut`). Quebrar movendo `Pose`/`easeOut`/`span`/`clamp01` para um núcleo comum (ou `Pose` para `physics/world` junto de `Vec3`/`Quat`).
- **intra-PRE**: `fireMotion→krakenMotion` só por `span`; se fogo e kraken virarem submódulos, `span` precisa de casa neutra.
- Fora de scene, já existentes: VIS→ARR (Die.tsx:12 `vortexCenter`), PRE→ARR (krakenMotion.ts:7 `Phase`), CASCA→ui (Stage.tsx:24 `Guard`, ciclo scene↔ui do grafo), ui→VIS (ImportDie→Die `GEM, GemMaterial, paintGlb, usePainted`), ui→MESA (TablePanel→tableBuild/tableImages/tableState/tableTheme/tableFile).

---

## 6. Acoplamentos fora dos imports

### Nomes de objeto de cena
| Nome | Quem nomeia | Quem procura |
|---|---|---|
| `die-${i}` | Die.tsx:212 | Hand.tsx:160 (opacidade), 236 (pai do brilho); Stage.tsx:194 (test hook) |
| `gem-${i}` (mesh ou group) | Die.tsx:215, 221 | Hand.tsx:164 (sombras), 233 (gems); Stage.tsx:220, 246 |
| `result-highlights` | Hand.tsx:361 | Stage.tsx:255 |
| `ink-glow` → `ink-glow-${i}` | inkGlow.ts:75, renomeado Hand.tsx:240 | Stage.tsx:259 |
| `tray-surface` (`SURFACE`) | tableBuild.ts:19, 35; tableFile.ts:135, 139 | Tray.tsx:42; tableFile.ts:32; Stage.tsx:206, 277 |
| `mesa` | tableBuild.ts:35; tableFile.ts:33, 136 | Stage.tsx:277; tableFile.ts:167 |
| `moldura`, `base`, `feltro`, `parede`, `guia-area-de-jogo`, `fundo`, `fundo-360`, `piso` | tableBuild.ts:35–38, 47, 56; tableFile.ts:9, 30, 33 | `find`/`roleOf` (tableBuild.ts:90–104), tableFile.ts:27, 86, 143–146, 159, 170–171; Stage.tsx:269–270 |
| material `madeira`/`feltro` (nome de material) | tableBuild.ts:32–33 | `colorsOf` procura `hex('madeira')` por **nó** (91–92), não acha na mesa padrão (inferência: só serve a modelo importado com nó assim) |
| `fire` | Fire.ts:77 | Stage.tsx:207 |
| `kraken`, `kraken-fragments` | Kraken.ts:73 | Stage.tsx:281 |

### `userData`
- `RigidBody.userData.selection` — Die.tsx:210 → Hand.tsx:78.
- `userData.labels` (âncoras/Text) — Die.tsx:57, 64, 77 → Stage.tsx:194, 231.
- `userData.text`/`value` — Die.tsx:45 → Stage.tsx:235.
- `geometry.userData.ink` (máscara, criada em `dice/importer`) — Die.tsx:124, 130, 144; inkGlow.ts:40; Stage.tsx:249. `geometry.userData.painted` — Die.tsx:145, 147.
- `texture.userData.placeholder` — tableBuild.ts:16 → `isPlaceholder`, Stage.tsx:267. `texture.userData.mimeType` (temporário) — tableFile.ts:49, 57.
- `group.userData.imported` — tableFile.ts:141 → Stage.tsx:277. `userData[EXTRAS_KEY]` — tableBuild.ts:42; tableFile.ts:34–37, 60, 167. `userData.name` (GLTFLoader) — tableBuild.ts:99. `userData.turn` — interno de TaiJi (Omens.tsx:126, 142).

### DOM, `data-*`, CSS
- Backdrop.tsx:24–26: `.backdrop[data-kind]`, `.backdrop-art`, `.backdrop-dim` (index.css:64–67). Canvas transparente quando não há `<color attach>` (Stage.tsx:306) — acordo implícito Stage↔Backdrop↔App.
- `gameArea` (ref de `.game-area`) App→Stage→Hand: listeners (Hand.tsx:134–138), `focus` (96), `setPointerCapture` (99). OmenOverlay (ui) escreve `data-omen/kraken/storm` no mesmo elemento (ui/OmenOverlay.tsx:31–33) e o CSS anima o canvas com tempos duplicados de PRE (index.css:103–113).
- Query `?surface-preview` — Stage.tsx:28, 287; Hand.tsx:74.

### Refs/callbacks entre componentes
- `bodies` (Stage:134) → Hand, ThrowLoop, Omens; `register` (Stage:151) → Die (173–175).
- `recordLaunch` ThrowLoop→Stage (Stage:137, 80).
- Hand escreve em objetos de Die: opacidade de todos os materiais (160–162), `castShadow` (24, 164), adiciona malha de brilho como filho de `die-${i}` (240). `GemMaterial` é `transparent` por causa desse fade (Die.tsx:161).
- Tray escreve `useTable.colors` a partir do objeto 3D (37); Omens lê.

### Ordem de montagem/quadro
- Todos os `useFrame` sem prioridade (0): Stage 125, 144; Hand 148; Tray 47; Omens 248. Ordem efetiva = ordem de inscrição (inferência: R3F inscreve em layout effect, filhos antes do pai; prioridade interna do `<Physics>` não conferida).
- `useBeforePhysicsStep` (Stage:68) roda dentro do passo do Rapier; Hand escreve alvos cinemáticos no `useFrame`. Exclusão por fase: ThrowLoop só em `rolling`, Hand nas outras.
- Omens fica **fora** do `<Physics>`/`Guard` (Stage:333) e lê `bodies[i].translation()` que Hand definiu (pose do kraken) — o tentáculo segue o dado movido por Hand.
- Tray usa `useLayoutEffect` (41) para a visibilidade do piso valer no mesmo quadro da troca de mesa.
- Aquecimentos: `Show.compile` no mount e após `environment` (Omens:247, 250); `compileAsync` em Die (200) e Tray (32).

### Relógios compartilhados
- `omenAt` = `performance.now()` no `publish` (store.ts:145). Consumido por Omens (209), Hand (244 → 280), Tray via `trayBrokenAt` (14), test hook `omenTime` (Stage:206). Cada um faz `performance.now() - omenAt` no seu quadro.
- `performance.now()` também em Hand (97, 102, 117, 131 `at` do gesto; 155 `now`), Stage (76, 83 timeout), Omens (254), Tray (14).
- Showcase tem relógio próprio `showcase.at` reiniciado enquanto o presságio toca (Hand:252).

### Imports dinâmicos e Worker
- Die.tsx:92 `../dice/importer` (`modelObject`); Tray.tsx:32 `./tableFile` (`buildFor`); tableImages.ts:91 `HDRLoader`; (fora: TablePanel:54, 72 `tableFile`, :55 `three`).
- Worker `../physics/presim.worker.ts` (Stage.tsx:52), mensagens `RollRequest`/`RollResponse`, terminado no fallback (39) e no unmount (63); após um fallback fica `null` para sempre (todas as jogadas seguintes síncronas).

---

## 7. Hook de teste (`window.__dice`)

Instalação: `installTestHook` (testHook.ts:31–35, só `MODE==='test'`) chamado em Stage.tsx:196–295, reinstalado quando mudam `[camera, gameArea, key, selected, scene]`; logo depois `setReady()` (296).

| Método | Fonte |
|---|---|
| `state()` 198–208 | `useDice`: `dice`, `gesture.phase`, `throwId`, `results`, `ready` (+ `key` da instalação e contagem de `bodies` válidos = `selected.length`), `error`, `aim`, `showcased`, `omen` (→ `omenKind` se do throw atual), `omenDone`, `reducedMotion`, `omenTime = now − omenAt`; cena: `trayBroken` = `tray-surface.visible===false`, `burning` = `fire.visible` |
| `select` 210 | `setDice` |
| `rigOmen` 211 | `rigOmen` |
| `bodies` 212–215 | ref `bodies` (handle, translation, rotation, bodyType) |
| `meshes` 216–224 | `gem-${i}` world quaternion |
| `labels(i)` 225–241 | `die-${i}` → filho com `userData.labels`; `userData.text/value`, matrizes |
| `camera` 242 | `camera.position` |
| `numbersVisible(i)` 243 | visibilidade do lote de numerais |
| `gemLook(i)` 244–254 | malhas de `gem-${i}`: tipo/opacidade do material, `vertexColors`, cor do 1º vértice com `geometry.userData.ink` |
| `highlights` 255–257 | filhos de `result-highlights` (`Text.text`, visible, posição) |
| `inkGlow(i)` 258–261 | `ink-glow-${i}`: visible, triângulos, opacidade |
| `launches` 262 | ref `launches` alimentada por `recordLaunch` (ThrowLoop:80) |
| `customs` 263 | `useDice.customs` |
| `table` 264–279 | `useTable.theme` (id, name, background, model, reflect), `tables.length`, `gl.info.programs`; cena: `guia-area-de-jogo` (Box3), `feltro`, `base`/`madeira` (cor, textura ≠ placeholder), `mesa`/`tray-surface` `.userData.imported` |
| `shards` 280–285 | `kraken-fragments`.children[0] atributo `color` (vértices 0 e 3) |
| `previewSurface(i,p,q)` 286–294 | só em teste + `?surface-preview` + fase `hand`; escreve pose direto no corpo |

O hook é o maior consumidor de nomes de cena e lê os dois stores: ao modularizar, cada módulo precisa expor seu "contrato de inspeção" pelo index (ou o hook vira o único dependente de tudo).

---

## 8. Achados

**Código sem uso / morto**
- `checkTheme` (tableTheme.ts:50) só é usado em `tests/table.test.ts`; nada em produção valida tema carregado do IndexedDB (tableStore.ts:5 só filtra `version`) nem importado.
- Comentário órfão tableBuild.ts:106 ("Lights and cameras would change…") sem código; a função é `cleanTable` em tableFile.ts:67.
- Stage.tsx:45 `state.setDice(state.dice)` ("os dados voltam à mão") e Stage.tsx:77 `setError(null)`: com `error` não nulo, App.tsx:34 desmonta o `<Canvas>` inteiro; a mão nunca é vista e o erro nunca é limpo por Stage (inferência forte). Doc arremesso.md §4 e armadilhas.md divergem disso.
- Stage.tsx:168 enquadra "a maior mão (20 corpos)" com `handPositions(HAND.cols*4)` enquanto `MAX_DICE = 10` (polyhedra.ts:253) e a mão hoje é o redemoinho; `handPositions` parece sobra da mão em grade (inferência).
- `FAR` (krakenMotion.ts:18) e `UP_INK` exportados mas só usados no próprio arquivo/testes.

**Duplicações**
- `easeOut`: cúbico em Omens.tsx:24, quártico em highlight.ts:10 (mesmo nome, curvas diferentes); `clamp01` em Omens.tsx:23 e highlight.ts:11; `span` em krakenMotion.ts:9 usado como util geral (e outro `span` com outro sentido em physics/world.ts:45).
- `shade`: Hand.tsx:24 (sombra do dado) e tableBuild.ts:61 (sombras da mesa).
- `isPreview`: Stage.tsx:28, Hand.tsx:74, Stage.tsx:287.
- `live()`: Stage.tsx:65 vs Hand.tsx:75–80 com critérios diferentes.
- Predicado "entre animações": Stage.tsx:128 e 148.
- Durações: `OMEN_MS` (dice/omen.ts:11) × `KRAKEN.duration`/`STORM.duration` × CSS (index.css:103–113).
- Cores padrão: `SHARD_DEFAULT.felt` `#3A0F1A` e o caso especial `#3b2416` (Kraken.ts:14–16) repetem `DEFAULT_THEME` (tableTheme.ts:23).
- Medidas da bandeja repetidas como literais: 14×9 (tableTextures.ts:40, tableBuild.ts:11), 15×10 (tableBuild.ts:11, tableFile.ts:108) em vez de `TRAY`.
- `sessionOnly` existe nos dois stores (store.ts:31 e tableState.ts:10).
- Configuração de `Text` troika repetida Die.tsx:73 e Hand.tsx:55.

**Riscos/esquisitices**
- `remove` (tableState.ts:62) cancela a gravação pendente de **qualquer** mesa, não só da removida (comentário diz "of this table").
- `edit` a partir do padrão grava `mesa.ativa` (52) antes do registro existir (debounce 300 ms).
- `ready` (store.ts:117) nunca volta a `false` e é ligado pelo efeito do test hook (Stage.tsx:296).
- Caches sem descarte: `panoramas` (tableImages.ts:66, texturas GPU), `kept` (inkGlow.ts:28).
- Stage.tsx:79 caminho síncrono sem `try/catch`, diferente do fallback (43).
- Import de `tableState.ts` registra listener global `pagehide` (73) como efeito colateral.

**Dúvidas para o dono do negócio**
1. Falha do motor físico: a intenção é "dados voltam à mão com aviso" (doc) ou "3D some, recarregue" (código atual)?
2. Fonte de verdade das cores da mesa: o tema (`theme.felt/wood`) ou o que o objeto 3D mostra (`colors`, escrito por Tray)? Quem deve ser dono no módulo mesa?
3. A regra "dualidade anula raio, kraken, tempestade e fogo" (krakenMotion.ts:21, 83; fireMotion.ts:13; Omens.tsx:200) é intencional para todos os casos (ex.: d20=20 + d100=100)?
4. Temas importados/carregados devem passar por `checkTheme`?
5. O movimento do d100 no kraken/tempestade (hoje em Hand) é "presságio" ou "showcase"? Define quem é dono da pose em `settled`.
6. `omenPlaying` e `omenAt` (store) pertencem ao módulo de apresentação ou ao de arremesso? Hoje o `publish` do arremesso decide o presságio (`omenOf`) e acerta o relógio.
7. Desligar reduced motion no meio do showcase: hoje só a ida para reduced é tratada (Hand.tsx:192); a volta é esperada?
