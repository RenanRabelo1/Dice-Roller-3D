# Grafo de imports (pastas atuais)

Arquivos analisados: 96 (55 de produção). Arestas internas: 269. Não resolvidas: 0.

## 1. Dependências entre grupos (produção)

| De | Para | Arestas | Só tipos? | Arquivos e símbolos |
|---|---|---|---|---|
| server/src | src/dice | 5 | não | server/src/app.ts:3 → src/dice/kinds.ts {CUSTOM_BASES, FREE_VALUES, KINDS}<br>server/src/rolls.ts:2 → src/dice/kinds.ts {CUSTOM_BASES, FREE_VALUES, KINDS}<br>server/src/rolls.ts:3 → src/dice/omen.ts [type] {OmenKind}<br>server/src/rules.ts:1 → src/dice/kinds.ts {BASE, isCustom, FREE_VALUES, KINDS, SIDES, type CustomBase, type DieKind, type Shape}<br>server/src/rules.ts:2 → src/dice/omen.ts {omenKind, omenOf, type OmenKind} |
| src/App.tsx | src/api | 1 | não | src/App.tsx:12 → src/api/history.ts {saveRoll} |
| src/App.tsx | src/failure.ts | 1 | não | src/App.tsx:8 → src/failure.ts {hasWebGL} |
| src/App.tsx | src/scene | 4 | não | src/App.tsx:10 → src/scene/tableState.ts {useTable}<br>src/App.tsx:11 → src/scene/tableImages.ts {warmImageDecoder}<br>src/App.tsx:3 → src/scene/Stage.tsx {Stage}<br>src/App.tsx:7 → src/scene/Backdrop.tsx {Backdrop} |
| src/App.tsx | src/store.ts | 1 | não | src/App.tsx:6 → src/store.ts {useDice} |
| src/App.tsx | src/ui | 3 | não | src/App.tsx:4 → src/ui/Controls.tsx {Controls}<br>src/App.tsx:5 → src/ui/OmenOverlay.tsx {OmenOverlay}<br>src/App.tsx:9 → src/ui/Safeguard.tsx {Failure, Guard} |
| src/api | src/dice | 2 | não | src/api/history.ts:1 → src/dice/custom.ts {customDie}<br>src/api/history.ts:2 → src/dice/kinds.ts {isCustom, type DieKind} |
| src/dice | src/indexedDb.ts | 1 | não | src/dice/customStore.ts:1 → src/indexedDb.ts {run} |
| src/dice | src/physics | 4 | sim | src/dice/custom.ts:2 → src/physics/world.ts [type] {Vec3}<br>src/dice/importer.ts:5 → src/physics/world.ts [type] {Vec3}<br>src/dice/polyhedra.ts:11 → src/physics/world.ts [type] {Vec3}<br>src/dice/read.ts:3 → src/physics/world.ts [type] {Quat} |
| src/failure.ts | src/store.ts | 1 | sim | src/failure.ts:1 → src/store.ts [type] {DiceError} |
| src/main.tsx | src/App.tsx | 1 | não | src/main.tsx:4 → src/App.tsx {default:App} |
| src/main.tsx | src/index.css | 1 | não | src/main.tsx:2 → src/index.css [side] |
| src/physics | src/dice | 4 | não | src/physics/presim.ts:2 → src/dice/custom.ts [type] {CustomKind}<br>src/physics/presim.ts:3 → src/dice/polyhedra.ts {polyhedron, type DieKind, type Polyhedron}<br>src/physics/presim.ts:4 → src/dice/read.ts {readUp, toResults}<br>src/physics/presim.worker.ts:2 → src/dice/custom.ts {registerPoly, type CustomKind} |
| src/physics | src/throw | 3 | não | src/physics/apply.ts:3 → src/throw/aim.ts {launchVelocity, spin}<br>src/physics/apply.ts:4 → src/throw/settle.ts [type] {BodyState, SettleAction}<br>src/physics/presim.ts:5 → src/throw/settle.ts {initSettle, stepSettle} |
| src/scene | src/dice | 19 | não | src/scene/Die.tsx:10 → src/dice/symbols.ts {symbolGeometry}<br>src/scene/Die.tsx:7 → src/dice/custom.ts {customDie, customKind, finishOf, inkColorOf, isCustom, type CustomDie, type Finish}<br>src/scene/Die.tsx:9 → src/dice/polyhedra.ts {baseOf, polyhedron, type BuiltinKind, type DieKind, type Label, type Polyhedron, type Shape}<br>src/scene/Die.tsx:92 → src/dice/importer.ts [dynamic]<br>src/scene/Fire.ts:4 → src/dice/polyhedra.ts {MAX_DICE}<br>src/scene/fireMotion.ts:2 → src/dice/omen.ts {isD20, type Omen}<br>src/scene/fireMotion.ts:3 → src/dice/polyhedra.ts [type] {DieKind}<br>src/scene/Hand.tsx:14 → src/dice/custom.ts {customDie, inkColorOf, isCustom}<br>src/scene/Hand.tsx:16 → src/dice/symbols.ts {symbolGeometry}<br>src/scene/Hand.tsx:6 → src/dice/polyhedra.ts {MAX_DICE, polyhedron, RADIUS}<br>src/scene/krakenMotion.ts:2 → src/dice/omen.ts [type] {Omen}<br>src/scene/krakenMotion.ts:3 → src/dice/polyhedra.ts [type] {DieKind}<br>src/scene/Omens.tsx:10 → src/dice/omen.ts {DUALITY_HIT, isD20, omenKind, omenMs}<br>src/scene/Omens.tsx:9 → src/dice/polyhedra.ts {MAX_DICE}<br>src/scene/showcase.ts:2 → src/dice/polyhedra.ts [type] {Polyhedron}<br>src/scene/Stage.tsx:18 → src/dice/omen.ts {omenKind}<br>src/scene/Stage.tsx:19 → src/dice/custom.ts {customKind}<br>src/scene/Stage.tsx:20 → src/dice/polyhedra.ts {customsOf, MAX_DICE}<br>src/scene/tableFile.ts:3 → src/dice/importer.ts {parseGlb} |
| src/scene | src/indexedDb.ts | 1 | não | src/scene/tableStore.ts:1 → src/indexedDb.ts {run} |
| src/scene | src/physics | 15 | não | src/scene/Die.tsx:11 → src/physics/world.ts {MATERIAL, type Vec3}<br>src/scene/Fire.ts:5 → src/physics/world.ts {TRAY}<br>src/scene/fireMotion.ts:4 → src/physics/world.ts {TRAY}<br>src/scene/Hand.tsx:7 → src/physics/apply.ts {toKinematic}<br>src/scene/Hand.tsx:8 → src/physics/world.ts {HAND, type Quat, type Vec3}<br>src/scene/inkGlow.ts:2 → src/physics/world.ts [type] {Vec3}<br>src/scene/krakenMotion.ts:4 → src/physics/world.ts {TRAY, type Quat, type Vec3}<br>src/scene/showcase.ts:3 → src/physics/world.ts {MAX_RADIUS, type Quat, type Vec3}<br>src/scene/Stage.tsx:11 → src/physics/world.ts {GRAVITY, HAND, MAX_RADIUS, STEP, TRAY, handPositions, type Vec3}<br>src/scene/Stage.tsx:52 → src/physics/presim.worker.ts [worker]<br>src/scene/Stage.tsx:8 → src/physics/apply.ts {bodyStates}<br>src/scene/Stage.tsx:9 → src/physics/presim.ts {presimulate, type Recording, type RollRequest, type RollResponse}<br>src/scene/tableBuild.ts:2 → src/physics/world.ts {TRAY, trayColliders}<br>src/scene/tableFile.ts:4 → src/physics/world.ts {TRAY}<br>src/scene/Tray.tsx:2 → src/physics/world.ts {MATERIAL, trayColliders} |
| src/scene | src/store.ts | 5 | não | src/scene/Die.tsx:8 → src/store.ts {useDice}<br>src/scene/Hand.tsx:9 → src/store.ts {omenPlaying, useDice}<br>src/scene/Omens.tsx:11 → src/store.ts {omenPlaying, useDice}<br>src/scene/Stage.tsx:12 → src/store.ts {useDice}<br>src/scene/Tray.tsx:6 → src/store.ts {useDice} |
| src/scene | src/testHook.ts | 2 | não | src/scene/Stage.tsx:10 → src/testHook.ts [type] {DiceHook}<br>src/scene/Stage.tsx:13 → src/testHook.ts {installTestHook} |
| src/scene | src/throw | 5 | não | src/scene/Die.tsx:12 → src/throw/vortex.ts {vortexCenter}<br>src/scene/Hand.tsx:10 → src/throw/aim.ts {charge, clampTarget}<br>src/scene/Hand.tsx:11 → src/throw/vortex.ts {newWhirl, ORBITS, restingPlaces, spinAngle, stepWhirl, vortexCenter}<br>src/scene/krakenMotion.ts:7 → src/throw/gesture.ts [type] {Phase}<br>src/scene/Stage.tsx:21 → src/throw/vortex.ts {VORTEX, vortexCenter, vortexRadius} |
| src/scene | src/ui | 1 | não | src/scene/Stage.tsx:24 → src/ui/Safeguard.tsx {Guard} |
| src/store.ts | src/dice | 4 | não | src/store.ts:2 → src/dice/custom.ts {customDie, customList, isCustom, registerCustom, unregisterCustom, type CustomDie, type CustomKind}<br>src/store.ts:3 → src/dice/customStore.ts {deleteCustomDie, listCustomDice, saveCustomDie}<br>src/store.ts:4 → src/dice/polyhedra.ts {MAX_DICE, sortDice, type DieKind}<br>src/store.ts:5 → src/dice/omen.ts {omenOf, type Omen} |
| src/store.ts | src/physics | 2 | não | src/store.ts:6 → src/physics/apply.ts [type] {Launch}<br>src/store.ts:7 → src/physics/world.ts {HAND, type Vec3} |
| src/store.ts | src/throw | 1 | não | src/store.ts:8 → src/throw/gesture.ts {initialGesture, reduce, type Effect, type GestureEvent, type GestureState} |
| src/testHook.ts | src/dice | 2 | sim | src/testHook.ts:1 → src/dice/polyhedra.ts [type] {DieKind}<br>src/testHook.ts:3 → src/dice/omen.ts [type] {Omen, OmenKind} |
| src/testHook.ts | src/physics | 1 | sim | src/testHook.ts:4 → src/physics/world.ts [type] {Quat, Vec3} |
| src/testHook.ts | src/store.ts | 1 | sim | src/testHook.ts:2 → src/store.ts [type] {DiceError} |
| src/testHook.ts | src/throw | 1 | sim | src/testHook.ts:5 → src/throw/gesture.ts [type] {Phase} |
| src/throw | src/dice | 1 | não | src/throw/vortex.ts:1 → src/dice/polyhedra.ts {MAX_DICE} |
| src/throw | src/physics | 3 | não | src/throw/aim.ts:1 → src/physics/world.ts {LAUNCH, MAX_RADIUS, SPIN, TRAY, type Vec3}<br>src/throw/settle.ts:1 → src/physics/world.ts {isOutside, recoveryPoint, SETTLE, type Quat, type Vec3}<br>src/throw/vortex.ts:2 → src/physics/world.ts {HAND, TRAY, type Vec3} |
| src/ui | src/dice | 13 | não | src/ui/Chat.tsx:2 → src/dice/notation.ts {formatDice, parseDice}<br>src/ui/Controls.tsx:20 → src/dice/importer.ts [dynamic]<br>src/ui/Controls.tsx:20 → src/dice/importer.ts [dynamic]<br>src/ui/Controls.tsx:3 → src/dice/custom.ts {customDie, customKind, finishOf, isCustom, type CustomDie}<br>src/ui/Controls.tsx:4 → src/dice/polyhedra.ts {KINDS, MAX_DICE, type DieKind}<br>src/ui/Controls.tsx:5 → src/dice/notation.ts {dieName, formatDice, resultText}<br>src/ui/ImportDie.tsx:5 → src/dice/custom.ts {customKind, inkColorOf, type CustomBase, type CustomDie, type Finish, type Ink, type StdBase}<br>src/ui/ImportDie.tsx:6 → src/dice/importer.ts {askOrder, unevenOf, withReadable, checkFreeValue, checkFreeValues, checkValue, checkValues, formatOf, hasTexture, importModel, ImportError, inkOf, inkTriangles, markInk, LIMITS, normaliseValues, renumbered, suggestOpposite, type Imported}<br>src/ui/ImportDie.tsx:7 → src/dice/notation.ts {slugOf, slugProblem}<br>src/ui/ImportDie.tsx:8 → src/dice/polyhedra.ts {MAX_DICE, type Polyhedron}<br>src/ui/InkChoice.tsx:2 → src/dice/custom.ts [type] {Finish, Ink}<br>src/ui/OmenOverlay.tsx:2 → src/dice/omen.ts {isD20, omenKind, omenMs, type OmenKind}<br>src/ui/OmenOverlay.tsx:3 → src/dice/polyhedra.ts [type] {DieKind} |
| src/ui | src/failure.ts | 1 | não | src/ui/Safeguard.tsx:2 → src/failure.ts {FAILURE} |
| src/ui | src/scene | 7 | não | src/ui/ImportDie.tsx:9 → src/scene/Die.tsx {GEM, GemMaterial, paintGlb, usePainted}<br>src/ui/TablePanel.tsx:2 → src/scene/tableBuild.ts {colorsOf, disposeTable}<br>src/ui/TablePanel.tsx:3 → src/scene/tableImages.ts {panoramaPicture, panoramaTexture, preparePanorama, reduceImage, TableError}<br>src/ui/TablePanel.tsx:4 → src/scene/tableState.ts {useTable}<br>src/ui/TablePanel.tsx:5 → src/scene/tableTheme.ts {clampBlur, clampDim, clampIntensity, clampPanoramaBlur, clampRotation, clampTile, DEFAULT_THEME, fileSafe, LIMITS, PRESETS, type Background, type PresetName, type TableTheme}<br>src/ui/TablePanel.tsx:54 → src/scene/tableFile.ts [dynamic]<br>src/ui/TablePanel.tsx:72 → src/scene/tableFile.ts [dynamic] |
| src/ui | src/store.ts | 5 | não | src/ui/Chat.tsx:3 → src/store.ts {useDice}<br>src/ui/Controls.tsx:2 → src/store.ts {omenPlaying, useDice}<br>src/ui/ImportDie.tsx:10 → src/store.ts {useDice}<br>src/ui/OmenOverlay.tsx:4 → src/store.ts {omenPlaying, useDice}<br>src/ui/Safeguard.tsx:3 → src/store.ts {useDice} |

