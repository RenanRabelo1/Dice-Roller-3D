# Inventário de testes (fase 1, diagnóstico)

Escopo lido: `tests/*.test.ts` (21), `tests/helpers/*` (4), `e2e/*.spec.ts` (13), `e2e/global.d.ts`, `server/test/api.test.ts`, configs (`vite.config.ts`, `playwright.config.ts`, `tsconfig*.json`, `package.json`, `server/package.json`, `server/vitest.config.ts`), `docs/contexto/testes.md`, `src/testHook.ts` e, da implementação, só `src/scene/Stage.tsx:194-297` (implementação do hook), `src/App.tsx:15-37`, `src/api/history.ts`, `src/dice/kinds.ts`, imports de `server/src/*`.

Contagem de casos: casos **expandidos** (`it.each`, `describe.each`, laços `for` que geram `it`/`test`). Contagem crua de linhas `it(`/`test(` (grep) entre parênteses quando diferente.
- Unidade: minha soma por arquivo dá **323**; o Vitest relata **324** (gate.log:48). Não achei o caso que falta; trate as contagens por arquivo como ±1.
- E2E: soma **80**, igual ao "Running 80 tests" do gate2.log.
- API: **23** casos.

---

## 1. Tabela por arquivo de teste

### 1a. Vitest (raiz, `tests/`), ambiente Node

| Arquivo | Tipo | Casos | O que protege | Dependências além dos imports |
|---|---|---|---|---|
| `aim.test.ts` | unidade pura | 5 | onda de carga de 1400 ms, mira limitada à bandeja, velocidade de lançamento, giro determinístico por semente | constantes numéricas cravadas: 6,1/-3,6 (`:12`), velocidade 6→22, fator 0,35 (`:18-22`), giro entre 10 e 25 (`:27`) |
| `custom.test.ts` | unidade + **física real** | 16 | dado importado (padrão e forma livre) no chat, na leitura, nos presságios, rolando na bandeja; registro só pelo sólido (worker); tinta/acabamento padrão | registro global `registerCustom`/`unregisterCustom` (estado de módulo); `afterEach` limpa só `caveira/cav/osso` (`:13`), `sete` (`:80`) fica registrado; `simulate` (Rapier wasm) |
| `fire.test.ts` | unidade pura | 3 | só a falha de d20 pega fogo; o fogo cobre os 4 cantos do feltro; a bandeja apaga, o dado continua queimando | `TRAY`, `FIRE.spread/ignite/trayOut` (tempos internos) |
| `gesture.test.ts` | unidade pura | 8 | reducer das fases hand→charging→rolling→settled→returning→hand, fonte de soltura, repetição de tecla, cancelamento, seleção reinicia tudo | forma exata do estado (`{phase, source, chargeStart}`) com `toEqual` (`:12`) |
| `highlight.test.ts` | unidade pura | 4 | número em destaque: sobe, aparece antes do voo, pousa na face no fim (escalonado), pulsa 0,4..1 | `SHOW.delay/stagger/duration` |
| `history.test.ts` | unidade (fetch simulado) | 6 | corpo do POST (dado, base, omens, livre), nada sai sem endereço, POST JSON fire-and-forget, id anônimo estável | `vi.stubGlobal('fetch')`; `localStorage` (no Node cai no `catch` → id da sessão, `history.ts:16`, então o caminho persistente **não** é exercido); registro de dados importados |
| `importer.test.ts` | unidade pura (geometria) | 64 (28 crus) | detecção d4–d20 (com e sem chanfro), reconstrução do sólido, recusas (achatado, esfera, triângulos, MB, lixo, GLB externo), numeração/oposto/giro, numerais gravados, máscara de tinta, forma livre (prismas, triacontaedro, facetas descartadas, 3..60 planos, centróide), shards (camadas, faces legíveis) | arquivos STL/GLB gerados por `helpers/models.ts`; textos pt-BR das mensagens (`/Não reconheci/`, `/triângulos/`, `/MB/`, `/mais de uma vez/`, `/vão de 1 a 6/`, `'Faltam números.'`, `/3 a 60/`); `ImportError.code === 'nao-padrao'` (`:158`); `LIMITS`, `RADIUS`; assume que o helper escreve os 12 triângulos de cada cavidade **primeiro** (`:116`) |
| `inkGlow.test.ts` | unidade (three em Node) | 3 | gravação acesa pela face em que foi cortada; malha do brilho em espaço do grupo, levantada 0,004; `null` sem tinta ou com a face para baixo | `geometry.userData.ink` (`:25`), deslocamento 0,004 cravado (`:36`) |
| `kraken.test.ts` | unidade pura | 15 | quem chama kraken/tempestade; trajetória do dado (espera, sobe, sai da tela, volta ao pose do showcase com a face para a câmera), continuidade, pegada, mesa quebra e volta, tempestade aproxima, fragmentos cobrem 15×10 sem buracos, `trayBrokenAt` (regra única) | `KRAKEN.*`, `STORM.*` (marcos de tempo internos); câmera fixa (0,14,10) fov 40 (`:7-11`); forma do estado de `trayBrokenAt` (`:102`) espelha o store |
| `notation.test.ts` | unidade pura | 38 (6 crus) | `parseDice` (compacta, ambígua, Vampiro, Fome, fogo, moedas, "bola de fogo"), recusas, teto de 10, `formatDice`, `resultText` (total, detalhe, Cara/Coroa) | texto exato pt-BR do teto (`:35`) e do painel (`:47-52`) |
| `omen.test.ts` | unidade + **store real** | 17 | `omenOf`/`omenKind` (d20 20/1, d100 1/100, dualidade), só d20/d100 contam, `omenMs` por presságio; no store: publish grava o presságio, recolher encerra, reduced motion pula/cancela, `rigOmen` força | `useDice.setState(getInitialState(), true)` (`:48`); campos do store `omen`, `omenDone`, `gesture.phase`, `results`, ações `input/publish/setOmenDone/setReducedMotion/rigOmen`; `OMEN_MS` sem chave `blood` (`:37`) |
| `physics.test.ts` | **física real em Node** | 24 | adaptadores Rapier (`bodyStates`, `toKinematic`, `applyLaunch`, `applySettle` wait/recover/reveal); cada um dos 8 corpos-base ×10 com força 0 e 1 para antes do teto, sem fuga, 1 resultado por dado; seleção mista; arremesso no canto; fuga forçada recuperada; timeout de 240 passos; replay determinístico | Rapier wasm (`initRapier`); `RigidBodyType` (enum do Rapier); `SETTLE.timeoutSteps`, `MAX_RADIUS`; `perturb` com passo 30 e `x: 20` cravados (`:132`); semente fixa 7/5/3/1/11; timeout de 180 s por caso (`:9`) |
| `polyhedra.test.ts` | unidade pura | 44 | 8 formas: uma face por lado, valores, normais, raio, rótulo na face certa, opostos somam; d4 com 3 rótulos por número, "6."/"9.", d100 de 100 faces, numeração do d6, `RADIUS`↔`MAX_RADIUS`, ordem; Vampiro/Fome/fogo como pele do d10/d6; moeda | lista exata `KINDS` (`:92`); identidade de arrays compartilhados (`toBe`, `:70-71`, `:88`); símbolos `ankh/crit/skull/fangs/heads/crown` |
| `read.test.ts` | unidade pura | 14 | `readUp` em toda face (d6..d20), d4 pelo vértice, inclinação reportada, `toResults` (d10 0→10, Vampiro, moeda inclinada 80°), dado livre lê a face de baixo, shard nunca lê uma ponta | modelos de `helpers/models.ts` |
| `settle.test.ts` | unidade pura | 6 | revela após `calmSteps` parados, movimento zera a contagem, lista incompleta nunca revela, ignora outro `throwId`/fase, recupera quem saiu, teto de passos com recuperação | `SETTLE`, `recoveryPoint` |
| `showcase.test.ts` | unidade (three em Node) | 10 | poses do showcase: número para a câmera e em pé, tudo na tela (1,6 e 0,46), distância >1,8 entre dados, ordem esquerda→direita, legenda da moeda não encosta no de baixo, dado livre (prisma e shard), modo "visto de cima" | `CAPTION.gap/scale`, `HL_SIZE`; colunas 5/3 por aspecto (`:21`); câmera fixa |
| `store.test.ts` | unidade (store real) | 7 | seleção reinicia fase/resultado/launch e incrementa `throwId`; seleção mista ordenada 1..10; soltura gera um snapshot (semente, alvo, força, mão) copiado; publish só vale para o arremesso atual em `rolling`; resultados mantidos no retorno | forma do store (`gesture`, `launch`, `results`, `force`, `throwId`, `aim`), `getInitialState`, `launch` mantém identidade (`toBe`, `:51`) |
| `symbols.test.ts` | unidade (three em Node) | 12 | cada símbolo é um desenho plano 1 de altura, centrado, simétrico; geometria criada uma vez | cache por identidade (`:16`) |
| `table.test.ts` | unidade (three em Node) | 16 | tema padrão = mesa de hoje; validação (cores, versão, limites, 360°); `extras` ida e volta; `fileSafe`; `fitTable` (escala 100×, Z para cima, deslocada, sem guia, nomes do Blender, avisos); `cleanTable`; `readTable` recusa; cores dos cacos do kraken | **nomes de objeto da cena** `base`, `feltro`, `moldura`, `guia-area-de-jogo`, `piso`, `SURFACE` (`:20-22`, `:55`, `:94-95`); `userData[EXTRAS_KEY]` (`:134`); textos pt-BR dos avisos (`/entra na área de jogo/`, `/topo do piso/`, `/mais baixa/`, `/Não achei/`, `/20 MB/`); cores cravadas (`#140E10`, `#3A0F1A`, `#3B2416`, `815435`) |
| `vortex.test.ts` | unidade pura | 7 | redemoinho da mão: 1 dado no lugar de sempre, cresce com n, cabe na bandeja, órbitas distintas, 10 dados sem sobrepor por 900 quadros, carga acelera, reduced motion parado, recolher devolve cada dado ao seu lugar | `HAND`, `VORTEX.squash/boost`, `ORBITS` |
| `world.test.ts` | unidade pura | 4 | posições da mão e pontos de recuperação dentro e sem sobrepor (1..20), `isOutside` usa a extensão do colisor, colisores fecham a caixa até a tampa | `TRAY.*`, `MAX_RADIUS`, `kind` dos colisores (`floor/wall/lid`) |

