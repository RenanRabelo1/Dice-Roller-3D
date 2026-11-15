# Inventário do núcleo (fase 1, diagnóstico)

Escopo: `src/dice/*`, `src/throw/*`, `src/physics/*`, `src/store.ts`, `src/indexedDb.ts`, `src/failure.ts`, `src/testHook.ts`, `src/App.tsx`, `src/main.tsx`, `src/api/history.ts`. Linhas = contagem do grafo. "Inferência" = não conferido no código/execução.

## 1. Arquivos

| Arquivo | Linhas | Papel | Exports | Plataforma | Domínio |
|---|---|---|---|---|---|
| src/dice/kinds.ts | 24 | Catálogo de tipos sem 3D, compartilhado com server/ | types `Shape BuiltinKind CustomKind DieKind CustomBase`; `KINDS BASE CUSTOM_BASES FREE_VALUES isCustom omenD20s SIDES` | puro (+1 Set mutável) | catálogo (núcleo compartilhado) |
| src/dice/polyhedra.ts | 257 | Sólidos embutidos, numeração, rótulos, cache, e resolução kind→poliedro/base/ordem | reexporta `BASE KINDS BuiltinKind DieKind Shape`; `SymbolName RADIUS Face Top Label Polyhedron OPPOSITE_SUM Numbering fromTriangles polyhedron sortDice allKinds baseOf MAX_DICE customsOf` | three (geometrias, ConvexHull) | geometria/numeração + seleção + resolução de importados (misto) |
| src/dice/custom.ts | 61 | Tipo `CustomDie`, regra de tinta, registro em memória de importados | `isCustom`(re) `CustomBase CustomKind`(re) `StdBase CustomDie Ink Finish INK_COLORS inkColorOf finishOf customKind customList customDie customPoly customOrder customBase registerCustom registerPoly unregisterCustom` | three (`Color`) | dados importados |
| src/dice/customStore.ts | 8 | Persistência IndexedDB dos importados | `listCustomDice saveCustomDie deleteCustomDie` | IndexedDB | dados importados |
| src/dice/importer.ts | 496 | .stl/.glb → sólido ideal, detecção padrão/livre, calibração, tinta, cache de modelo para a cena | `LIMITS ImportError ModelFormat formatOf Model parseGlb readModel Plane detectPlanes tierOf unevenOf detectFree Solid idealSolid withReadable inkTriangles inkOf looksNumbered normaliseValues checkValue checkValues checkFreeValue checkFreeValues suggestOpposite askOrder renumbered Imported importModel modelObject markInk hasTexture forgetModel` | three (loaders, ConvexHull) | dados importados (+ `parseGlb` usado pela mesa) |
| src/dice/read.ts | 28 | Pose → valor da face; raw → resultado | `readUp toResults` | three (`Quaternion`) | leitura |
| src/dice/notation.ts | 98 | Parser/formatador do chat, nomes, texto do painel, regras de apelido | `dieName slugProblem slugOf formatDice resultText parseDice` | puro (lê registro) | notação/seleção + resultado (texto) + importados (apelido) |
| src/dice/omen.ts | 32 | Regra de crítico/falha/dualidade e durações | `Omen OmenKind OMEN_MS DUALITY_HIT isD20 omenOf omenKind omenMs` | puro (lê `omenD20s`) | presságio (compartilhado com server/) |
| src/dice/symbols.ts | 90 | Desenhos vetoriais dos símbolos, com cache | `SYMBOLS symbolGeometry` | three | geometria/apresentação |
| src/throw/gesture.ts | 44 | Reducer das fases do gesto | `Phase Source GestureEvent GestureState Effect initialGesture reduce` | puro | gesto/fases |
| src/throw/aim.ts | 46 | Mira, carga, velocidade de lançamento, PRNG e giro | `clampTarget charge launchVelocity rng spin` | puro | mira/força |
| src/throw/settle.ts | 40 | Decide wait/recover/reveal | `BodyState SettleState SettleAction initSettle stepSettle` | puro | parada |
| src/throw/vortex.ts | 99 | Redemoinho dos dados na mão | `VORTEX vortexRadius vortexCenter Orbit ORBITS Whirl newWhirl spinAngle stepWhirl restingPlaces` | puro | mão/mira (apresentação do gesto) |
| src/physics/world.ts | 76 | Tipos vetoriais + constantes de bandeja, materiais, lançamento, parada, mão | `Vec3 Quat STEP GRAVITY TRAY MATERIAL LAUNCH DAMPING SPIN SETTLE HAND MAX_RADIUS Box trayColliders clampHandX handPositions recoveryPoint isOutside` | puro | misto (matemática, mesa, arremesso, física, dado) |
| src/physics/apply.ts | 71 | Único ponto que muda tipo/vel/pose de corpo Rapier | `Launch bodyStates applyLaunch toKinematic applySettle` | Rapier | física (+ tipo `Launch` do arremesso) |
| src/physics/presim.ts | 83 | Simula o arremesso offline e grava quadros + resultado | `Pose Recording RollRequest RollResponse presimulate` | Rapier | física/pré-simulação |
| src/physics/presim.worker.ts | 19 | Worker: init Rapier, registra sólidos, roda presim | nenhum (efeito: `self.onmessage`) | Worker + Rapier | física/pré-simulação |
| src/store.ts | 148 | Store zustand único | `DiceError omenPlaying useDice` | zustand (+ crypto, performance) | todos (seleção, importados, arremesso, resultado, presságio, apresentação, falhas) |
| src/indexedDb.ts | 31 | Abre IndexedDB `dice-roller` v2 (dois stores) | `STORES StoreName openDb run` | IndexedDB | infraestrutura (dados importados + mesa) |
| src/failure.ts | 23 | Mensagens de falha e sonda de WebGL | `FAILURE hasWebGL` | DOM (canvas) | plataforma/falhas |
| src/testHook.ts | 36 | Contrato e instalação de `window.__dice` | `DiceHook installTestHook` | DOM (window) | testes |
| src/App.tsx | 50 | Casca: Controls + Canvas/Stage + overlay; inicializações e assinatura do histórico | `default App` | React | composição (com regra de wiring) |
| src/main.tsx | 11 | Monta React em StrictMode | — | React/DOM | composição |
| src/api/history.ts | 37 | Envia cada resultado à API; id anônimo do jogador | `playerId rollBody saveRoll` | DOM (fetch, localStorage, crypto, import.meta.env) | histórico |