## 2. Ciclos entre grupos

### 2a. Contando todo import (valor, tipo, dinâmico, worker)

- **Ciclo entre 3 grupos:** src/dice, src/physics, src/throw
  - src/dice → src/physics (4): custom.ts→world.ts[type], importer.ts→world.ts[type], polyhedra.ts→world.ts[type], read.ts→world.ts[type]
  - src/physics → src/dice (4): presim.ts→custom.ts[type], presim.ts→polyhedra.ts, presim.ts→read.ts, presim.worker.ts→custom.ts
  - src/physics → src/throw (3): apply.ts→aim.ts, apply.ts→settle.ts[type], presim.ts→settle.ts
  - src/throw → src/dice (1): vortex.ts→polyhedra.ts
  - src/throw → src/physics (3): aim.ts→world.ts, settle.ts→world.ts, vortex.ts→world.ts
- **Ciclo entre 2 grupos:** src/scene, src/ui
  - src/scene → src/ui (1): Stage.tsx→Safeguard.tsx
  - src/ui → src/scene (7): ImportDie.tsx→Die.tsx, TablePanel.tsx→tableBuild.ts, TablePanel.tsx→tableImages.ts, TablePanel.tsx→tableState.ts, TablePanel.tsx→tableTheme.ts, TablePanel.tsx→tableFile.ts[dynamic], TablePanel.tsx→tableFile.ts[dynamic]