### 1b. Playwright (`e2e/`), Chrome real, `window.__dice`

Todos dependem de `window.__dice` (só existe com `vite --mode test`), de `.game-area` (foco + teclado/ponteiro) e de `data-testid="result"`, salvo indicação.

| Arquivo | Tipo | Casos | O que protege | Dependências além dos imports |
|---|---|---|---|---|
| `chat.spec.ts` | E2E | 6 | tecla C abre o chat, notação compacta + Enter troca a mão, botão/Aplicar/Esc, "c" digitado não fecha, Vampiro (símbolos nas faces + texto do painel), "bola de fogo" + botão d6 Fogo, erro mantém os dados, moedas | hook: `state` (dice, ready, phase, showcased, throwId, results), `bodies`, `labels`, `numbersVisible`, `camera`. Roles: `complementary 'Chat de dados'`, `textbox /Dados/`, `button /Chat/`, `'Aplicar'`, `'Adicionar d6 Fogo'`. Textos: "Na mão: …", "Não entendi", "d10 Vampiro: … · d10 Fome: …". CSS: `.chat-log [data-error]` |
| `coin.spec.ts` | E2E (GPU real: `args: []`, `:3`) | 2 | moeda recolhida/jogada 6×: pose válida, malha = corpo, face de cima = resultado, sobe à frente, legenda Cara/Coroa embaixo; 2 moedas + d6 em 390 px, sem rolagem horizontal | hook: `select`, `state`, `bodies`, `meshes`, `labels`, `highlights`. Posições cravadas da mão (y≈3, z≈3, `:26`; faixas `:62-63`), "sobe" = y>4 (`:39`). `getByTestId('result')` e `locator('strong')`. Escreve `screens/coin-*.png` |
| `coin-performance.spec.ts` | E2E + **desempenho** (GPU real) | 3 | 10 moedas: orçamento de quadros (p95<70 ms e máx<180 ms em ≥3 de 4 rodadas, `:81`), pose publicada = última pose gravada (<1e-5, `:75`); resultado atrasado do worker não substitui nova seleção; worker que falha ao iniciar → cálculo local | **internos**: embrulha `Worker` e filtra URL com `'presim.worker'` (`:14`, `:34`, `:88`); lê o protocolo do worker `data.rec.raw` e `data.rec.frames` (`:17`); `import('/src/store.ts')` pelo dev server e `useDice.subscribe` com `gesture.phase` (`:26-33`); bloqueia rota `**/presim.worker.ts?worker_file*` (`:111`); `worker.evaluate` troca `self.postMessage`. Hook: `select`, `state`, `bodies`, `meshes`, `labels`, `highlights`, `launches` |
| `coin-software.spec.ts` | E2E + **desempenho** (SwiftShader) | 1 | com GL por software o DPR cai (<0,6 em 2 s) e recolher 10 moedas mantém mediana <125 ms | razão `canvas.width/clientWidth` (`:17`); hook: `select`, `state`, `bodies` |
| `failure.spec.ts` | E2E | 4 | sem WebGL, renderer que falha, física (wasm) que não carrega → mensagem pt-BR, sem canvas, página continua; página sã sem mensagem | `addInitScript` troca `getContext` e `WebAssembly.instantiate*`; o teste do renderer **conta chamadas a `getContext`** (a 1ª é a sonda do app, `:21-27`); `data-testid="failure"`, textos exatos; heading 'Rolador de dados'; hook: `state().error/ready` |
| `import.spec.ts` | E2E | 9 | STL d20 → rolar → face = resultado → recarregar mantém → chat com apelido → excluir (some após recarregar); calibração face a face com sugestão do oposto e recusa de repetição; GLB d8; recusas pt-BR; 10 dados de 48 020 triângulos; prisma livre (lê por baixo, voa com a face para a câmera, sobrevive ao reload); tinta/acabamento ao vivo e persistidos; shard (só faces grandes); shard gravado com brilho | **arquivos gerados por helper** (`tests/helpers/models.ts`: `modelTriangles`, `stl`, `glb`, `subdivided`, `asFile`, `prismTriangles`, `shardTriangles`) e **imports de valor de src** (`polyhedron`, `detectFree`, `idealSolid`) rodando no Node do Playwright; `import('three')` no Node (`:119`). testids `import-file`, `import-shape`, `import-hint`, `import-suggestion`, `import-tier`, `import-progress`; `#import-die[data-open]`, `.import-preview[data-ink|data-finish]`, `.pool`. Rótulos 'Nome', 'Que número está nesta face?', 'Que número você lê com ele apoiado assim?', 'Branca', 'Fosco', 'Automática', 'Gema', 'Sem tinta', 'Tinta'. Botões 'Importar dado', 'Continuar', 'Salvar', 'Não, numerar para mim', 'Sim, calibrar', 'Importar como dado de forma livre', 'Sim, só as grandes', 'Adicionar/Excluir d20 Caveira', 'Adicionar Prisma'. `dialog` de confirmação. **IndexedDB** (persistência entre reloads). `gemLook().material === 'MeshStandardMaterial'` (`:215`, nome de classe three). Hook: `state`, `select`, `bodies`, `labels`, `camera`, `customs`, `numbersVisible`, `gemLook`, `highlights`, `inkGlow` |
| `kraken.spec.ts` | E2E (GPU real, **relógio simulado**, 180 s) | 5 | d100=1 **natural**: kraken agarra, mesa quebra, dado sobe, é arremessado para fora (y>9, z<-10), volta com o 1 para você, resultado retido até o fim, mesa recomposta, pose final estável (1440 e 390 px); recolher, trocar seleção e reduced motion recompõem a mesa na hora | **busca de semente** no navegador: `import('/src/store.ts')` e `import('/src/physics/presim.ts')`, lê `state.launch`/`state.dice`, chama `presimulate(dice, start, launch)` até 2000 vezes e faz `useDice.setState({ launch })` (`:22-33`); depende de o `setState` chegar antes do pedido ao worker (relógio pausado; inferência). `page.clock.install/pauseAt/runFor`; `state().omenTime` para avançar; marcos 1750/3000/4700/6600 ms cravados. CSS `.game-area[data-kraken]`, `.omen`. Hook: `select`, `rigOmen`, `state` (dice, ready, phase, results, trayBroken, omenDone, throwId, showcased, omenTime, reducedMotion), `bodies`, `labels`, `camera`. Screenshots `screens/kraken-*` |
| `omen.spec.ts` | E2E | 10 | 5 presságios forçados (raio, kraken, fogo+tempestade, dualidade, os dois críticos) seguram o resultado até a cena se recompor; reduced motion pula; ligar reduced motion no meio libera; recolher cancela e o próximo repete; d20=1 pega fogo, vai à frente queimando e só apaga ao recolher; d100=100 se aproxima na tempestade | `rigOmen` (presságio forçado, física real); CSS `.game-area[data-omen|data-storm]`, `.omen`, `.omen-flash`, `.omen-deep`, `.omen-rain`, `.omen-rain i`, `.omen-heat`, `.omen-blood`/`.omen-heaven` (ausência); `waitForTimeout(350/800/1200/1600)`; tipos `DieKind`, `Omen` de src. Hook: `select`, `rigOmen`, `state` (ready, phase, showcased, throwId, omenDone, omen, burning), `bodies`, `camera` |
| `roll.spec.ts` | E2E | 12 | face voltada para a câmera = resultado publicado (d6, 3d20, 10d100, mista d10+2d12+d100); painel com total e parcelas; corpos reaproveitados (handles); lançamento sem salto (poses antes=depois); novo `throwId` ao repetir; seta move a mira; Espaço em botão não arremessa; captura de ponteiro + barra 'Força'; blur cancela; reduced motion volta sem voo; toque secundário não solta a carga (ponteiro e tecla); layout 1440/390 sem rolagem; moeda Cara/Coroa | CDP `Emulation.setTouchEmulationEnabled`/`Input.dispatchTouchEvent`; `hasPointerCapture(1)`; `body.type === 2` (enum Rapier KinematicPositionBased, `:119`); posição da mão (3, 3) (`:119`); seletores `header.controls`, `footer`, `canvas`; roles `button 'Adicionar d6'`, `'Adicionar Moeda'`, `'Remover d20'`, `progressbar 'Força'`, heading. Hook: `select`, `state` (ready, phase, showcased, throwId, results, dice, aim), `bodies`, `labels`, `camera`, `launches`, `numbersVisible` |
| `screens.spec.ts` | E2E (pixels) | 10 (1 cru) | numerais visíveis na superfície de d4/d6/d10/d20/d100 em 3 orientações, 1440 e 390 px, cena longe das bordas | `/?surface-preview` + `previewSurface`; análise de pixels (dourado vs. tinta escura, limiares de luma 140/0,6, `colors>50`, margens 4–5 px CSS); depende de qual dado tem tinta escura (`INK` em `Die.tsx`, comentário `:26`); `preserveDrawingBuffer`; tipos `DieKind`, `Quat` de src; grava `screens/one-*.png` |
| `smoke.spec.ts` | E2E | 6 | contexto WebGL e renderer; canvas pinta >50 cores sem erro de console; d6 rola com números visíveis e opostos opostos; toda seleção d4..d100 cria corpos e numerais certos; prévia de superfície: texto e gema seguem a mesma transformação; 10 d100 mantêm handles ao reselecionar | hook: `select`, `state`, `bodies` (`type === 2`, `:101`), `labels`, `meshes`, `camera`, `numbersVisible`, `previewSurface`; `?surface-preview` |
| `table.spec.ts` | E2E | 10 | fundo por tema/foto/cor, desfoque/escurecer, sobrevive ao reload, restaurar; cores de feltro/madeira mudam o pixel; imagem de feltro (cor vira branco, tinge de novo); textura opaca exportada como JPEG; exportar→importar dá a mesma mesa (M13); arquivo em cm/Z para cima/deslocado é encaixado e moldura invadindo gera aviso; recusas; **upgrade IndexedDB v1→v2** preserva `customDice`; fundo 360° (reflexo e giro sem recompilar shader, proporção errada recusada); 360° sobrevive a exportar/importar | **arquivos gerados por helper** (`tableGlb`, `noisePng`); PNG 1×1 inline; download real (`waitForEvent('download')`) e leitura do arquivo; IndexedDB `dice-roller` v1/v2, stores `customDice`/`tables` (`:205-226`); pixels do canvas (`feltPixel` em 50%/30%, `patch`); `#table-panel[data-open]`, `.chat-toggle` com texto 'Mesa', `.backdrop[data-kind]`, `.backdrop-art`, `.backdrop-dim` (CSS `filter`, `opacity`, `background-image`); testids `table-photo`, `table-felt-image`, `table-import`, `table-panorama`, `table-warnings`; rótulos 'Desfoque', 'Escurecer', 'Cor do fundo', 'Feltro', 'Madeira', 'Textura do feltro', 'Nome da mesa', 'Refletir nos dados', 'Girar', 'Brilho'; `table().programs` (nº de programas de shader); `waitForTimeout(600)` para o debounce |
| `table-kraken.spec.ts` | E2E (GPU real, relógio simulado, 180 s) | 2 | cacos do kraken com a cor do feltro da mesa; modelo importado sem piso some inteiro e volta | **interno**: `import('/src/scene/tableState.ts')` e `useTable.getState().edit(...)`/`.apply({...registro completo do tema...})` (`:5`, `:34-55`); `tableGlb({ floor: false })`. Hook: `select`, `rigOmen`, `state` (trayBroken, error, omenTime, phase, dice, ready), `shards`, `table().model` |