## 2. Regras de negócio

### Catálogo de tipos
1. 11 kinds embutidos, ordem canônica = ordem da UI e da ordenação: `kinds.ts:7`.
2. Dado temático só muda aparência: vtm/hunger → d10, fire → d6 (`BASE`): `kinds.ts:10-12`.
3. Importável só d4–d20 ou `livre` (d100 e moeda nunca): `kinds.ts:14`.
4. Dado livre carrega valores inteiros −99..999: `kinds.ts:17`.
5. Kind importado = prefixo `custom:`: `kinds.ts:18`.
6. Valor máximo por shape (moeda 2, d10 10): `kinds.ts:23`.
7. Máximo de 10 dados por arremesso (`MAX_DICE`): `polyhedra.ts:253`; o servidor repete 10 à mão em `server/src/app.ts:25` e `server/src/rolls.ts:21`.
8. Ordenação da seleção: embutidos em `KINDS`, importados depois, por ordem de criação: `polyhedra.ts:247-248`.
9. Importado desconhecido no registro vira base `d20` (silencioso): `polyhedra.ts:252`.

### Geometria/numeração
10. Circunraio por shape (`RADIUS`, livre 0,85): `polyhedra.ts:26`; `MAX_RADIUS = 0.9` precisa ser o máximo: `world.ts:23`.
11. Opostas somam d6 7, d8 9, d10 9, d12 13, d20 21: `polyhedra.ts:43`, aplicado em `:186-196`.
12. d10 numera 0–9 (0 = 10): `polyhedra.ts:186`.
13. d100 espalha 1–100 com `(rank*37 % 100)+1`: `polyhedra.ts:185`.
14. d4 numera vértices (`tops`): `polyhedra.ts:199`, rótulos `:206-214`.
15. Livre sem calibração: 1..N: `polyhedra.ts:176`.
16. 6 e 9 ganham ponto em d10/d12/d20/d100: `polyhedra.ts:202-203`.
17. Símbolos Vampiro por dígito (vtm: 0 crit, 6–9 ankh; hunger: 0 fangs, 1 skull, 6–9 ankh): `polyhedra.ts:21-24`; face vazia mantém rótulo: `:239`.
18. Moeda: 48 lados, só tampas são faces, 1 = Cara (cima), 2 = Coroa: `polyhedra.ts:101-118`.
19. `numbering.turns` gira o numeral em passos de 360°/lados: `polyhedra.ts:219`.

### Leitura
20. Valor = face com normal mais alinhada a +Y; d4 pelo vértice; `readsDown` pela de baixo: `read.ts:13-22`.
21. Só faces `readable !== false` contam: `read.ts:9`.
22. d10 (inclui vtm/hunger) 0 → 10; demais sem conversão: `read.ts:25-27`.

### Notação/seleção
23. Sufixos depois do `d`, do mais longo ao mais curto: `notation.ts:5-8`.
24. `boladefogo` = 8×fire: `notation.ts:9, 66-68`.
25. `moeda`/`N moedas`: `notation.ts:70-73`.
26. Livre por apelido, antes do `d`: `notation.ts:60, 76-80`; padrão importado `<faces><apelido>`: `:61`.
27. Ambiguidade resolvida por backtracking: `notation.ts:64-92`.
28. Mais de `MAX_DICE` → erro; resultado ordenado: `notation.ts:95-96`.
29. Apelido: `^[a-z][a-z0-9]{0,15}$`, não `d\d…`, fora de `RESERVED`, único: `notation.ts:19-24`; sugestão `slugOf`: `:26`.
30. Nomes de exibição (`d10 Vampiro`, `Moeda`, `d20 Caveira`, livre só o nome): `notation.ts:11-15`.
31. Total soma tudo menos moedas; só moedas mostra faces: `notation.ts:39-51` (mesma regra no servidor: `server/src/rules.ts:27`).
32. Seleção inicial `['d20']`: `store.ts:65`.
33. `addDie` ignorado no máximo: `store.ts:68`; `removeDie` não tira o último: `:71`.
34. `setDice` descarta importados desconhecidos, corta em 10, ignora lista vazia: `store.ts:74-75`.
35. Toda mudança de seleção → fase `hand`, `throwId++`, limpa `launch/results/force`: `store.ts:51-57`.
36. Excluir importado tira-o da seleção; vazia → `['d20']`: `store.ts:111-112`.