### 2b. Só imports de valor estáticos (ciclo em tempo de carga)

- **Ciclo entre 2 grupos:** src/physics, src/throw
  - src/physics → src/throw (2): apply.ts→aim.ts, presim.ts→settle.ts
  - src/throw → src/physics (3): aim.ts→world.ts, settle.ts→world.ts, vortex.ts→world.ts
- **Ciclo entre 2 grupos:** src/scene, src/ui
  - src/scene → src/ui (1): Stage.tsx→Safeguard.tsx
  - src/ui → src/scene (5): ImportDie.tsx→Die.tsx, TablePanel.tsx→tableBuild.ts, TablePanel.tsx→tableImages.ts, TablePanel.tsx→tableState.ts, TablePanel.tsx→tableTheme.ts

## 3. Ciclos entre arquivos (produção)

### 3a. Contando todo import

- **2 arquivos:** src/dice/custom.ts, src/dice/polyhedra.ts
  - src/dice/custom.ts:4 → src/dice/polyhedra.ts [type] {Polyhedron, Shape}
  - src/dice/polyhedra.ts:12 → src/dice/custom.ts {customBase, customKind, customList, customOrder, customPoly, isCustom, type CustomKind}

### 3b. Só imports de valor estáticos

Nenhum ciclo.

## 4. Quem importa cada arquivo de produção