### 1c. API (`server/`)

| Arquivo | Tipo | Casos | O que protege | Dependências |
|---|---|---|---|---|
| `server/test/api.test.ts` | API (Fastify `inject` + MongoDB em memória) | 23 (9 crus + `it.each` de 14) | POST salva com total/presságio calculados no servidor; dualidade e d100 de Cthulhu; dado importado com base e `omens`; forma livre -99..999 e total negativo; 14 recusas 400; ignora `total` do cliente; paginação por jogador (`limit`, `before`, `next`, teto 100); validador `$jsonSchema` da coleção e índice `player_history`; `collMod` de coleção antiga; `/health` e CORS | `mongodb-memory-server` (baixa o binário do `mongod` no 1º uso; `hookTimeout` 300 s); `buildApp({store, ping, origins})` e `rollStore/rollsCollection` (assinaturas internas); nome do índice `player_history` (`:96`); **depende de `src/dice/kinds.ts` e `src/dice/omen.ts`** via `server/src/app.ts:3`, `rolls.ts:2-3`, `rules.ts:1-2` (fora da seção 6 do grafo, que só lista `app.ts` e `rolls.ts`) |

---

## 2. Helpers

| Helper | O que faz | Quem usa |
|---|---|---|
| `tests/helpers/sim.ts` | `initRapier()`: inicia `rapier3d-compat` uma vez e silencia o aviso do wasm-bindgen (`:9-18`). `simulate({kind,count,dice?,force,target,seed,perturb?})`: monta a mão com `handPositions` e roda o **mesmo `presimulate`** do app; devolve `results`, `frames`, `escaped`, `recovered`, `timedOut`, `steps`, `bodies`, `final` (`:21-32`) | `physics.test.ts`, `custom.test.ts` (nenhum E2E) |
| `tests/helpers/models.ts` | Gera modelos a partir dos sólidos do próprio app: `modelTriangles` (chanfro, gravação hexagonal, girado/escalado 25×/deslocado como um fatiador), `stl`, `glb` (com URI externa opcional), `customDieOf` / `freeDieOf` (**registram** um dado importado no registro global, ids `test-<slug>`), `subdivided`, `hullTriangles`, `prismTriangles`, `planesSolid`, `triacontahedronNormals`, `asFile`, `shardTriangles`. `stockPoly` (`:42`) não é usado por ninguém | `importer`, `custom`, `read`, `showcase`, `history`, `table` (só `glb`) e `e2e/import.spec.ts`. Importa `src/physics/world` (tipo), `src/dice/custom`, `src/dice/importer`, `src/dice/polyhedra` e `three/examples/jsm/math/ConvexHull.js` |
| `tests/helpers/tableGlb.ts` | Monta à mão um `.glb` de mesa (nós `mesa`, `piso`, `base`, `feltro`, `moldura`, `parede`, `pilar`, `guia-area-de-jogo`) com opções escala/Z para cima/deslocamento/pilar/sem guia/sem piso/sem moldura/`extras.diceRollerTable` | `e2e/table.spec.ts`, `e2e/table-kraken.spec.ts`. Não importa nada de `src/`, mas **codifica os nomes de nó** que o app procura |
| `tests/helpers/noisePng.ts` | PNG de ruído opaco `size×size` (pior caso para codec), escrito com zlib do Node | `e2e/table.spec.ts:104` (teste do JPEG). Sem imports de `src/` |