### Dados importados
37. Limites 10 MB / 50 mil triângulos / textura 2048 px: `importer.ts:13`, aplicados em `:67, 75-90`.
38. GLB só aceita URLs `data:`/`blob:`: `importer.ts:57-60`.
39. Tolerâncias de detecção GROUP 3°, OPPOSITE −0,995, COVER 0,6, NEXT 0,25, EVEN 0,5: `importer.ts:17`; ordem d4→d20 (menor N primeiro): `:133-146`.
40. Sólido ideal: pares opostos simetrizados, escala para `RADIUS[base]`: `importer.ts:157-175, 271-293`.
41. Livre: faces ≥ 10% da maior, 3–60 faces, até 3 passadas descartando faces instáveis: `importer.ts:224, 241-265`.
42. Livre: centro no centroide do volume, `RADIUS.livre`, `readsDown`, fonte 0,45×menor inraio: `importer.ts:296-311`.
43. Camadas de shard: `TIER_DROP 0.7`, k ≥ 3, k primeiras dentro de 1,3×: `importer.ts:233-238`; "injusto" = maior > 2× menor: `:239`.
44. Faces de leitura × apoio (`withReadable`): `importer.ts:322-330`.
45. Gravação detectada: DENT 0,01, INTERIOR 0,08 (livre 0,03), ≥ 8 vértices e ≥ 1%: `importer.ts:334-347, 379`.
46. Calibração padrão: d10 aceita 10 por 0, valores 1..N (d10 0..9), sem repetição, completos: `importer.ts:385-398`.
47. Calibração livre: inteiros −99..999, repetição permitida: `importer.ts:400-404`.
48. Sugestão da oposta = `OPPOSITE_SUM − v`: `importer.ts:406-409`; ordem da pergunta: `:411-428`.
49. Tinta automática: luminância linear da gema > 0,5 → escura `#1B1A16`, senão ouro `#D4A93F`; sem gravação ou "nenhuma" → null: `custom.ts:30-40`. Acabamento padrão `gema`: `:41`.
50. Conta como d20 de presságio só se `base === 'd20' && omens`: `custom.ts:56`; livre nunca: `ui/ImportDie.tsx:270` (regra no componente).
51. GLB com textura só aceita tinta escura ou nenhuma: `ui/ImportDie.tsx:273` (regra no componente); recém-importado entra na seleção se houver vaga: `ui/ImportDie.tsx:279`.
52. Só registros `version === 1` carregam, ordem `createdAt`: `customStore.ts:5`.
53. Salvar: `QuotaExceededError` → recusa com mensagem e não registra; outra falha → registra e marca `sessionOnly`: `store.ts:84-94`.
54. Atualizar: aplica antes, salva depois; falha → `sessionOnly`: `store.ts:95-104`.

### Gesto/fases
55. Transições `hand→charging→rolling→settled→returning→hand`, `selection` volta a `hand`: `gesture.ts:23-43`.
56. Repetição de tecla ignorada; só a mesma origem solta: `gesture.ts:19-21, 29, 34`.
57. `cancel` só em `charging`: `gesture.ts:37`; `press` em `settled` = recolher: `:31`.

### Mira/força
58. Alvo limitado ao chão menos `MAX_RADIUS` das paredes: `aim.ts:6-10`.
59. Carga = onda triangular 0→1→0, ciclo 1400 ms: `aim.ts:3, 13-15`.
60. Velocidade = 6 + força×16, lift 0,35, sem direção → −z: `aim.ts:17-24`, `world.ts:16`.
61. Giro determinístico por semente e índice (mulberry32), 10–25 rad/s: `aim.ts:27-45`, `world.ts:19`.
62. Semente via `crypto.getRandomValues`; mão padrão `[0, HAND.y, HAND.z]`, ômega 0: `store.ts:130-135`.
63. Ômega da mão = f(velocidade da mira), zero com reduced motion: `scene/Hand.tsx:339` (regra no componente); setas movem 0,5: `Hand.tsx:121-124`.
64. Redemoinho: constantes `VORTEX`, raio 0,75+0,13n (0 para 1 dado), `REACH 0.9`, `MARGIN 0.1`: `vortex.ts:7-21`.

### Física/pré-simulação
65. `STEP` 1/60, gravidade −40: `world.ts:4-5`; bandeja 14×9, parede 1,5, tampa y 7: `:8, 31-43`.
66. Materiais die/velvet/wall: `world.ts:10-14`.
67. Amortecimento d100 e moeda: `world.ts:18`; livre com > 20 faces usa o do d100: `presim.ts:37`.
68. Moeda colide como `roundCylinder`: `presim.ts:42-43`; trava rotação se lenta e deitada (speed < 1, spin < 3, |tampa·up| > 0,4): `:61-67`.
69. CCD em todos os dados: `presim.ts:39`.
70. Angular = ômega da mão + `spin(seed,i)`: `apply.ts:36-41`.

### Parada
71. `SETTLE`: 240 passos (4 s), 12 calmos, 0,08 / 0,15: `world.ts:21`.
72. Prioridade wait → timeout → recover → calma: `settle.ts:20-38`.
73. Fora = além da parede mais o raio, ou abaixo do chão: `world.ts:73-75`; ponto de recuperação em grade y 1,2: `:65-71`.

### Resultado/publicação
74. Publica só se `throwId` atual e fase `rolling`: `store.ts:141`.
75. Presságio: reduced motion → nenhum; `omenRig` sobrepõe; publica resultado+presságio+transição num set só: `store.ts:142-145`.
76. Timeout do worker 2 s → simulação local: `scene/Stage.tsx:26, 83`.

### Presságio
77. Crítico = 20 no d20 / 1 no d100; falha = 1 no d20 / 100 no d100: `omen.ts:17-22`.
78. Dualidade = há crítico e falha: `omen.ts:24`.
79. d20 = embutido ou importado com opt-in: `omen.ts:15`.
80. Durações: raio 1300, kraken 6500, fogo 2400, tempestade 4600, dualidade 2600; choque 1100: `omen.ts:11-12`.
81. Duração escolhida: falha = max(fogo se d20, tempestade se d100); crítico = kraken se d100, senão raio: `omen.ts:26-31`. A mesma regra (qual dado recebe qual show) se repete em `scene/krakenMotion.ts:20-21, 82-83` e `scene/fireMotion.ts:12-13`.
82. Na tela só com os dados `settled`, deste arremesso, não concluído: `store.ts:61-62` (duplicado em `scene/krakenMotion.ts:28`).
83. Ligar reduced motion apaga o presságio em curso: `store.ts:119`.

### Histórico
84. Só envia com `VITE_API_URL`: `history.ts:6, 31`.
85. Jogador anônimo = UUID em `localStorage['diceroller.player']`; sem storage, UUID da visita: `history.ts:7-19`.
86. Importado vai com `base` e `omens`: `history.ts:22-25`; força limitada a 0..1: `:28`.
87. POST `{api}/rolls`, `keepalive`, sem esperar resposta, erro engolido: `history.ts:30-36`.
88. O servidor recalcula total e presságio e valida o valor pela base: `server/src/rules.ts:9-28`.