| Arquivo | Linhas | Importado por (produção) | Importado por (tests/e2e/server-test) |
|---|---|---|---|
| server/src/app.ts | 60 | 1: server/src/main.ts | 1: server/test/api.test.ts |
| server/src/main.ts | 24 | 0:  | 0:  |
| server/src/rolls.ts | 72 | 2: server/src/app.ts, server/src/main.ts | 1: server/test/api.test.ts |
| server/src/rules.ts | 29 | 2: server/src/app.ts, server/src/rolls.ts | 0:  |
| src/App.tsx | 50 | 1: src/main.tsx | 0:  |
| src/api/history.ts | 37 | 1: src/App.tsx | 1: tests/history.test.ts |
| src/dice/custom.ts | 61 | 14: src/api/history.ts, src/dice/customStore.ts, src/dice/importer.ts, src/dice/notation.ts, src/dice/polyhedra.ts, src/physics/presim.ts, src/physics/presim.worker.ts, src/scene/Die.tsx, src/scene/Hand.tsx, src/scene/Stage.tsx, src/store.ts, src/ui/Controls.tsx, src/ui/ImportDie.tsx, src/ui/InkChoice.tsx | 5: tests/custom.test.ts, tests/helpers/models.ts, tests/history.test.ts, tests/importer.test.ts, tests/showcase.test.ts |
| src/dice/customStore.ts | 8 | 1: src/store.ts | 0:  |
| src/dice/importer.ts | 496 | 4: src/scene/Die.tsx, src/scene/tableFile.ts, src/ui/Controls.tsx, src/ui/ImportDie.tsx | 5: e2e/import.spec.ts, tests/custom.test.ts, tests/helpers/models.ts, tests/importer.test.ts, tests/read.test.ts |
| src/dice/kinds.ts | 24 | 8: server/src/app.ts, server/src/rolls.ts, server/src/rules.ts, src/api/history.ts, src/dice/custom.ts, src/dice/importer.ts, src/dice/omen.ts, src/dice/polyhedra.ts | 0:  |
| src/dice/notation.ts | 98 | 3: src/ui/Chat.tsx, src/ui/Controls.tsx, src/ui/ImportDie.tsx | 2: tests/custom.test.ts, tests/notation.test.ts |
| src/dice/omen.ts | 32 | 9: server/src/rolls.ts, server/src/rules.ts, src/scene/Omens.tsx, src/scene/Stage.tsx, src/scene/fireMotion.ts, src/scene/krakenMotion.ts, src/store.ts, src/testHook.ts, src/ui/OmenOverlay.tsx | 3: e2e/omen.spec.ts, tests/custom.test.ts, tests/omen.test.ts |
| src/dice/polyhedra.ts | 257 | 20: src/dice/custom.ts, src/dice/importer.ts, src/dice/notation.ts, src/dice/read.ts, src/dice/symbols.ts, src/physics/presim.ts, src/scene/Die.tsx, src/scene/Fire.ts, src/scene/Hand.tsx, src/scene/Omens.tsx, src/scene/Stage.tsx, src/scene/fireMotion.ts, src/scene/krakenMotion.ts, src/scene/showcase.ts, src/store.ts, src/testHook.ts, src/throw/vortex.ts, src/ui/Controls.tsx, src/ui/ImportDie.tsx, src/ui/OmenOverlay.tsx | 13: e2e/import.spec.ts, e2e/omen.spec.ts, e2e/screens.spec.ts, tests/custom.test.ts, tests/helpers/models.ts, tests/helpers/sim.ts, tests/importer.test.ts, tests/kraken.test.ts, tests/omen.test.ts, tests/physics.test.ts, tests/polyhedra.test.ts, tests/read.test.ts, tests/showcase.test.ts |
| src/dice/read.ts | 28 | 1: src/physics/presim.ts | 2: tests/custom.test.ts, tests/read.test.ts |
| src/dice/symbols.ts | 90 | 2: src/scene/Die.tsx, src/scene/Hand.tsx | 1: tests/symbols.test.ts |
| src/failure.ts | 23 | 2: src/App.tsx, src/ui/Safeguard.tsx | 0:  |
| src/indexedDb.ts | 31 | 2: src/dice/customStore.ts, src/scene/tableStore.ts | 0:  |
| src/main.tsx | 11 | 0:  | 0:  |
| src/physics/apply.ts | 71 | 4: src/physics/presim.ts, src/scene/Hand.tsx, src/scene/Stage.tsx, src/store.ts | 1: tests/physics.test.ts |
| src/physics/presim.ts | 83 | 2: src/physics/presim.worker.ts, src/scene/Stage.tsx | 1: tests/helpers/sim.ts |
| src/physics/presim.worker.ts | 19 | 1: src/scene/Stage.tsx | 0:  |
| src/physics/world.ts | 76 | 22: src/dice/custom.ts, src/dice/importer.ts, src/dice/polyhedra.ts, src/dice/read.ts, src/physics/apply.ts, src/physics/presim.ts, src/scene/Die.tsx, src/scene/Fire.ts, src/scene/Hand.tsx, src/scene/Stage.tsx, src/scene/Tray.tsx, src/scene/fireMotion.ts, src/scene/inkGlow.ts, src/scene/krakenMotion.ts, src/scene/showcase.ts, src/scene/tableBuild.ts, src/scene/tableFile.ts, src/store.ts, src/testHook.ts, src/throw/aim.ts, src/throw/settle.ts, src/throw/vortex.ts | 12: e2e/screens.spec.ts, tests/fire.test.ts, tests/helpers/models.ts, tests/helpers/sim.ts, tests/importer.test.ts, tests/physics.test.ts, tests/polyhedra.test.ts, tests/read.test.ts, tests/settle.test.ts, tests/store.test.ts, tests/vortex.test.ts, tests/world.test.ts |
| src/scene/Backdrop.tsx | 30 | 1: src/App.tsx | 0:  |
| src/scene/Die.tsx | 228 | 3: src/scene/Hand.tsx, src/scene/Stage.tsx, src/ui/ImportDie.tsx | 0:  |
| src/scene/Fire.ts | 126 | 1: src/scene/Omens.tsx | 0:  |
| src/scene/Hand.tsx | 364 | 1: src/scene/Stage.tsx | 0:  |
| src/scene/Kraken.ts | 272 | 1: src/scene/Omens.tsx | 1: tests/table.test.ts |
| src/scene/Omens.tsx | 259 | 1: src/scene/Stage.tsx | 0:  |
| src/scene/Stage.tsx | 337 | 1: src/App.tsx | 0:  |
| src/scene/Tray.tsx | 58 | 1: src/scene/Stage.tsx | 0:  |
| src/scene/fireMotion.ts | 25 | 2: src/scene/Fire.ts, src/scene/Omens.tsx | 1: tests/fire.test.ts |
| src/scene/highlight.ts | 29 | 3: src/scene/Hand.tsx, src/scene/fireMotion.ts, src/scene/krakenMotion.ts | 2: tests/highlight.test.ts, tests/showcase.test.ts |
| src/scene/inkGlow.ts | 79 | 1: src/scene/Hand.tsx | 1: tests/inkGlow.test.ts |
| src/scene/krakenMotion.ts | 118 | 5: src/scene/Hand.tsx, src/scene/Kraken.ts, src/scene/Omens.tsx, src/scene/Tray.tsx, src/scene/fireMotion.ts | 1: tests/kraken.test.ts |
| src/scene/showcase.ts | 47 | 2: src/scene/Hand.tsx, src/scene/krakenMotion.ts | 2: tests/kraken.test.ts, tests/showcase.test.ts |
| src/scene/tableBuild.ts | 107 | 3: src/scene/Tray.tsx, src/scene/tableFile.ts, src/ui/TablePanel.tsx | 1: tests/table.test.ts |
| src/scene/tableFile.ts | 189 | 2: src/scene/Tray.tsx, src/ui/TablePanel.tsx | 1: tests/table.test.ts |
| src/scene/tableImages.ts | 129 | 4: src/App.tsx, src/scene/Stage.tsx, src/scene/tableFile.ts, src/ui/TablePanel.tsx | 0:  |
| src/scene/tableState.ts | 74 | 6: src/App.tsx, src/scene/Backdrop.tsx, src/scene/Omens.tsx, src/scene/Stage.tsx, src/scene/Tray.tsx, src/ui/TablePanel.tsx | 0:  |
| src/scene/tableStore.ts | 12 | 1: src/scene/tableState.ts | 0:  |
| src/scene/tableTextures.ts | 44 | 1: src/scene/tableBuild.ts | 0:  |
| src/scene/tableTheme.ts | 104 | 8: src/scene/Backdrop.tsx, src/scene/tableBuild.ts, src/scene/tableFile.ts, src/scene/tableImages.ts, src/scene/tableState.ts, src/scene/tableStore.ts, src/scene/tableTextures.ts, src/ui/TablePanel.tsx | 1: tests/table.test.ts |
| src/store.ts | 148 | 13: src/App.tsx, src/failure.ts, src/scene/Die.tsx, src/scene/Hand.tsx, src/scene/Omens.tsx, src/scene/Stage.tsx, src/scene/Tray.tsx, src/testHook.ts, src/ui/Chat.tsx, src/ui/Controls.tsx, src/ui/ImportDie.tsx, src/ui/OmenOverlay.tsx, src/ui/Safeguard.tsx | 2: tests/omen.test.ts, tests/store.test.ts |
| src/testHook.ts | 36 | 1: src/scene/Stage.tsx | 0:  |
| src/throw/aim.ts | 46 | 3: src/physics/apply.ts, src/scene/Hand.tsx, src/throw/gesture.ts | 2: tests/aim.test.ts, tests/physics.test.ts |
| src/throw/gesture.ts | 44 | 4: src/scene/krakenMotion.ts, src/store.ts, src/testHook.ts, src/throw/settle.ts | 1: tests/gesture.test.ts |
| src/throw/settle.ts | 40 | 2: src/physics/apply.ts, src/physics/presim.ts | 1: tests/settle.test.ts |
| src/throw/vortex.ts | 99 | 3: src/scene/Die.tsx, src/scene/Hand.tsx, src/scene/Stage.tsx | 1: tests/vortex.test.ts |
| src/ui/Chat.tsx | 66 | 1: src/ui/Controls.tsx | 0:  |
| src/ui/Controls.tsx | 86 | 1: src/App.tsx | 0:  |
| src/ui/ImportDie.tsx | 394 | 1: src/ui/Controls.tsx | 0:  |
| src/ui/InkChoice.tsx | 36 | 2: src/ui/Controls.tsx, src/ui/ImportDie.tsx | 0:  |
| src/ui/OmenOverlay.tsx | 56 | 1: src/App.tsx | 0:  |
| src/ui/Safeguard.tsx | 23 | 2: src/App.tsx, src/scene/Stage.tsx | 0:  |
| src/ui/TablePanel.tsx | 199 | 1: src/ui/Controls.tsx | 0:  |