---

## 3. Matriz funcionalidade × cobertura

U = unidade, E = E2E, A = API. Lacuna = o que valeria proteger **antes** de mover código.

| Funcionalidade | Unidade | E2E | API | Lacuna |
|---|---|---|---|---|
| Seleção por botões | `store.test:16` (addDie/removeDie, nunca vazia, teto 10); `polyhedra:91` (ordem) | `roll:87-90` ('Adicionar d6'), `roll:177-181` ('Adicionar Moeda', 'Remover d20', texto "1 moeda"), `chat:75-77` ('9d6 Fogo'), `import:52,61,71` | — | botão desabilitado com 10 dados e 'Remover' com 1 (`Controls.tsx:42,44`) sem E2E; `aria-pressed` não checado |
| Chat / notação | `notation` (38), `custom:15-38,101-123` | `chat` (6), `import:62-65,180-183` (apelido após reload) | — | C com foco em outro campo de texto que não o do chat; mensagem do teto de 10 só na unidade |
| Limite de dados | `notation:33`, `store:22` | indireto (10 moedas, 10 d100, 10 importados) | `api:67` (11 dados → 400) | `setDice` corta em 10 e descarta importado desconhecido (`store.ts:74`) sem teste; o hook `select` passa por esse caminho em todo E2E sem verificá-lo |
| Mira | `aim:11` (clampTarget), `physics:126` (canto) | `roll:85` (só ArrowRight +0,5) | — | ArrowLeft/Up/Down (`Hand.tsx:121-124`) e mira pelo movimento do ponteiro sem teste |
| Carga / força | `aim:7,15`, `store:25,40,72`, `vortex:48` | `roll:96` (progressbar 'Força' visível) | `api:70` (força>1) | valor da barra e relação tempo segurado→força na UI real não conferidos |
| Fases do gesto | `gesture` (8), `store` (7) | `roll:70,82,104,123-155` (repetir, captura, blur cancela, toque secundário) | — | bem coberto |
| Pré-simulação e determinismo | `physics:143` (replay), `physics:102-122` (8 bases ×2 forças, mista), `custom:58,81` | `roll:44-49` (lançamento sem salto), `coin-performance:75` (pose publicada = gravação) | — | nenhum teste compara worker × cálculo local para a mesma semente; a versão fixa do Rapier (cena = pré-sim) não tem guarda automática |
| Worker e fallback | `custom:69` (registerPoly: worker sem registro) | `coin-performance:85` (resposta atrasada descartada), `:109` (worker bloqueado → local) | — | `WORKER_TIMEOUT` 2 s (`Stage.tsx:26,83`) sem teste; worker **e** local falhando → `error: 'physics'` e dados voltam à mão (armadilhas.md:23) sem teste |
| Parada / recuperação / timeout | `settle` (6), `physics:125-141`, `world:18` | nenhum direto | — | revelar com `timedOut` na cena e o que o jogador vê nesse caso, sem E2E |
| Leitura do resultado | `read` (14), `custom:42` | todo spec de rolagem compara face × `results` (`roll:5-15`, `chat:59-64`, `import:17-24`, `coin`) | — | **d4 nunca rolado em E2E**: o parâmetro `d4` de `topValue` (`roll:5,13`) nunca é passado |
| Cada dado embutido | `polyhedra` (8 formas), `physics` (8 bases), `symbols` | `smoke:53` (corpos e numerais d4..d100); rolados: d6, d20, d100, d10, d12 (só mista), moeda, vtm/hunger | `api:23,35` | **d4, d8 e fogo nunca rolados em E2E** (d8 só como GLB importado); smoke não cria moeda/vtm/fogo |
| Moeda | `polyhedra:97-109`, `read:38`, `notation:46,55`, `showcase:17` | `roll:177`, `coin` (2), `coin-performance` (3), `coin-software`, `chat:92` | `api:65` | bem coberta |
| d100 | `polyhedra:47`, `omen`, `kraken` | `roll:52`, `smoke:96`, `kraken`, `omen` | `api:33-34` | ok |
| Vampiro / Fome / fogo | `polyhedra:63-90`, `read:35`, `notation`, `omen:25` | `chat:41` (símbolos + painel), `chat:68` (fogo: só rótulos) | `api:35` | fogo nunca rolado em E2E |
| Total e texto do painel | `notation:46` | `roll:41-42,67`, `chat:65`, `coin:40,76`, `kraken:86` | `api:22,75` (total do servidor) | total **negativo** (dado livre) no painel: nem `resultText` nem E2E testam |
| Regra dos presságios | `omen` (17), `custom:51`, `kraken:21`, `fire:6` | só `kraken:58` é natural (busca de semente); o resto usa `rigOmen` | `api:22,32,38,47` | d20 natural 20/1 nunca em E2E; regra cliente × servidor só igual por compartilharem `omen.ts` |
| Animação: raio | `omen:31` (só duração) | `omen:21,25` (`.omen-flash`, resultado retido) | — | nenhum teste da parte 3D do raio, só do overlay HTML |
| Animação: kraken | `kraken.test` (15) | `kraken` (5), `table-kraken` (2), `omen:22,25` | — | coberto |
| Animação: fogo | `fire` (3) | `omen:23,101` (`burning`, `.omen-heat`, à frente, apaga ao recolher) | — | ok |
| Animação: tempestade | `kraken:72` | `omen:23,117` (`.omen-rain`, aproxima) | — | ok |
| Animação: dualidade | `omen:12-18,38` | `omen:24,58,68,81` (`data-omen=duality`, `.omen` genérico) | `api:33` | o que a dualidade mostra não é conferido além do overlay genérico |
| Showcase e destaque | `showcase` (10), `highlight` (4), `inkGlow` (3) | `showcased === throwId` em quase todo spec; `coin` (legendas), `import:163-176` (voo do prisma), `import:242-262` (brilho), `omen:108` | — | se o showcase é pulado com reduced motion não é afirmado (`roll:104` só confere o retorno à mão) |
| Importar dado padrão | `importer` (64), `custom` | `import:44,78,103,114,125` | `api:38` | importados d4/d10/d12 nunca em E2E; opção "conta como d20 para presságios" na UI sem E2E; apelido em conflito (`slugProblem`) na UI sem E2E; Esc fecha o assistente (`ImportDie.tsx:153`) |
| Forma livre e shards | `importer:149-256`, `read:47-80`, `showcase:54`, `custom:79-123`, `history:18` | `import:141,223,246` | `api:47,56-59,99` | valores negativos/repetidos digitados no assistente sem E2E (`checkFreeValues` só na unidade) |
| Tinta e acabamento | `custom:125-137`, `importer:111-147`, `inkGlow` | `import:186` (prévia, ao vivo, persistido) | — | ok |
| Persistência dos importados | nenhuma (`customStore.ts` sem teste; Node não tem IndexedDB) | `import:60,74,178,218` (reload), `table:198` (upgrade preserva `customDice`) | — | registro antigo/corrompido no IndexedDB, falha de escrita, hidratação (`loadCustoms`) com dado inválido |
| Mesa e fundo | `table.test:13-49` | `table:34,70,88` | — | tecla M e Esc do painel (`TablePanel.tsx:26-27`); "editar a padrão cria Minha mesa"; trocar entre mesas salvas |
| Fundo 360° | `table.test:30` | `table:249,273` | — | `.hdr` (HDRLoader, half float), teto 2048 px no SwiftShader, aplicar só em `hand`/showcase encerrado (mesa.md:50-52), `fundo-360` sem `extras` |
| Exportar/importar mesa `.glb` | `table.test:51-136` | `table:103,120,160,184` | — | aviso "sem tema nos extras" (mesa.md:34) e "sem piso" via UI |
| Persistência da mesa (IndexedDB + localStorage, v1→v2) | nenhuma (`tableStore.ts` sem teste) | `table:40,52,65,83` (reload), `table:198` (v1→v2) | — | `sessionOnly` sem IndexedDB (mesa.md:25), `localStorage` bloqueado (`tableStore.ts:10-11`), gravação no `pagehide`; os testes esperam 600 ms por um debounce de 300 ms |
| Falhas (WebGL, renderer, física) | — | `failure` (4) | — | falha da física **durante** o arremesso; "o primeiro erro vale" |
| Reduced motion | `omen:69,73`, `vortex:59`, `kraken:109` | `roll:104`, `omen:58,68`, `kraken:97` | — | ok (ver showcase) |
| Teclado / acessibilidade | — | Espaço (todos), C/Esc (`chat:10,25`), ArrowRight (`roll:85`), Espaço nativo do botão (`roll:87`), foco volta ao botão (`chat:38`); roles complementary/textbox/progressbar/heading/alert | — | M, Esc no assistente, três setas, `aria-label "Área de arremesso"` (`App.tsx:31`), anúncio do resultado (live region; inferência), nada de axe/contraste |
| Histórico no cliente | `history` (6) | nenhum | — | a inscrição `App.tsx:26-28` (um POST por resultado, com `s.force`) sem teste; `dev:test` não define `VITE_API_URL`, então o caminho online nunca roda em E2E; `localStorage` real do id não é exercido no Node |
| Histórico na API | — | — | `api` (23) | GET sem `playerId` / `before` inválido, origem CORS recusada, `/health` com banco fora, `main.ts`/env. **A suíte não está no gate nem no `npm test` da raiz** |
| Desempenho | — | `coin-performance:5`, `coin-software:5`, `table:265,270` (`programs` constante), `import:125` (só `console.log` do tempo) | — | orçamentos calibrados na máquina do autor; nada guarda luzes constantes, `Show.compile` ou `BatchedText` (armadilhas.md:19-21) além do `programs` no 360° |