### Falhas
89. Três falhas com mensagem pt-BR (webgl, graphics, physics): `failure.ts:4-8`.
90. Sonda WebGL uma vez só (StrictMode): `failure.ts:10-21`.

## 3. Store (`src/store.ts`)

| Campo | Tipo | Para quê | Ações que escrevem | Fora do store (src/) |
|---|---|---|---|---|
| `dice` | `DieKind[]` | seleção, um por dado | `addDie` :68, `removeDie` :69-72, `setDice` :73-76, `removeCustom` :110-113 | lê: App.tsx:27 (subscribe); Stage.tsx:69, 103, 201; Hand.tsx:77, 156, 200, 210, 215, 236-237, 302, 306, 318, 342; Omens.tsx:200-201, 209; Tray.tsx:14; Controls.tsx:35; ImportDie.tsx:105; OmenOverlay.tsx:22. Escreve via ação: Chat.tsx:37, Controls.tsx:43, 45, ImportDie.tsx:279, Stage.tsx:45 (`setDice(state.dice)` como "reset"), :210 |
| `gesture` | `GestureState` | fase do gesto | `selection()` :52, `input` :126-136, `publish` :145 | lê: Hand.tsx:89, 95, 98, 107, 125, 150, 335; Stage.tsx:41, 56, 69, 127-128, 146-148, 201, 287; Omens.tsx:196; Tray.tsx:14; Controls.tsx:52. Escreve via `input`: Hand.tsx:87, 97, 102, 117, 131, 330 |
| `throwId` | `number` | invalida tudo de arremesso/seleção anterior | `selection()` :53, `input` :129 | lê: Stage.tsx:41, 56, 69, 72, 127, 146, 201; Hand.tsx:197, 214, 244-245; Omens.tsx:196; Tray.tsx:14; `omenPlaying` |
| `aim` | `Vec3` | alvo da mira | `setAim` :115 | escreve: Hand.tsx:111, 125. lê: Hand.tsx:31, 120, 181, 317, 337-340, 352; Stage.tsx:204; `input` :132 |
| `force` | `number` | carga atual / força do último arremesso | `setForce` :116, `input` :136, `selection()` :56 | escreve: Hand.tsx:336 (todo quadro em `charging`). lê: Controls.tsx:30; App.tsx:27 (enviado ao histórico) |
| `launch` | `Launch \| null` | snapshot do arremesso | `input` :131-136, `selection()` :54 | lê: Stage.tsx:69-70, 75 |
| `results` | `number[] \| null` | valores do jogador | `publish` :145, `input` :136, `selection()` :55 | lê: App.tsx:27 (subscribe); Controls.tsx:52; Stage.tsx:202 |
| `raw` | `number[] \| null` | valor físico por corpo | `publish` :145 (nunca limpo por `selection`/`input`) | lê: Hand.tsx:197-199 |
| `error` | `DiceError` | falha de WebGL/renderer/física | `setError` :118 | escreve: App.tsx:17 ('webgl'); Safeguard.tsx:13 ('graphics'/'physics'); Stage.tsx:46 ('physics'), :77 (null). lê: App.tsx:16, 34; Safeguard.tsx:13, 19; Controls.tsx:54; Stage.tsx:204 |
| `ready` | `boolean` | cena e test hook prontos | `setReady` :117 (nunca volta a false) | escreve: Stage.tsx:296. lê: Hand.tsx:79; Stage.tsx:203 |
| `reducedMotion` | `boolean` | preferência do SO | `setReducedMotion` :119 | escreve: App.tsx:21. lê: Hand.tsx:192, 208, 315-316, 324, 327, 339, 342, 345; Tray.tsx:14; Stage.tsx:205; `publish` :144 |
| `showcased` | `number` | throwId cujo voo terminou | `setShowcased` :120 | escreve: Hand.tsx:197, 245, 310. lê: Hand.tsx:310; Stage.tsx:127-128, 146-148, 204 |
| `omen` | `(Omen & {throwId}) \| null` | presságio deste arremesso | `publish` :145, `setReducedMotion` :119 | lê: Hand.tsx:214; Omens.tsx:194, 250; Tray.tsx:14; OmenOverlay.tsx:22; Stage.tsx:205 |
| `omenDone` | `number` | throwId cujo presságio acabou | `setOmenDone` :121 | escreve: Omens.tsx:255. lê: Tray.tsx:14; Stage.tsx:205; `omenPlaying` |
| `omenAt` | `number` | relógio compartilhado do presságio | `publish` :145 (`performance.now()`) | lê: Hand.tsx:244; Omens.tsx:209; Tray.tsx:14; Stage.tsx:206 |
| `omenRig` | `Omen \| null` | só teste: força o presságio | `rigOmen` :122 | escreve: Stage.tsx:211 (test hook). lê: só `publish` :144 |
| `customs` | `CustomDie[]` | cópia reativa do registro (`customList()`) | `loadCustoms` :81, `addCustom` :92, `updateCustom` :98, `removeCustom` :112 | lê: Die.tsx:186; Controls.tsx:35; ImportDie.tsx:105; Stage.tsx:263 |
| `sessionOnly` | `boolean` | IndexedDB indisponível | `loadCustoms` :81-82, `addCustom` :92, `updateCustom` :100 | lê: ImportDie.tsx:105 |

Ações sem campo próprio: `loadCustoms` (App.tsx:18), `addCustom` (ImportDie.tsx:276), `updateCustom` (Controls.tsx:17), `removeCustom` (Controls.tsx:48), `input` (Hand.tsx, ver acima), `publish` (Stage.tsx:69, 94).

Exports que não são campo:
- `DiceError` (tipo) :11 → failure.ts:1, testHook.ts:2.
- `omenPlaying` (seletor) :61 → Controls.tsx:53, OmenOverlay.tsx:22, Hand.tsx:251, Omens.tsx:219. Reimplementado à mão em krakenMotion.ts:28.
- `useDice` → 13 arquivos (grafo §4). `useDice.subscribe` só em App.tsx:26.
- Não exportados: `DiceState`, `HandMotion` (:10), `selection()` (:51).