## 5. Pacotes externos por arquivo de produção

| Arquivo | Pacotes |
|---|---|
| server/src/app.ts | @fastify/cors, fastify |
| server/src/main.ts | mongodb |
| server/src/rolls.ts | mongodb |
| server/src/rules.ts | — |
| src/App.tsx | @react-three/fiber, react |
| src/api/history.ts | — |
| src/dice/custom.ts | three |
| src/dice/customStore.ts | — |
| src/dice/importer.ts | three, three/examples/jsm/loaders/GLTFLoader.js, three/examples/jsm/loaders/STLLoader.js, three/examples/jsm/math/ConvexHull.js |
| src/dice/kinds.ts | — |
| src/dice/notation.ts | — |
| src/dice/omen.ts | — |
| src/dice/polyhedra.ts | three, three/examples/jsm/math/ConvexHull.js |
| src/dice/read.ts | three |
| src/dice/symbols.ts | three, three/examples/jsm/utils/BufferGeometryUtils.js |
| src/failure.ts | — |
| src/indexedDb.ts | — |
| src/main.tsx | react, react-dom/client |
| src/physics/apply.ts | @dimforge/rapier3d-compat, @dimforge/rapier3d-compat [type] |
| src/physics/presim.ts | @dimforge/rapier3d-compat |
| src/physics/presim.worker.ts | @dimforge/rapier3d-compat |
| src/physics/world.ts | — |
| src/scene/Backdrop.tsx | react |
| src/scene/Die.tsx | @react-three/fiber, @react-three/rapier, react, three, three/examples/jsm/utils/BufferGeometryUtils.js, troika-three-text |
| src/scene/Fire.ts | three |
| src/scene/Hand.tsx | @react-three/fiber, @react-three/rapier [type], react, three, troika-three-text |
| src/scene/Kraken.ts | three |
| src/scene/Omens.tsx | @react-three/fiber, @react-three/rapier [type], react, three |
| src/scene/Stage.tsx | @react-three/drei, @react-three/fiber, @react-three/rapier, react, three, troika-three-text |
| src/scene/Tray.tsx | @react-three/fiber, @react-three/rapier, react, three [type] |
| src/scene/fireMotion.ts | three |
| src/scene/highlight.ts | three |
| src/scene/inkGlow.ts | three |
| src/scene/krakenMotion.ts | three |
| src/scene/showcase.ts | three |
| src/scene/tableBuild.ts | three |
| src/scene/tableFile.ts | three, three/examples/jsm/exporters/GLTFExporter.js |
| src/scene/tableImages.ts | three, three/examples/jsm/loaders/HDRLoader.js [dynamic] |
| src/scene/tableState.ts | zustand |
| src/scene/tableStore.ts | — |
| src/scene/tableTextures.ts | three |
| src/scene/tableTheme.ts | — |
| src/store.ts | zustand |
| src/testHook.ts | — |
| src/throw/aim.ts | — |
| src/throw/gesture.ts | — |
| src/throw/settle.ts | — |
| src/throw/vortex.ts | — |
| src/ui/Chat.tsx | react |
| src/ui/Controls.tsx | react |
| src/ui/ImportDie.tsx | @react-three/drei, @react-three/fiber, react, three |
| src/ui/InkChoice.tsx | react |
| src/ui/OmenOverlay.tsx | react |
| src/ui/Safeguard.tsx | react |
| src/ui/TablePanel.tsx | react, three [dynamic] |

## 6. Imports de testes para produção (o que quebra ao mover cada arquivo)