---

## 4. Fragilidade à refatoração

### 4a. Testes presos a detalhes internos

**Caminhos que o compilador NÃO vê** (quebram em tempo de execução ao mover arquivos; a seção 6 do grafo não os lista):
- `e2e/kraken.spec.ts:33`: `'/src/store.ts'` e `'/src/physics/presim.ts'` (import dinâmico pelo dev server).
- `e2e/coin-performance.spec.ts:33`: `'/src/store.ts'`; `:14,34,88`: URL do worker contém `presim.worker`; `:111`: rota `**/presim.worker.ts?worker_file*`.
- `e2e/table-kraken.spec.ts:5`: `'/src/scene/tableState.ts'` (o comentário diz que é variável justamente para o TypeScript não resolver).
- `e2e/global.d.ts:2`: `import('../src/testHook')` (quebra o `tsc -b` do build, não a execução).
- `server/src/{app,rolls,rules}.ts` → `../../src/dice/kinds.ts` e `../../src/dice/omen.ts` com extensão `.ts` (Node puro, type stripping). Mover ou fazer `omen.ts` importar algo com three/JSX quebra a API, e **nada no gate acusa** (o gate não roda `cd server && npm test` nem `npm run typecheck` do servidor).

**Forma do store e APIs internas usadas por E2E:**
- `kraken.spec:24-28`: `useDice.getState().launch`, `.dice`, `useDice.setState({ launch })`, assinatura `presimulate(dice, start, launch).results`.
- `coin-performance:28`: `useDice.subscribe` com `s.gesture.phase`; `:17`: protocolo da mensagem do worker (`data.rec.raw`, `data.rec.frames`).
- `table-kraken:36,51-54`: `useTable.getState().edit(patch)` e `.apply(registroCompletoDoTema)` (campos `version, id, name, createdAt, background, felt, wood, model{name, bytes}`).