Agrupamento proposto:
| Domínio | Campos | Ações |
|---|---|---|
| Seleção | `dice` | `addDie removeDie setDice` |
| Dados importados | `customs sessionOnly` | `loadCustoms addCustom updateCustom removeCustom` |
| Arremesso (gesto/mira) | `gesture throwId aim force launch` | `input setAim setForce` |
| Resultado | `results raw` | `publish` |
| Presságio | `omen omenAt omenDone omenRig` | `setOmenDone rigOmen` |
| Apresentação/preferência | `showcased reducedMotion` | `setShowcased setReducedMotion` |
| Plataforma | `error ready` | `setError setReady` |

Campos escritos por mais de um domínio:
- `gesture`: seleção (`selection()`), arremesso (`input`), resultado (`publish`).
- `throwId`: seleção e arremesso.
- `launch`, `force`, `results`: seleção (`selection()`) e arremesso (`input`); `results` também resultado.
- `dice`: seleção e importados (`removeCustom`).
- `omen`: resultado/presságio (`publish`) e preferência (`setReducedMotion`).
- `error`: composição (App), React boundary (Safeguard) e pré-simulação (Stage).

Ações que misturam domínios num `set` só:
- `addDie/removeDie/setDice` via `selection()`: seleção + arremesso + resultado (`store.ts:51-57`).
- `removeCustom`: importados + seleção + arremesso (`store.ts:110-113`).
- `input`: arremesso + resultado (`results: null`) + relógio/aleatoriedade (`store.ts:123-139`).
- `publish`: resultado + presságio + gesto (`store.ts:140-146`); calcula `omenOf` e lê `performance.now()`.
- `setReducedMotion`: preferência + presságio (`store.ts:119`).
- `addCustom/updateCustom/removeCustom`: orquestram IndexedDB + registro + store (efeitos fora do zustand).

## 4. Outros estados no escopo

| Estado | Onde | Escreve | Lê |
|---|---|---|---|
| `omenD20s: Set<string>` | kinds.ts:21 | custom.ts:56 (`registerCustom`), :60 (`unregisterCustom`) | omen.ts:15 (`isD20`). No servidor existe e fica vazio sempre; rules.ts:26 contorna mapeando importado→'d20'. No worker também fica vazio (`registerPoly` não mexe nele) |
| `dice: Map<CustomKind, CustomDie>` | custom.ts:43 | `registerCustom` :54, `unregisterCustom` :60 | `customList` :47, `customDie` :48, `customOrder` :50 → store.ts, notation.ts, polyhedra.ts, history.ts:23, Die.tsx, Hand.tsx:210, 236, Controls.tsx:46, Stage (via store) |
| `polys: Map<CustomKind, Polyhedron>` | custom.ts:44 | `registerCustom` :55, `registerPoly` :59 (worker:12 e testes), `unregisterCustom` :60 | `customPoly` :49, `customBase` :51 → polyhedra.ts:232, 252. No worker acumula sem nunca remover |
| `cache: Map<DieKind, Polyhedron>` | polyhedra.ts:227 | `polyhedron()` :240 (só embutidos) | `polyhedron()`; objetos compartilhados e mutáveis (inferência: ninguém muta hoje) |
| `cache: Map<SymbolName, BufferGeometry>` | symbols.ts:84 | `symbolGeometry` :87 | Die.tsx, Hand.tsx:223 (não dar dispose) |
| `loaded: Map<string, Promise<Object3D>>` | importer.ts:463 | `modelObject` :468 | Die.tsx:92, Controls.tsx:20. `forgetModel` :495 nunca é chamado: excluir dado não libera o modelo |
| `opened: Promise<IDBDatabase>` | indexedDb.ts:7 | `openDb` :9, reset em falha :17 | `run` :22 |
| `probed: boolean` | failure.ts:10 | `hasWebGL` :12 | App.tsx:17 |
| `SESSION`, `API` | history.ts:6, 8 | carregamento do módulo | `playerId`, `saveRoll` |
| `ready` (promise do Rapier) + `self.onmessage` | presim.worker.ts:6-7 | carregamento do worker | handler |
| `ORBITS` (calculado no import, imutável na prática) | vortex.ts:41-51 | — | Hand.tsx, vortex |
| `window.__dice` | testHook.ts:33 | `installTestHook` (Stage.tsx:197) | e2e |
| refs do ThrowLoop (`play`, `worker`) | Stage.tsx:34-35 | ThrowLoop | ThrowLoop (estado da orquestração fora do store) |

Acesso a plataforma:
| Recurso | Onde | Formato | Escreve | Lê |
|---|---|---|---|---|
| IndexedDB `dice-roller` v2 | indexedDb.ts:3-19 | stores `customDice` e `tables`, `keyPath: 'id'`; upgrade só cria o que falta | — | — |
| store `customDice` | customStore.ts:5-7 | `CustomDie` por structured clone (inclui `file.bytes: ArrayBuffer` e `poly`), `version: 1` | store.ts:86 (`addCustom`), :99 (`updateCustom`), :108 (`removeCustom`, delete) | store.ts:79 (`loadCustoms`) |
| store `tables` (fora do escopo) | scene/tableStore.ts:1 | tema de mesa | scene/tableState.ts | scene/tableState.ts |
| localStorage `diceroller.player` | history.ts:7, 13-14 | UUID v4 | `playerId` | `playerId` |
| localStorage `mesa.ativa` (fora) | scene/tableStore.ts:9-11 | id de mesa | tableState | tableState |
| `crypto.getRandomValues` | store.ts:130 | semente uint32 | — | `Launch.seed` |
| `crypto.randomUUID` | history.ts:8, 14; ImportDie.tsx:269 (id do dado); TablePanel.tsx:79, tableState.ts:21 | UUID | — | — |
| `fetch` | history.ts:32 | POST JSON `{playerId, dice:[{kind,value,base?,omens?}], force}` | — | servidor `server/src/app.ts:18-43` |
| `import.meta.env.VITE_API_URL` | history.ts:6 | URL base | build | `saveRoll` |
| `import.meta.env.MODE === 'test'` | testHook.ts:32, App.tsx:37, Stage.tsx:28, 287, Hand.tsx:74 | — | — | — |
| `matchMedia` | App.tsx:20 | reduced motion | — | — |
| `performance.now` | store.ts:145; Hand.tsx:97-131, 155; Stage.tsx:76, 83, 206; Omens.tsx:254; Tray.tsx:14 | ms | — | — |