| Alvo | Nº de arquivos de teste | Quem |
|---|---|---|
| src/dice/polyhedra.ts | 13 | e2e/import.spec.ts, e2e/omen.spec.ts, e2e/screens.spec.ts, tests/custom.test.ts, tests/helpers/models.ts, tests/helpers/sim.ts, tests/importer.test.ts, tests/kraken.test.ts, tests/omen.test.ts, tests/physics.test.ts, tests/polyhedra.test.ts, tests/read.test.ts, tests/showcase.test.ts |
| src/physics/world.ts | 12 | e2e/screens.spec.ts, tests/fire.test.ts, tests/helpers/models.ts, tests/helpers/sim.ts, tests/importer.test.ts, tests/physics.test.ts, tests/polyhedra.test.ts, tests/read.test.ts, tests/settle.test.ts, tests/store.test.ts, tests/vortex.test.ts, tests/world.test.ts |
| src/dice/importer.ts | 5 | e2e/import.spec.ts, tests/custom.test.ts, tests/helpers/models.ts, tests/importer.test.ts, tests/read.test.ts |
| src/dice/custom.ts | 5 | tests/custom.test.ts, tests/helpers/models.ts, tests/history.test.ts, tests/importer.test.ts, tests/showcase.test.ts |
| src/dice/omen.ts | 3 | e2e/omen.spec.ts, tests/custom.test.ts, tests/omen.test.ts |
| src/throw/aim.ts | 2 | tests/aim.test.ts, tests/physics.test.ts |
| src/dice/notation.ts | 2 | tests/custom.test.ts, tests/notation.test.ts |
| src/dice/read.ts | 2 | tests/custom.test.ts, tests/read.test.ts |
| src/scene/highlight.ts | 2 | tests/highlight.test.ts, tests/showcase.test.ts |
| src/scene/showcase.ts | 2 | tests/kraken.test.ts, tests/showcase.test.ts |
| src/store.ts | 2 | tests/omen.test.ts, tests/store.test.ts |
| server/src/app.ts | 1 | server/test/api.test.ts |
| server/src/rolls.ts | 1 | server/test/api.test.ts |
| src/scene/fireMotion.ts | 1 | tests/fire.test.ts |
| src/throw/gesture.ts | 1 | tests/gesture.test.ts |
| src/physics/presim.ts | 1 | tests/helpers/sim.ts |
| src/api/history.ts | 1 | tests/history.test.ts |
| src/scene/inkGlow.ts | 1 | tests/inkGlow.test.ts |
| src/scene/krakenMotion.ts | 1 | tests/kraken.test.ts |
| src/physics/apply.ts | 1 | tests/physics.test.ts |
| src/throw/settle.ts | 1 | tests/settle.test.ts |
| src/dice/symbols.ts | 1 | tests/symbols.test.ts |
| src/scene/Kraken.ts | 1 | tests/table.test.ts |
| src/scene/tableBuild.ts | 1 | tests/table.test.ts |
| src/scene/tableFile.ts | 1 | tests/table.test.ts |
| src/scene/tableTheme.ts | 1 | tests/table.test.ts |
| src/throw/vortex.ts | 1 | tests/vortex.test.ts |

## 7. Todas as arestas de produção

- server/src/app.ts
  - :3 → src/dice/kinds.ts {CUSTOM_BASES, FREE_VALUES, KINDS}
  - :4 → server/src/rolls.ts [type] {RollStore}
  - :5 → server/src/rules.ts {CUSTOM, score, type Die}
- server/src/main.ts
  - :2 → server/src/app.ts {buildApp}
  - :3 → server/src/rolls.ts {rollStore, rollsCollection}
- server/src/rolls.ts
  - :2 → src/dice/kinds.ts {CUSTOM_BASES, FREE_VALUES, KINDS}
  - :3 → src/dice/omen.ts [type] {OmenKind}
  - :4 → server/src/rules.ts {CUSTOM, type Die}
- server/src/rules.ts
  - :1 → src/dice/kinds.ts {BASE, isCustom, FREE_VALUES, KINDS, SIDES, type CustomBase, type DieKind, type Shape}
  - :2 → src/dice/omen.ts {omenKind, omenOf, type OmenKind}
- src/App.tsx
  - :3 → src/scene/Stage.tsx {Stage}
  - :4 → src/ui/Controls.tsx {Controls}
  - :5 → src/ui/OmenOverlay.tsx {OmenOverlay}
  - :6 → src/store.ts {useDice}
  - :7 → src/scene/Backdrop.tsx {Backdrop}
  - :8 → src/failure.ts {hasWebGL}
  - :9 → src/ui/Safeguard.tsx {Failure, Guard}
  - :10 → src/scene/tableState.ts {useTable}
  - :11 → src/scene/tableImages.ts {warmImageDecoder}
  - :12 → src/api/history.ts {saveRoll}
- src/api/history.ts
  - :1 → src/dice/custom.ts {customDie}
  - :2 → src/dice/kinds.ts {isCustom, type DieKind}
- src/dice/custom.ts
  - :2 → src/physics/world.ts [type] {Vec3}
  - :3 → src/dice/kinds.ts {isCustom, omenD20s, type CustomBase, type CustomKind}
  - :4 → src/dice/polyhedra.ts [type] {Polyhedron, Shape}
- src/dice/customStore.ts
  - :1 → src/indexedDb.ts {run}
  - :2 → src/dice/custom.ts [type] {CustomDie}
- src/dice/importer.ts
  - :5 → src/physics/world.ts [type] {Vec3}
  - :6 → src/dice/custom.ts {customKind, type CustomBase, type CustomDie, type StdBase}
  - :7 → src/dice/kinds.ts {FREE_VALUES}
  - :8 → src/dice/polyhedra.ts {fromTriangles, OPPOSITE_SUM, RADIUS, type Numbering, type Polyhedron}
- src/dice/kinds.ts: (nenhum import interno)
- src/dice/notation.ts
  - :1 → src/dice/custom.ts {customDie, customKind, customList, isCustom, type CustomDie}
  - :2 → src/dice/polyhedra.ts {allKinds, baseOf, MAX_DICE, sortDice, type DieKind}
- src/dice/omen.ts
  - :1 → src/dice/kinds.ts {omenD20s, type DieKind}
- src/dice/polyhedra.ts
  - :11 → src/physics/world.ts [type] {Vec3}
  - :12 → src/dice/custom.ts {customBase, customKind, customList, customOrder, customPoly, isCustom, type CustomKind}
  - :14 → src/dice/kinds.ts {BASE, KINDS, type BuiltinKind, type DieKind, type Shape}
  - :17 → src/dice/kinds.ts [reexport] {BASE, KINDS, type BuiltinKind, type DieKind, type Shape}
- src/dice/read.ts
  - :2 → src/dice/polyhedra.ts {baseOf, type DieKind, type Polyhedron}
  - :3 → src/physics/world.ts [type] {Quat}
- src/dice/symbols.ts
  - :3 → src/dice/polyhedra.ts [type] {SymbolName}
- src/failure.ts
  - :1 → src/store.ts [type] {DiceError}
- src/indexedDb.ts: (nenhum import interno)
- src/main.tsx
  - :2 → src/index.css [side] {}
  - :4 → src/App.tsx {default:App}
- src/physics/apply.ts
  - :3 → src/throw/aim.ts {launchVelocity, spin}
  - :4 → src/throw/settle.ts [type] {BodyState, SettleAction}
  - :5 → src/physics/world.ts [type] {Quat, Vec3}