**Nomes de objeto da cena, userData, enums e constantes:**
- `table.test:20-22,55,71,94-95,134`: nós `base`, `feltro`, `moldura` (4 filhos), `guia-area-de-jogo`, `piso`, `SURFACE`, `userData[EXTRAS_KEY]`.
- `inkGlow.test:25`: `geometry.userData.ink`.
- `roll.spec:119`, `smoke:101`: `body.type === 2` (enum do Rapier).
- `import.spec:215`: `material === 'MeshStandardMaterial'`.
- `failure.spec:21-27`: ordem e número das chamadas a `getContext` (sonda do app primeiro).
- `screens.spec:26-27`: quais dados têm tinta escura (`INK` em `Die.tsx`).
- Coordenadas cravadas: mão em (y≈3, z≈3) em `coin:26` e `roll:119`, kraken fora da tela em y>9, z<-10 (`kraken.spec:73`), câmera (0,14,10) fov 40 em `kraken.test`/`showcase.test`.
- Testes que fixam constantes internas: `KRAKEN`, `STORM`, `FIRE`, `SHOW`, `HL_SIZE`, `CAPTION`, `SETTLE`, `TRAY`, `HAND`, `VORTEX`, `ORBITS`, `OMEN_MS`, `LIMITS`, `RADIUS`, `MAX_RADIUS`, `GUIDE`, `SURFACE`, `EXTRAS_KEY`.

**Símbolos que provavelmente não iriam para um `index.ts` de domínio** (os testes de unidade os importam direto):
- `physics/apply`: `applyLaunch`, `applySettle`, `bodyStates`, `toKinematic`.
- `scene/inkGlow`: `glowMesh`, `upInk`.
- `scene/krakenMotion`: `fractureCells`, `krakenDieAt`, `stormDieAt`.
- `scene/Kraken`: `shard`, `shardWood`.
- `scene/tableFile`: `cleanTable`, `fitTable`, `readTable`.
- `dice/importer`: `detectPlanes`, `idealSolid`, `tierOf`, `unevenOf`, `withReadable`, `inkTriangles`, `inkOf`, `looksNumbered`, `askOrder`, `renumbered`, `suggestOpposite`.
- `throw/vortex`: `newWhirl`, `stepWhirl`, `restingPlaces`, `spinAngle`.
- `scene/highlight`: `highlightAt`.
- `dice/custom`: `registerPoly`, `unregisterCustom`.