## 5. Ciclos no escopo

### dice ↔ physics ↔ throw
| Aresta | Símbolo(s) | Diretório certo? | Onde deveria morar |
|---|---|---|---|
| dice → physics (só tipos) | `Vec3` (custom.ts:2, importer.ts:5, polyhedra.ts:11), `Quat` (read.ts:3) | não: matemática pura em world.ts:1-2 | módulo compartilhado de matemática (`shared/vec`), sem dono de domínio |
| physics → dice | `polyhedron, DieKind, Polyhedron` (presim.ts:3), `readUp, toResults` (presim.ts:4), `CustomKind` (presim.ts:2, via reexport de custom), `registerPoly` (presim.worker.ts:2) | aceitável (simulação usa o sólido); o problema é usar o **registro** | presim recebe `Polyhedron[]` já resolvidos (o `RollRequest` já leva `customs`; levar todos tira o `registerPoly` do worker) e devolve poses/raw; quem chama aplica `toResults`. Physics passa a depender só do tipo `Polyhedron` |
| physics → throw | `launchVelocity, spin` (apply.ts:3), `BodyState, SettleAction` (apply.ts:4), `initSettle, stepSettle` (presim.ts:5) | sim: o adaptador do motor aplica regras puras | manter; vira a única direção |
| throw → physics | `LAUNCH MAX_RADIUS SPIN TRAY Vec3` (aim.ts:1), `isOutside recoveryPoint SETTLE Quat Vec3` (settle.ts:1), `HAND TRAY Vec3` (vortex.ts:2) | não: são parâmetros do arremesso e da bandeja, não do motor | `LAUNCH SPIN SETTLE HAND recoveryPoint handPositions clampHandX` → módulo arremesso; `TRAY trayColliders isOutside` → módulo bandeja/mesa (camada baixa, sem dependências); `MAX_RADIUS` → dado (derivar de `max(RADIUS)`, polyhedra.ts:26); `STEP GRAVITY MATERIAL DAMPING` ficam em física |
| throw → dice | `MAX_DICE` (vortex.ts:1) | ok se dice não depender de throw/physics | manter (ou `MAX_DICE` no catálogo/seleção) |

Com isso: shared ← dice ← throw ← physics, e bandeja abaixo de throw e physics. O ciclo de carga (2b: apply.ts→aim.ts e presim.ts→settle.ts contra aim/settle/vortex→world.ts) some porque throw deixa de importar world.ts.

`throw/settle.ts:2` importa `Phase` de gesture.ts só para checar `'rolling'`; presim.ts:68 passa a constante. Interno a throw; mas se parada for para física, leva junto um tipo do gesto.

### custom.ts ↔ polyhedra.ts
- custom → polyhedra (tipo): `Polyhedron, Shape` (custom.ts:4). `Shape` é de kinds.ts (reexport).
- polyhedra → custom (valor): `customBase customKind customList customOrder customPoly isCustom CustomKind` (polyhedra.ts:12), usados em `polyhedron()` :231-234, `rank/sortDice` :247-248, `allKinds` :250, `baseOf` :252, `customsOf` :255.
- Proposta: tipos `Face Top Label Polyhedron Numbering SymbolName` num arquivo de tipos de geometria (depende só de kinds + Vec3); construtores de sólido (`fromTriangles`, embutidos, `RADIUS`, `OPPOSITE_SUM`) sem registro; um arquivo de "resolução/catálogo" (`polyhedron(kind)`, `baseOf`, `sortDice`, `allKinds`, `customsOf`) que depende de geometria e do registro. custom.ts passa a importar só os tipos. Ordem: kinds ← geometria ← custom ← resolução ← notation/read.

## 6. Protocolo do worker

- Criação: `ThrowLoop` em `scene/Stage.tsx:50-64`, `new Worker(new URL('../physics/presim.worker.ts', import.meta.url), { type: 'module' })` :52, na montagem; `terminate` no unmount :63 e no `fallback` :39. Depois de um fallback o worker **não é recriado** até remontar: todos os arremessos seguintes rodam na thread principal.
- Warm-up: `RAPIER.init()` no carregamento do worker; erro vira string (presim.worker.ts:6).
- Requisição (main → worker): `RollRequest { dice: DieKind[]; start: Pose[]; launch: Launch; customs: Record<CustomKind, Polyhedron> }` (presim.ts:12), montada em Stage.tsx:74-75 com `customsOf(dice)` (polyhedra.ts:255), enviada :78. Sem versionamento nem validação; structured clone de `Polyhedron`.
- No worker: espera `ready`; erro de init → throw :10-11; `registerPoly` para cada importado :12 (acumula); `presimulate(dice, start, launch)` sem `perturb` :13.
- Resposta (worker → main): `RollResponse = { throwId } & ({ rec: Recording } | { error: string })` (presim.ts:13); `Recording { frames: Pose[][]; raw; results; timedOut; escaped; recovered }` (presim.ts:10).
- Recepção: Stage.tsx:54-59 descarta se não há pendente, `throwId` ≠ pendente, ≠ store ou fase ≠ `rolling`; `error` → `fallback()`; senão guarda `rec`. `onerror` (com `preventDefault`) e `onmessageerror` → `fallback` :60-61; exceção no construtor → `fallback` :62 (sem worker: caminho síncrono :79).
- Timeout: `WORKER_TIMEOUT = 2000` ms :26, checado a cada passo físico :83.
- Fallback :38-49: termina o worker; se o arremesso pendente ainda é o atual e `rolling`, roda `presimulate` na thread principal (usa o registro completo do app). Rapier da thread principal precisa já estar inicializado (presim.ts:17); quem inicializa é o `<Physics>` de @react-three/rapier (inferência: mesmo pacote `-compat`, mesmo módulo). Se falhar: `console.error`, `setDice(state.dice)` (reset para a mão pelo efeito colateral de `selection()`) e `setError('physics')`.
- Caminho síncrono sem worker (:79) não tem try/catch; uma exceção sobe para o `useBeforePhysicsStep` e (inferência) cai no `Guard kind="physics"`.
- Replay e publicação: quadros via `setNextKinematic*` :84-87; no último quadro fixa pose e chama `publish(throwId, rec.results, rec.raw)` :88-95. `setError(null)` a cada arremesso novo :77.