- src/physics/presim.ts
  - :2 → src/dice/custom.ts [type] {CustomKind}
  - :3 → src/dice/polyhedra.ts {polyhedron, type DieKind, type Polyhedron}
  - :4 → src/dice/read.ts {readUp, toResults}
  - :5 → src/throw/settle.ts {initSettle, stepSettle}
  - :6 → src/physics/apply.ts {applyLaunch, applySettle, bodyStates, type Launch}
  - :7 → src/physics/world.ts {DAMPING, GRAVITY, isOutside, MATERIAL, SETTLE, STEP, trayColliders, type Quat, type Vec3}
- src/physics/presim.worker.ts
  - :2 → src/dice/custom.ts {registerPoly, type CustomKind}
  - :3 → src/physics/presim.ts {presimulate, type RollRequest, type RollResponse}
- src/physics/world.ts: (nenhum import interno)
- src/scene/Backdrop.tsx
  - :2 → src/scene/tableState.ts {useTable}
  - :3 → src/scene/tableTheme.ts {PRESETS}
- src/scene/Die.tsx
  - :7 → src/dice/custom.ts {customDie, customKind, finishOf, inkColorOf, isCustom, type CustomDie, type Finish}
  - :8 → src/store.ts {useDice}
  - :9 → src/dice/polyhedra.ts {baseOf, polyhedron, type BuiltinKind, type DieKind, type Label, type Polyhedron, type Shape}
  - :10 → src/dice/symbols.ts {symbolGeometry}
  - :11 → src/physics/world.ts {MATERIAL, type Vec3}
  - :12 → src/throw/vortex.ts {vortexCenter}
  - :92 → src/dice/importer.ts [dynamic] {}
- src/scene/Fire.ts
  - :4 → src/dice/polyhedra.ts {MAX_DICE}
  - :5 → src/physics/world.ts {TRAY}
  - :6 → src/scene/fireMotion.ts {fireAt, fireReach}
- src/scene/Hand.tsx
  - :6 → src/dice/polyhedra.ts {MAX_DICE, polyhedron, RADIUS}
  - :7 → src/physics/apply.ts {toKinematic}
  - :8 → src/physics/world.ts {HAND, type Quat, type Vec3}
  - :9 → src/store.ts {omenPlaying, useDice}
  - :10 → src/throw/aim.ts {charge, clampTarget}
  - :11 → src/throw/vortex.ts {newWhirl, ORBITS, restingPlaces, spinAngle, stepWhirl, vortexCenter}
  - :12 → src/scene/showcase.ts {CAPTION, showcasePoses}
  - :13 → src/scene/inkGlow.ts {glowMesh}
  - :14 → src/dice/custom.ts {customDie, inkColorOf, isCustom}
  - :15 → src/scene/highlight.ts {easeOut, highlightAt, HL_SIZE, SHOW}
  - :16 → src/dice/symbols.ts {symbolGeometry}
  - :17 → src/scene/Die.tsx {FONT, FONT_URL, gemColor, SYMBOL}
  - :18 → src/scene/krakenMotion.ts {KRAKEN, krakenAt, krakenDieAt, krakenIndices, STORM, stormAt, stormDieAt, stormIndices}
  - :19 → src/scene/showcase.ts [type] {Pose}
- src/scene/Kraken.ts
  - :6 → src/scene/krakenMotion.ts {fractureCells, KRAKEN, krakenAt, span, stormAt}
- src/scene/Omens.tsx
  - :9 → src/dice/polyhedra.ts {MAX_DICE}
  - :10 → src/dice/omen.ts {DUALITY_HIT, isD20, omenKind, omenMs}
  - :11 → src/store.ts {omenPlaying, useDice}
  - :12 → src/scene/krakenMotion.ts {krakenIndices, span, stormIndices}
  - :13 → src/scene/Kraken.ts {Kraken}
  - :14 → src/scene/tableState.ts {useTable}
  - :15 → src/scene/Fire.ts {Fire}
  - :16 → src/scene/fireMotion.ts {fireAt, fireIndices}
- src/scene/Stage.tsx
  - :8 → src/physics/apply.ts {bodyStates}
  - :9 → src/physics/presim.ts {presimulate, type Recording, type RollRequest, type RollResponse}
  - :10 → src/testHook.ts [type] {DiceHook}
  - :11 → src/physics/world.ts {GRAVITY, HAND, MAX_RADIUS, STEP, TRAY, handPositions, type Vec3}
  - :12 → src/store.ts {useDice}
  - :13 → src/testHook.ts {installTestHook}
  - :14 → src/scene/Die.tsx {Die, gemColor}
  - :15 → src/scene/Tray.tsx {Tray}
  - :16 → src/scene/Hand.tsx {Hand}
  - :17 → src/scene/Omens.tsx {Omens}
  - :18 → src/dice/omen.ts {omenKind}
  - :19 → src/dice/custom.ts {customKind}
  - :20 → src/dice/polyhedra.ts {customsOf, MAX_DICE}
  - :21 → src/throw/vortex.ts {VORTEX, vortexCenter, vortexRadius}
  - :22 → src/scene/tableState.ts {useTable}
  - :23 → src/scene/tableImages.ts {markSoftwareGl, panoramaTexture}
  - :24 → src/ui/Safeguard.tsx {Guard}
  - :52 → src/physics/presim.worker.ts [worker] {}
- src/scene/Tray.tsx
  - :2 → src/physics/world.ts {MATERIAL, trayColliders}
  - :6 → src/store.ts {useDice}
  - :7 → src/scene/krakenMotion.ts {trayBrokenAt}
  - :8 → src/scene/tableBuild.ts {buildDefault, colorsOf, disposeTable, SURFACE}
  - :9 → src/scene/tableState.ts {useTable}
  - :32 → src/scene/tableFile.ts [dynamic] {}
- src/scene/fireMotion.ts
  - :2 → src/dice/omen.ts {isD20, type Omen}
  - :3 → src/dice/polyhedra.ts [type] {DieKind}
  - :4 → src/physics/world.ts {TRAY}
  - :5 → src/scene/highlight.ts {easeOut}
  - :6 → src/scene/krakenMotion.ts {span}
- src/scene/highlight.ts: (nenhum import interno)
- src/scene/inkGlow.ts
  - :2 → src/physics/world.ts [type] {Vec3}
- src/scene/krakenMotion.ts
  - :2 → src/dice/omen.ts [type] {Omen}
  - :3 → src/dice/polyhedra.ts [type] {DieKind}
  - :4 → src/physics/world.ts {TRAY, type Quat, type Vec3}
  - :5 → src/scene/highlight.ts {easeOut}
  - :6 → src/scene/showcase.ts [type] {Pose}
  - :7 → src/throw/gesture.ts [type] {Phase}