Decisão necessária: ou o teste de um módulo pode importar o interior do próprio módulo, ou a porta exporta isso só para teste.

**Estado global entre casos:** registro de dados importados (`registerCustom`) e store zustand (singleton). `custom.test:13` não limpa `test-sete`; `read.test:49` não limpa `test-prisma`. Hoje isso funciona porque o Vitest isola por arquivo (padrão; inferência). Se a refatoração juntar arquivos ou mudar o isolamento, aparecem vazamentos.

**Imports de src pelo lado Node do Playwright:**
- Valor: `import.spec` (`polyhedron`, `detectFree`, `idealSolid`, via `tests/helpers/models` também `custom`/`importer`).
- Só tipo: `omen.spec` (`DieKind`, `Omen`), `screens.spec` (`DieKind`, `Quat`). A execução sobrevive porque os tipos são apagados, mas o `tsc -b` do build quebra.

### 4b. Sobrevivem a qualquer mudança de pasta (só UI/HTTP/`window.__dice`)

- `chat.spec`, `coin.spec`, `coin-software.spec`, `failure.spec`, `roll.spec`, `smoke.spec`: nenhum import de `src/` (só `window.__dice` e o DOM; `global.d.ts` à parte).
- `table.spec`: só importa `tests/helpers/{noisePng,tableGlb}`, que não importam `src/`.
- `omen.spec` e `screens.spec`: execução sobrevive (imports só de tipo); typecheck não.
- Quebram por caminho: `import.spec` (valores de src), `kraken.spec`, `coin-performance.spec`, `table-kraken.spec` (strings de dev server), `api.test` (via `server/src` → `src/dice/kinds.ts`, `omen.ts`) e todos os 21 de unidade + `helpers/models.ts` e `helpers/sim.ts` (imports diretos; ver grafo §6: `polyhedra` 13 arquivos, `world` 12).

Todos os E2E sobrevivem a mover arquivos **desde que** `Stage.tsx` (ou quem o substituir) continue chamando `installTestHook` com a mesma semântica, os nomes de objeto da cena se mantenham (ver 4c) e os textos, roles, testids, ids e classes CSS da UI fiquem iguais.

### 4c. `src/testHook.ts`

- **Do que depende:** só de tipos: `DieKind` (`dice/polyhedra`), `DiceError` (`store`), `Omen`/`OmenKind` (`dice/omen`), `Quat`/`Vec3` (`physics/world`), `Phase` (`throw/gesture`) (`testHook.ts:1-5`). Instala `window.__dice` só com `import.meta.env.MODE === 'test'` (`:32`).
- **Quem implementa:** `src/scene/Stage.tsx:197-295`, atrelado à cena. Usa:
  - Objetos da cena por nome: `die-${i}` com filho de `userData.labels` (`:194`), `gem-${i}` (`:220`, `:246`), `tray-surface` (`trayBroken`, `:206`), `fire` (`burning`, `:207`), `result-highlights` (`:255`), `ink-glow-${i}` (`:259`), `guia-area-de-jogo`, `feltro`, `base`/`madeira`, `mesa` (`:269-277`), `kraken-fragments` (`:281`).
  - userData: `label.userData.text/value`, `geometry.userData.ink`, `userData.imported`, `map.userData.placeholder`.
  - Stores `useDice` e `useTable`; refs `bodies`, `launches`, `info.programs`.
- **`ready`** (`Stage.tsx:203`) = `store.ready` + chave da seleção montada + nº de corpos válidos. É o portão de quase todo `beforeEach`.
- **Outros pontos ligados ao modo test:** `preserveDrawingBuffer` (`App.tsx:37`, necessário para os testes de pixel), `?surface-preview` (`Hand.tsx:74`, `Stage.tsx:28,112,141,287`).

Uso por spec (métodos; campos de `state()` entre parênteses):

| Spec | Métodos |
|---|---|
| chat | `state` (dice, ready, phase, showcased, throwId, results), `bodies`, `labels`, `numbersVisible`, `camera` |
| coin | `select`, `state` (ready, dice, phase, showcased, throwId, results), `bodies`, `meshes`, `labels`, `highlights` |
| coin-performance | `select`, `state` (ready, phase, showcased, throwId, results), `bodies`, `meshes`, `labels`, `highlights`, `launches` |
| coin-software | `select`, `state` (ready, phase, showcased, throwId), `bodies` |
| failure | `state` (ready, error) |
| import | `select`, `state` (ready, phase, showcased, throwId, results, error), `bodies`, `labels`, `camera`, `customs`, `numbersVisible`, `gemLook`, `highlights`, `inkGlow` |
| kraken | `select`, `rigOmen`, `state` (ready, dice, phase, results, trayBroken, omenTime, omenDone, throwId, showcased, reducedMotion), `bodies`, `labels`, `camera` |
| omen | `select`, `rigOmen`, `state` (ready, phase, showcased, throwId, omenDone, omen, burning), `bodies`, `camera` |
| roll | `select`, `state` (ready, phase, showcased, throwId, results, dice, aim), `bodies`, `labels`, `camera`, `launches`, `numbersVisible` |
| screens | `select`, `state` (ready), `labels`, `meshes`, `previewSurface` |
| smoke | `select`, `state` (ready, phase, showcased, throwId), `bodies`, `labels`, `meshes`, `camera`, `numbersVisible`, `previewSurface` |
| table | `state` (ready, error), `table` (todos os campos, inclusive `programs`, `reflect`, `guide`, `saved`, `imported`), `bodies` |
| table-kraken | `select`, `rigOmen`, `state` (ready, dice, phase, trayBroken, omenTime, error), `shards`, `table` (model) |

Todos os 16 métodos do `DiceHook` são usados por algum spec.

---

## 5. Como os testes rodam

- **Unidade:** `npm test` = `vitest run`.
  - `vite.config.ts:8`: `include: ['tests/**/*.test.ts']`, `environment: 'node'`, `testTimeout: 10_000`.
  - `physics.test` dá 180 s por caso; a suíte inteira levou 4,49 s (gate.log).
  - Rapier wasm carregado no Node por `initRapier`; three e `three/examples/jsm` em Node (sem DOM).
  - Sem IndexedDB e sem `localStorage` utilizável (aviso `--localstorage-file` no Node 25; `history.ts` cai no `catch`).
  - Node visto no log: v25.9.0.