## 7. Compartilhado com server/

| Arquivo server | Usa | Para quê |
|---|---|---|
| server/src/app.ts:3 | `CUSTOM_BASES FREE_VALUES KINDS` | schema do POST /rolls (:29-30) |
| server/src/rolls.ts:2-3 | `CUSTOM_BASES FREE_VALUES KINDS`, tipo `OmenKind` | validador `$jsonSchema` da coleção (:25-26, 31) |
| server/src/rules.ts:1-2 | `BASE isCustom FREE_VALUES KINDS SIDES CustomBase DieKind Shape`, `omenKind omenOf OmenKind` | faixa de valor por base (:9-16), total (:27), presságio (:26-27) |

Restrições:
- kinds.ts e omen.ts rodam em Node por type stripping (`node src/main.ts`, server/package.json:8-9) e são checados pelo tsconfig do server (`nodenext`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, lib ES2023 **sem DOM**): sem three, sem DOM, sem enums/namespaces; imports relativos com extensão `.ts` (omen.ts:1).
- O caminho é fixo: `../../src/dice/kinds.ts` e `omen.ts`. Mover ou renomear quebra o servidor; um `index.ts` de módulo que reexporte coisas com three também quebraria se o server passasse a importá-lo.
- omen.ts depende de `omenD20s` (estado mutável do front). No servidor fica vazio; rules.ts:26 traduz importado com `base d20 && omens` para `'d20'`. A regra "conta como d20" existe duas vezes (custom.ts:56 e rules.ts:18, 26).
- O contrato do POST é implícito: `history.ts:27-28` ↔ `app.ts:18-36`. O `playerId` precisa casar com o padrão UUID de `app.ts:8`; `kind` importado com `^custom:[A-Za-z0-9_-]{1,64}$` (rules.ts:5). Não há tipo compartilhado.
- 10 dados repetido como literal (app.ts:25, rolls.ts:21) em vez de `MAX_DICE` (que está em polyhedra.ts, com three).
- Regra de total (moeda não soma) duplicada: notation.ts:43 e rules.ts:27.

## 8. Acoplamentos fora dos imports

Inicialização (App.tsx):
1. `useState` no primeiro render: `hasWebGL()` → `setError('webgl')` antes do Canvas (:17).
2. Efeito de montagem: `loadCustoms()` (IndexedDB → registro → `customs`), `useTable.load()`, `warmImageDecoder()` (:18), sem ordem garantida em relação à montagem da Stage. A seleção começa em `['d20']`; `setDice` com importado ainda não carregado o descarta (store.ts:74).
3. Reduced motion via `matchMedia` (:19-24).
4. Histórico por `useDice.subscribe`: novo `results` → `saveRoll(s.dice, s.results, s.force)` (:26-28). O histórico conhece campos do store e lê o registro (`customDie`) no momento do envio.
5. `{!error && <Canvas>}` (:34): **qualquer** `error`, inclusive o `'physics'` posto em tempo de jogo por Stage.tsx:46, desmonta a cena inteira.
6. StrictMode (main.tsx:7) roda os efeitos duas vezes em dev: `loadCustoms` duas vezes (idempotente; inferência) e a razão do cache em failure.ts:10.
7. `setReady()` só depois de instalar o test hook (Stage.tsx:296); `ready` nunca volta a false.

`throwId`: incrementado em store.ts:53, 129; viaja em `Launch.throwId` (store.ts:132) → `initSettle`/`stepSettle` (presim.ts:51, 68; settle.ts:20) → `RollResponse.throwId` (worker:13-15); comparado em store.ts:61-62, 141; Stage.tsx:41, 56, 72, 127-128, 146-148; Hand.tsx:197, 244-245, 310; Omens.tsx:196-197, 229; krakenMotion.ts:28. `showcased` e `omenDone` guardam throwIds: quem os escreve precisa do throwId atual.

Relógios: `at` do gesto vem de `performance.now()` no componente (Hand.tsx:97-131) e vira força em `charge` (gesture.ts:35); força por quadro recalculada fora do store (Hand.tsx:335-336); `omenAt` lido do relógio dentro do `publish` (store.ts:145); timeout do worker por relógio (Stage.tsx:83); física em passos fixos (`STEP`). Semente aleatória dentro do `input` (store.ts:130): o store não é puro/determinístico.

window/DOM: `window.__dice` (testHook.ts:33); `blur` da janela cancela a carga (Hand.tsx:138); `keydown` global em Chat/ImportDie/TablePanel; `location.search` `surface-preview` (Stage.tsx:28, Hand.tsx:74); nomes de objeto `die-i`, `gem-i`, `tray-surface`, `fire`, `result-highlights` são contrato entre cena, test hook e testes; `body.userData.selection` liga Die e Hand (Hand.tsx:78).

Efeitos de import: history.ts:8 chama `crypto.randomUUID()` ao carregar; presim.worker.ts:6-7 inicia Rapier e instala `onmessage`; vortex.ts:41 calcula `ORBITS`; kinds.ts:21 cria o Set global; main.tsx:3 CSS. Imports dinâmicos de importer.ts (Die.tsx:92, Controls.tsx:20) e ImportDie (Controls.tsx:11) dependem do code splitting do Vite.