- src/scene/showcase.ts
  - :2 → src/dice/polyhedra.ts [type] {Polyhedron}
  - :3 → src/physics/world.ts {MAX_RADIUS, type Quat, type Vec3}
- src/scene/tableBuild.ts
  - :2 → src/physics/world.ts {TRAY, trayColliders}
  - :3 → src/scene/tableTextures.ts {feltMap}
  - :4 → src/scene/tableTheme.ts {EXTRAS_KEY, extrasOf, type TableTheme}
- src/scene/tableFile.ts
  - :3 → src/dice/importer.ts {parseGlb}
  - :4 → src/physics/world.ts {TRAY}
  - :5 → src/scene/tableBuild.ts {backdrop, buildDefault, find, GUIDE, isPlaceholder, roleOf, shade, SURFACE}
  - :6 → src/scene/tableImages.ts {blobOfImage, isOpaque, TableError}
  - :7 → src/scene/tableTheme.ts {EXTRAS_KEY, extrasOf, LIMITS, readExtras, type TableTheme, type ThemeExtras}
- src/scene/tableImages.ts
  - :2 → src/scene/tableTheme.ts {LIMITS}
- src/scene/tableState.ts
  - :2 → src/scene/tableStore.ts {activeId, deleteTable, listTables, saveTable, setActiveId}
  - :3 → src/scene/tableTheme.ts {DEFAULT_ID, DEFAULT_THEME, type TableTheme}
- src/scene/tableStore.ts
  - :1 → src/indexedDb.ts {run}
  - :2 → src/scene/tableTheme.ts [type] {TableTheme}
- src/scene/tableTextures.ts
  - :2 → src/scene/tableTheme.ts [type] {FeltTexture}
- src/scene/tableTheme.ts: (nenhum import interno)
- src/store.ts
  - :2 → src/dice/custom.ts {customDie, customList, isCustom, registerCustom, unregisterCustom, type CustomDie, type CustomKind}
  - :3 → src/dice/customStore.ts {deleteCustomDie, listCustomDice, saveCustomDie}
  - :4 → src/dice/polyhedra.ts {MAX_DICE, sortDice, type DieKind}
  - :5 → src/dice/omen.ts {omenOf, type Omen}
  - :6 → src/physics/apply.ts [type] {Launch}
  - :7 → src/physics/world.ts {HAND, type Vec3}
  - :8 → src/throw/gesture.ts {initialGesture, reduce, type Effect, type GestureEvent, type GestureState}
- src/testHook.ts
  - :1 → src/dice/polyhedra.ts [type] {DieKind}
  - :2 → src/store.ts [type] {DiceError}
  - :3 → src/dice/omen.ts [type] {Omen, OmenKind}
  - :4 → src/physics/world.ts [type] {Quat, Vec3}
  - :5 → src/throw/gesture.ts [type] {Phase}
- src/throw/aim.ts
  - :1 → src/physics/world.ts {LAUNCH, MAX_RADIUS, SPIN, TRAY, type Vec3}
- src/throw/gesture.ts
  - :1 → src/throw/aim.ts {charge}
- src/throw/settle.ts
  - :1 → src/physics/world.ts {isOutside, recoveryPoint, SETTLE, type Quat, type Vec3}
  - :2 → src/throw/gesture.ts [type] {Phase}
- src/throw/vortex.ts
  - :1 → src/dice/polyhedra.ts {MAX_DICE}
  - :2 → src/physics/world.ts {HAND, TRAY, type Vec3}
- src/ui/Chat.tsx
  - :2 → src/dice/notation.ts {formatDice, parseDice}
  - :3 → src/store.ts {useDice}
- src/ui/Controls.tsx
  - :2 → src/store.ts {omenPlaying, useDice}
  - :3 → src/dice/custom.ts {customDie, customKind, finishOf, isCustom, type CustomDie}
  - :4 → src/dice/polyhedra.ts {KINDS, MAX_DICE, type DieKind}
  - :5 → src/dice/notation.ts {dieName, formatDice, resultText}
  - :6 → src/ui/Chat.tsx {Chat}
  - :7 → src/ui/InkChoice.tsx {InkChoice}
  - :8 → src/ui/TablePanel.tsx {TablePanel}
  - :11 → src/ui/ImportDie.tsx [dynamic] {}
  - :20 → src/dice/importer.ts [dynamic] {}
  - :20 → src/dice/importer.ts [dynamic] {}
- src/ui/ImportDie.tsx
  - :5 → src/dice/custom.ts {customKind, inkColorOf, type CustomBase, type CustomDie, type Finish, type Ink, type StdBase}
  - :6 → src/dice/importer.ts {askOrder, unevenOf, withReadable, checkFreeValue, checkFreeValues, checkValue, checkValues, formatOf, hasTexture, importModel, ImportError, inkOf, inkTriangles, markInk, LIMITS, normaliseValues, renumbered, suggestOpposite, type Imported}
  - :7 → src/dice/notation.ts {slugOf, slugProblem}
  - :8 → src/dice/polyhedra.ts {MAX_DICE, type Polyhedron}
  - :9 → src/scene/Die.tsx {GEM, GemMaterial, paintGlb, usePainted}
  - :10 → src/store.ts {useDice}
  - :11 → src/ui/InkChoice.tsx {InkChoice}
- src/ui/InkChoice.tsx
  - :2 → src/dice/custom.ts [type] {Finish, Ink}
- src/ui/OmenOverlay.tsx
  - :2 → src/dice/omen.ts {isD20, omenKind, omenMs, type OmenKind}
  - :3 → src/dice/polyhedra.ts [type] {DieKind}
  - :4 → src/store.ts {omenPlaying, useDice}
- src/ui/Safeguard.tsx
  - :2 → src/failure.ts {FAILURE}
  - :3 → src/store.ts {useDice}
- src/ui/TablePanel.tsx
  - :2 → src/scene/tableBuild.ts {colorsOf, disposeTable}
  - :3 → src/scene/tableImages.ts {panoramaPicture, panoramaTexture, preparePanorama, reduceImage, TableError}
  - :4 → src/scene/tableState.ts {useTable}
  - :5 → src/scene/tableTheme.ts {clampBlur, clampDim, clampIntensity, clampPanoramaBlur, clampRotation, clampTile, DEFAULT_THEME, fileSafe, LIMITS, PRESETS, type Background, type PresetName, type TableTheme}
  - :54 → src/scene/tableFile.ts [dynamic] {}
  - :72 → src/scene/tableFile.ts [dynamic] {}