- **E2E:** `npm run e2e` = `playwright test`.
  - Requer **Google Chrome instalado** (`channel: 'chrome'`, não o Chromium do Playwright).
  - `webServer`: `npm run dev:test` = `vite --mode test --host 127.0.0.1 --port 5179 --strictPort`, `reuseExistingServer: false`, 60 s para subir. A **porta 5179 precisa estar livre** (senão falha); outra rodada em paralelo exige config temporário com outra porta (testes.md:70).
  - `workers: 1`, `timeout: 120_000`, `expect.timeout: 30_000`, viewport 1440×900.
  - Args padrão `--use-gl=angle --use-angle=swiftshader` (GL por software). `coin`, `coin-performance`, `kraken` e `table-kraken` trocam para `args: []` (**GPU real da máquina**). Por isso o Playwright os agrupa em outro worker e roda depois (o log mostra chat→failure→import→omen… antes dos `coin*`).
  - `kraken` e `table-kraken`: 180 s e `page.clock`.
  - Esperas por `settled` com 90 s.
  - Gera `screens/*.png`, `test-results/`, `playwright-report/` (ignorados no git). `coin.spec` grava em `screens/` sem `mkdir`; o Playwright cria a pasta (inferência).
- **Tipos:** `npm run build` = `tsc -b` com `tsconfig.test.json` (inclui `tests`, `e2e`, `playwright.config.ts`). Erros de tipo nos testes quebram o **build**, não o `npm test`.
- **API:** `cd server && npm install && npm test` (Vitest com `server/vitest.config.ts`: `include test/**`, `testTimeout 30 s`, `hookTimeout 300 s`).
  - Deps próprias em `server/node_modules`.
  - Node ≥ 22.18 (roda `.ts` direto).
  - `mongodb-memory-server` baixa o binário do `mongod` na 1ª execução: precisa de rede e cache; é o motivo do `hookTimeout` de 300 s.
  - Typecheck à parte: `npm run typecheck` em `server/`.
  - **Fora do gate** do CLAUDE.md e fora do `npm test` da raiz.
- **Sensível à carga da máquina:**
  - `coin-performance` (p95/máx de quadro), `coin-software` (mediana e queda de DPR em 2 s), `table:249-270` (polls de 20 s por mudança de pixel).
  - 23 `waitForTimeout`, entre eles:
    - duração da carga 150–700 ms (força = onda de carga no tempo real);
    - 600 ms de debounce;
    - 350/800/1200/1600 ms nos presságios.
  - `omen:73-74` com timeout de 800 ms.
  - `kraken.spec`: busca até 2000 pré-simulações na thread principal; `clock.pauseAt` falha sob carga (testes.md:70).
  - Falso negativo conhecido: timeout no `beforeEach` esperando `ready`.

---

## 6. Achados

- **Pulados/focados:** nenhum `.skip`, `.only`, `.fixme` nem skip condicional em `tests/`, `e2e/`, `server/test/` (grep = 0).
- **Sem asserção real:**
  - `import.spec:125` mede o tempo dos 10 dados pesados só com `console.log` (8 359 ms no gate2.log), sem orçamento; o caso só afirma que termina.
  - `history.test:29-37`: "erro de rede engolido" só é garantido implicitamente (rejeição não tratada derrubaria o Vitest); não há `expect` sobre isso.
  - `smoke:8` só verifica que há um renderer.
- **Código morto em teste:** `tests/helpers/models.ts:42` `stockPoly` sem uso; parâmetro `d4` de `topValue` (`roll.spec:5,13`) nunca usado, e por isso o d4 nunca é rolado em E2E.
- **Duplicação:**
  - Helpers repetidos em vários specs: `ready`/`settled`/`throwWithSpace` e "face que olha a câmera" em `chat:48-63`, `import:10-24`, `roll:3-19`, `smoke:47-48`, `kraken:49-56`; `advance`/`launch` em `kraken.spec:6-41` e `table-kraken:9-25`. Candidatos a `e2e/helpers.ts`.
  - Cobertura repetida unidade+E2E: opostos do d6 (`polyhedra:28` e `smoke:50`), "6."/"9." e rótulos do d100 (`polyhedra:41,47` e `smoke:67-71`). Moeda face=resultado em `roll:177`, `coin` e `coin-performance`. "d10 0 vale 10" em `read:31` e `custom:49`.
- **Testam implementação, não comportamento:**
  - Guardas de funcionalidade removida: `omen.test:37` (`OMEN_MS` sem `blood`), `omen.spec:37` (`.omen-blood, .omen-heaven` ausentes).
  - Identidade de objeto: `polyhedra:70-71,88`, `symbols:16`, `store:51`.
  - Lista exata `KINDS` (`polyhedra:92`); enum Rapier (`roll:119`, `smoke:101`).
  - Contagem de `getContext` (`failure:21-27`); protocolo do worker (`coin-performance:17`).
  - Busca de semente com `setState` no store (`kraken.spec:22-33`); `useTable.edit/apply` (`table-kraken`).
  - Assume a ordem dos triângulos do helper (`importer:116`).
  - `table().programs` mede shaders compilados; é intencional (invariante de desempenho), mas é detalhe interno.
- **Lentos:**
  - E2E: `import.spec:125` (48 k triângulos ×10), `kraken.spec` (5 casos até 180 s), `table-kraken` (180 s), `screens` (10 casos × 3 orientações com screenshot), `table:249` (espera fixa de 1500 ms + polls de 20 s), `coin-performance:5` (3 s de aquecimento + 4 rodadas).
  - Unidade: rápida (4,5 s no total). Os 180 s de `physics.test:9` são só folga.
- **Riscos de processo:**
  - A suíte da API depende de `src/dice/kinds.ts` e `omen.ts` e não está em nenhum comando do gate.
  - `docs/contexto/testes.md:6` não lista `inkGlow` entre os módulos cobertos, e `:8-11` não cita `noisePng`/`tableGlb` (pequena deriva de documentação).
- **Inferências não conferidas:**
  - Isolamento por arquivo do Vitest (padrão) segura os vazamentos do registro de dados importados.
  - Em `kraken.spec`, o `setState({launch})` chega antes do pedido ao worker porque o relógio está pausado.
  - O Playwright cria `screens/` sozinho em `page.screenshot`.
  - Não há live region para o resultado.