## 9. Achados

Código sem uso (produção):
- `forgetModel` (importer.ts:495): sem chamador em src nem tests.
- `clampHandX` (world.ts:47), `SYMBOLS` (symbols.ts:7), `rng` (aim.ts:27, exportado), `playerId`/`rollBody` (history.ts) e `readModel`/`detectPlanes`/`detectFree`/`idealSolid`/`tierOf`/`looksNumbered` (importer) só são usados por testes ou internamente.
- `STORES`/`openDb` (indexedDb.ts:4, 8) exportados sem uso externo.
- `handPositions` (world.ts:52) só serve ao enquadramento da câmera (Stage.tsx:168) e aos testes; a mão real é o redemoinho.

Duplicações:
- `REACH = 0.9` (vortex.ts:16) repete `MAX_RADIUS` (world.ts:23), que vortex já poderia importar.
- Helpers vetoriais: polyhedra.ts:45-48, importer.ts:150-153, vortex.ts:29-30.
- Quantização e deduplicação de vértices: importer.ts:101-106 e :369-375.
- Esfera de Fibonacci: polyhedra.ts:73-77 e vortex.ts:31-36.
- Faces por base: `FACES`/`SIDES` em importer.ts:18-19 contra `SIDES` em kinds.ts:23 (mesmo nome, outro significado).
- `omenPlaying` reimplementado (krakenMotion.ts:28); qual dado recebe qual show está em omen.ts:26-31 e também em krakenMotion.ts:20-21, 82-83 e fireMotion.ts:12-13.
- Total sem moedas: notation.ts:43 e server rules.ts:27. "Importado conta como d20": custom.ts:56 e rules.ts:18, 26.
- Guarda "entre animações" (`hand` ou `settled && showcased === throwId`) repetida em Stage.tsx:128 e :148.
- Dois tipos `Pose`: presim.ts:9 e scene/showcase.ts.
- Fonte dupla dos importados: registro em custom.ts:43-44 e `store.customs` (cópia). Componentes leem os dois (Die.tsx:186 do store; Controls.tsx:46, Hand.tsx:210, 236 do registro).

Arquivos de responsabilidade mista:
- importer.ts (496): 1-31 limites/erro/formato · 33-92 leitura de arquivo (loaders three; `parseGlb` também serve à mesa, scene/tableFile.ts:3) · 94-146 detecção d4–d20 · 148-222 geometria de sólido (simetria, cantos, polígonos, centroide) · 224-265 detecção livre/shard · 267-330 montagem do sólido e `withReadable` · 332-380 detecção de gravação (`dentTester`, `inkTriangles`, `inkOf`, `looksNumbered`) · 382-437 calibração/validação de valores · 439-459 pipeline `importModel` · 461-495 cache em memória de modelos para a cena (`modelObject`, `markInk`, `hasTexture`, `forgetModel`). O último bloco é estado de runtime e o 33-72 é compartilhado com a mesa.
- polyhedra.ts (257): 18-24 mapa de símbolos (apresentação) · 25-49 tipos e constantes · 51-143 sólidos embutidos · 145-225 `fromTriangles`/numeração · 227-243 cache + resolução via registro · 245-256 regras de seleção (`sortDice`, `allKinds`, `MAX_DICE`, `customsOf`).
- world.ts (76): 1-2 matemática · 4-5, 10-14, 18 motor · 8, 25-43, 73-75 bandeja · 16, 19, 21-22, 45-71 arremesso/mão/parada · 23 dado.
- notation.ts (98): parser (seleção) · `dieName` (catálogo/apresentação) · `slugProblem/slugOf` (importados) · `resultText` (resultado).
- custom.ts (61): tipo persistido · regra de tinta com three `Color` · registro mutável.
- store.ts (148): sete domínios (ver §3).
- Regras de negócio fora do núcleo, em componentes (contra a regra 4): orquestração worker/timeout/fallback/publicação em Stage.tsx:30-98; mapeamento de input, ômega, passo das setas e força por quadro em Hand.tsx:87-131, 335-340; montagem do `CustomDie` (presságio do livre, tinta com textura, auto-adicionar) em ImportDie.tsx:268-279; histórico via subscribe em App.tsx:26-28.

Dúvidas para o dono do negócio:
1. Falha de física em tempo de jogo (Stage.tsx:43-46): o painel diz "Tente jogar de novo" (Controls.tsx:79), mas `error='physics'` desmonta o Canvas (App.tsx:34) e a mensagem fixa pede para recarregar (failure.ts:7). Qual é o comportamento desejado? Esse caminho não tem e2e (e2e/failure.spec.ts cobre só falha de carga).
2. Depois de uma falha, o worker deve ser recriado ou a thread principal assume para sempre (Stage.tsx:39)?
3. Importado ausente do registro vira d20 (polyhedra.ts:252) e vai ao histórico sem `base` (history.ts:23-24). O servidor recusa com 400 (rules.ts:23-24, inferência). É aceitável?
4. `raw` e `omen` não são limpos na troca de seleção nem no arremesso novo (store.ts:51-57, 136). Hoje é inofensivo porque tudo é guardado por `throwId`, mas é intencional?
5. Excluir um dado importado deveria liberar o modelo em cache (`forgetModel` sem uso)?
6. Quem é a fonte da verdade dos importados: o registro (custom.ts) ou `store.customs`?
7. Presságio de teste (`omenRig`) e preferência de movimento devem ir para o histórico? Hoje o servidor recalcula tudo e ignora as duas coisas.
8. O limite de 10 dados e a regra do total (moeda não soma) são da regra do jogo (compartilhar com o servidor) ou do cliente?
9. d100: crítico em 1 e falha em 100 (Call of Cthulhu, omen.ts:3-5). Isso é fixo ou configurável por sistema de jogo?
