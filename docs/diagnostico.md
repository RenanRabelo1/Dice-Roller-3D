# Diagnóstico (fase 1)

Feito em 2026-11-12 e 13, na branch `refac/first-complete` (base `origin/main` `0d8f046`), sem alterar código. Quatro agentes fizeram o inventário: núcleo, cena, UI com servidor, e testes. O orquestrador gerou o grafo de imports com um script e rodou o gate. Os inventários brutos, com arquivo e linha de cada afirmação, estão em [`diagnostico/`](diagnostico/), e as specs da entrega 2 saem deles.

Convenção: **[verificado]** foi conferido no código ou na execução; **[inferência]** é dedução não conferida.

## 1. O que a aplicação faz e para quem

É um rolador de dados 3D para jogadores de RPG de mesa, no navegador e em pt-BR. O jogador:

1. escolhe os dados por botões ou digitando a notação no chat (`2d10 + d100`, `boladefogo`, `2 moedas`);
2. mira com o mouse ou as setas, segura para carregar a força e solta;
3. vê os dados rolarem numa bandeja.

O resultado vem de física real. Ao soltar, o arremesso inteiro é simulado em segundo plano e a tela reproduz essa gravação; depois os dados voam até a câmera mostrando a face sorteada. Críticos e falhas de d20 e d100 disparam animações ("presságios": raio, kraken, fogo, tempestade, dualidade) antes do resultado aparecer.

Há dados temáticos: d10 de Vampiro e de Fome, d6 de fogo e moeda. O jogador também pode:

- importar o próprio dado de um arquivo `.stl`/`.glb`, padrão (d4 a d20) ou de forma livre, calibrando os números;
- personalizar a mesa e o fundo (cores, texturas, foto, fundo 360°) e exportar ou importar a mesa como `.glb`.

Tudo funciona sem rede e fica salvo no navegador. Se o build tiver o endereço da API, cada arremesso também é gravado num histórico (MongoDB), com um jogador anônimo. Nenhuma tela lê esse histórico ainda. **[verificado]**

## 2. Stack e layout reais, e onde diferem do guia

| | Guia | Este projeto **[verificado]** |
|---|---|---|
| Frontend | React + TS em `frontend/src/features/<m>` | React 19 + three 0.187 / R3F 9 / drei 10 / Rapier 0.19.2 (fixo) / troika 0.52.5 (fixo) / zustand 5, Vite 8, TypeScript **7.0.2**, oxlint. Pacote da raiz, código em `src/` por camada técnica (`dice/`, `throw/`, `physics/`, `scene/`, `ui/`, `api/`) |
| Backend | Node + TS em `backend/src/modules/<m>` | Fastify 5 + driver `mongodb` 7, **pacote separado** em `server/`, TS rodando direto no Node 22.18+ (sem build). Uma coleção (`rolls`), três rotas (`GET /health`, `POST /rolls`, `GET /rolls`) |
| Onde está a regra | `service.ts` do backend | **no cliente**. O servidor recalcula total e presságio importando `src/dice/kinds.ts` e `omen.ts` do cliente |
| Contrato HTTP | `contracts.ts` com tipos importados pelo frontend | nenhum tipo compartilhado. O corpo do POST é declarado 3 vezes no servidor (tipo, esquema da rota, `$jsonSchema`) e inferido no cliente, com divergências (§7) |
| Dados | tabelas | 2 stores zustand, 3 registros mutáveis de módulo, 2 stores IndexedDB, 2 chaves `localStorage`, 1 coleção MongoDB, refs compartilhadas (§4) |
| `shared/` | auth, db, logging, eventos | sem login, sem barramento, sem pasta `shared`. O IndexedDB tem um arquivo comum (`src/indexedDb.ts`) |
| Testes | dentro de cada módulo | Vitest só em `tests/` na raiz (21 arquivos); Playwright em `e2e/` (13 specs); API em `server/test/` |
| Arquitetura | `dependency-cruiser` | não há teste de arquitetura. O TS 7 não expõe a API JS do compilador que o `dependency-cruiser` usa (ADR 0006) |

Cada diferença que pede decisão tem ADR (0001 a 0008); o resumo ponto a ponto está no ADR 0007.

**Já resolvido como o guia espera, sem precisar de ADR:**

- TypeScript nas duas pontas;
- testes de API que rodam sem subir o sistema (Fastify `inject` + MongoDB em memória);
- acesso ao MongoDB isolado num arquivo (`server/src/rolls.ts`);
- rotas sem regra de negócio relevante (a regra está em `server/src/rules.ts`);
- índice e validador da coleção.

## 3. Funcionalidades

| Funcionalidade | Onde está hoje |
|---|---|
| Seleção por botões (até 10 dados, sempre ordenada) e chat com notação | `ui/Controls.tsx`, `ui/Chat.tsx`, `dice/notation.ts`, `store.ts` |
| Mira, carga (onda 0→1→0 em 1,4 s), redemoinho na mão, soltura, fases do gesto | `scene/Hand.tsx`, `throw/{aim,gesture,vortex}.ts`, `store.ts` |
| Pré-simulação física (worker, timeout 2 s, cálculo local de reserva), parada, replay, publicação | `physics/*`, `throw/settle.ts`, `scene/Stage.tsx` (`ThrowLoop`) |
| Geometria, numeração e leitura de cada dado (d4…d20, d100 de 100 faces, moeda, temáticos) | `dice/{kinds,polyhedra,read,symbols}.ts`, `scene/Die.tsx` |
| Presságios (regra + show 3D + overlay HTML) | `dice/omen.ts`, `scene/{Omens,Kraken,krakenMotion,Fire,fireMotion}.ts(x)`, `ui/OmenOverlay.tsx`, CSS |
| Voo até a câmera, número em destaque, gravação acesa, painel do resultado | `scene/{showcase,highlight,inkGlow}.ts`, parte `settled` de `scene/Hand.tsx`, `ui/Controls.tsx` |
| Importar dado (detecção, sólido ideal, calibração, forma livre e shards, tinta, acabamento), "Meus dados" | `dice/{importer,custom,customStore}.ts`, `ui/{ImportDie,InkChoice}.tsx`, `ui/Controls.tsx`, `store.ts` |
| Mesa e fundo (temas, foto, 360°, mesas salvas, `.glb`) | `scene/table*.ts`, `scene/{Tray,Backdrop}.tsx`, `ui/TablePanel.tsx` |
| Histórico | `api/history.ts`, `App.tsx:26`, `server/` |
| Falhas (sem WebGL, renderizador, física) e movimento reduzido | `failure.ts`, `ui/Safeguard.tsx`, `App.tsx` |

## 4. Onde o dado mora

| Dado | Onde | Escrito por | Lido por |
|---|---|---|---|
| store `useDice` (18 campos) | `src/store.ts` | ver §6 | 13 arquivos (casca, cena, UI) |
| store `useTable` (`theme`, `tables`, `sessionOnly`, `colors`) | `src/scene/tableState.ts` | `tableState`, `Tray.tsx:37` (`colors`) | `App`, `Backdrop`, `Stage`, `Tray`, `Omens`, `TablePanel` |
| registro de dados importados (`Map` de `CustomDie` e de `Polyhedron`) | `src/dice/custom.ts:43-44` | `registerCustom`, `registerPoly` (worker e testes), `unregisterCustom` | `polyhedra.ts`, `notation.ts` (parâmetro padrão), `store.ts`, `api/history.ts:23`, `Die.tsx:23`, `Hand.tsx:210,236`, `Controls.tsx:46` |
| `omenD20s` (`Set` global) | `src/dice/kinds.ts:21` | `custom.ts:56,60` | `omen.ts:15`; vazio no servidor e no worker |
| ref `bodies` (registro de corpos) | `Stage.tsx:134` | `Die` via `register` | `ThrowLoop`, `Hand`, `Omens`, test hook |
| IndexedDB `dice-roller` v2, store `customDice` | `indexedDb.ts`, `dice/customStore.ts` | `store.ts` (`addCustom`, `updateCustom`, `removeCustom`) | `store.ts` (`loadCustoms`) |
| IndexedDB store `tables` | `scene/tableStore.ts` | `tableState` | `tableState` |
| `localStorage['mesa.ativa']` | `scene/tableStore.ts:9-11` | `tableState` | `tableState` |
| `localStorage['diceroller.player']` | `api/history.ts:7` | `playerId()` | `playerId()` |
| caches de módulo | `polyhedra.ts:227`, `symbols.ts:84`, `importer.ts:463` (modelos, sem descarte: `forgetModel` não tem chamador), `tableImages.ts:66` (panoramas), `tableTextures.ts:6`, `inkGlow.ts:28` (nunca limpo), `tableBuild.ts:15` (textura única) | o próprio arquivo | o próprio arquivo e a cena |
| flags de módulo | `failure.ts:10` (`probed`), `tableImages.ts:53` (`softwareGl`, escrito pela `Stage`), `history.ts:8` (`SESSION`), `tableState.ts:22-23` (debounce + listener `pagehide` registrado no import) | | |
| coleção MongoDB `rolls` (índice `player_history`, `$jsonSchema`, `collMod` na subida) | `server/src/rolls.ts` | `POST /rolls` | `GET /rolls` |

## 5. Quem chama quem

Grafo gerado por script sobre 96 arquivos (55 de produção, 269 arestas internas, contando `import type`, `import()` dinâmico e o `new URL` do worker). **[verificado]**

- **Ciclos entre pastas:**
  - `dice ↔ physics ↔ throw` (contando imports de tipo);
  - `physics ↔ throw` (só valor);
  - `scene ↔ ui`.
- **Ciclo entre arquivos:** `dice/custom.ts ↔ dice/polyhedra.ts`.
- **Mais importados:**
  - `physics/world.ts`: 22 de produção e 12 de teste;
  - `dice/polyhedra.ts`: 20 e 13;
  - `dice/custom.ts`: 14 e 5;
  - `store.ts`: 13 e 2.
- **O servidor importa o cliente:**
  - `server/src/app.ts:3`, `rolls.ts:2-3` e `rules.ts:1-2` → `src/dice/kinds.ts` e `omen.ts`;
  - por isso esses dois arquivos usam imports com `.ts`, sem `three` e sem DOM.
- **Arquivos de responsabilidade mista**, com a divisão por faixa de linhas nos anexos:
  - `scene/Stage.tsx` (336 linhas): replay do arremesso, panorama da mesa, DPR, câmera, test hook;
  - `scene/Hand.tsx` (363): input, mão, retorno, showcase, caminho do d100 no kraken, tudo num único `useFrame`;
  - `dice/importer.ts` (495): 10 faixas, uma delas usada pela mesa;
  - `dice/polyhedra.ts` (256);
  - `physics/world.ts` (75): mistura matemática, bandeja, parâmetros do arremesso, motor e raio do dado;
  - `ui/Controls.tsx`: seleção, "Meus dados", força, dica por fase, painel do resultado;
  - `store.ts`.

## 6. O que colide com as regras 2 e 4

### 6.1 Dados lidos ou escritos por mais de um domínio (regra 2)

| Dado | Escritores de domínios diferentes **[verificado]** |
|---|---|
| `gesture`, `throwId`, `launch`, `force`, `results` | seleção (`selection()`, `store.ts:51-57`), arremesso (`input`, `:123-139`), resultado (`publish`, `:140-146`) |
| `dice` | seleção (`addDie`/`removeDie`/`setDice`) e dados importados (`removeCustom`, `:110-113`) |
| `omen` | arremesso/resultado (`publish` calcula `omenOf`, `:144`) e preferência (`setReducedMotion`, `:119`) |
| `error` | casca (`App.tsx:17`), error boundary (`Safeguard.tsx:13`), arremesso (`Stage.tsx:46,77`) |
| `useTable.colors` | mesa (`tableState`) e cena (`Tray.tsx:37`, a partir do objeto 3D) |
| registro de importados | lido por fora do store em `Controls.tsx:46`, `api/history.ts:23`, `notation.ts`, `Hand.tsx`, `Die.tsx`: o registro e `store.customs` são duas fontes do mesmo dado |
| `omenD20s` | estado de "dados importados" morando no catálogo compartilhado com o servidor e lido pela regra de presságio |
| `bodies` | escrito pelo dado visual, lido pelo arremesso, pelo showcase, pelo presságio e pelo teste. A pose é escrita pela `Hand` em quatro fases e pelo `ThrowLoop` em `rolling`, sem dono declarado |
| `showcased`, `omenAt`, `reducedMotion` | lidos por quatro a cinco domínios (DPR e panorama na `Stage`, piso na `Tray`, showcase, presságio) |
| nomes de objeto de cena | `die-i`, `gem-i`, `tray-surface`, `mesa`, `result-highlights`, `ink-glow-i`, `fire`, `kraken-fragments` e `userData.labels/selection/ink` são procurados por outros arquivos e pelo test hook |
| `softwareGl` | estado da mesa (`tableImages.ts:53`) escrito pela casca (`Stage.tsx:112`) |

Ações que escrevem em vários domínios num único `set`: `selection()` (usada por `addDie`, `removeDie` e `setDice`), `removeCustom`, `input`, `publish` e `setReducedMotion`.

### 6.2 "Joins" entre domínios

Não há join de banco: a coleção é uma só, e o servidor não faz `$lookup`. No cliente, o equivalente são leituras que cruzam vários domínios de uma vez:

- `omenPlaying` (`store.ts:61`) combina gesto, presságio e `throwId`;
- o predicado "entre animações" (`Stage.tsx:128` e `:148`) combina gesto, `showcased` e `throwId`;
- `trayBrokenAt` (`krakenMotion.ts:26`) combina gesto, presságio, `omenAt`, `dice` e `reducedMotion`;
- o test hook lê os dois stores e a cena inteira.

### 6.3 Ciclos (regra 4)

Os ciclos do §5, mais estes:

- **mesa ↔ presságio:** `Tray.tsx:7` importa `trayBrokenAt`, e `Omens.tsx:203` lê `useTable.colors`;
- **latente, showcase ↔ presságio:** aparece ao partir `Hand.tsx`, porque `krakenMotion` usa `Pose`/`easeOut` de `showcase`/`highlight`, e a `Hand` usa o caminho do d100;
- **reação em cadeia via store:** a casca assina o store para o histórico (`App.tsx:26`), e a seleção reinicia o arremesso escrevendo nos campos dele.

Como cada ciclo some está em [mapa-modulos.md](mapa-modulos.md).

## 7. Regra de negócio fora do lugar e duplicações

- **Em componentes**
  - `Stage.tsx:30-98`: orquestração do worker, timeout e publicação.
  - `Hand.tsx:87-131, 335-340`: mapeamento de input, ômega da mão, passo das setas, força por quadro.
  - `ImportDie.tsx:254-274`: montagem do `CustomDie`; não existe fábrica pura. Inclui "presságio só em base d20", "com textura só tinta escura" e "entra na seleção se couber".
  - `TablePanel.tsx:69-83`: conversão de mesa importada em tema; não existe função pura.
  - `OmenOverlay.tsx:25-27`: recalcula que efeito cada presságio tem.
  - `App.tsx:26`: quando gravar no histórico.
- **Duplicadas**
  - Total sem moedas: `notation.ts:43` e `server/src/rules.ts:27`.
  - "Importado conta como d20": `custom.ts:56`, `rules.ts:18,26` e `ImportDie.tsx:270`.
  - Limite de 10 dados: `MAX_DICE` e o literal 10 em `server/src/app.ts:25` e `rolls.ts:21`.
  - Qual dado recebe qual show: `omen.ts:26-31`, `krakenMotion.ts:20,82`, `fireMotion.ts:12`, `OmenOverlay.tsx`, `Omens.tsx:200`.
  - Durações: `OMEN_MS` = `KRAKEN.duration`/`STORM.duration` = tempos em `index.css:103-113`.
  - Tinta com textura: 3 lugares.
  - Limite de 10 MB: `ImportDie.tsx:170` e `importer.ts:75`.
  - `easeOut`: duas curvas diferentes com o mesmo nome.
  - `live()`: dois critérios diferentes (`Stage.tsx:65`, `Hand.tsx:75`).
  - Medidas da bandeja como literais fora de `TRAY`.
- **Contrato HTTP divergente**
  - `force`: obrigatório no cliente, opcional no servidor.
  - `playerId`: UUID na rota, qualquer string de 1 a 64 caracteres no MongoDB.
  - Forma do dado declarada três vezes.
  - O cliente ignora toda resposta, inclusive 4xx/5xx.

## 8. Testes existentes e se passam hoje

**[verificado, rodado em 2026-11-12 nesta worktree]**

| Suíte | Comando | Resultado |
|---|---|---|
| build | `npm run build` | passa (com o aviso, já conhecido, de chunk > 500 kB) |
| lint | `npm run lint` | passa, sem avisos |
| unitários | `npm test` | **21 arquivos, 324 testes, todos passando** (4,5 s) |
| E2E | `npm run e2e` | **80 testes, todos passando** (15,2 min, Chrome + SwiftShader). A rodada dividiu a máquina com os agentes de inventário, e mesmo assim os orçamentos de desempenho passaram |
| API | `cd server && npm install --no-package-lock && npm test` | **23 testes passando** (MongoDB em memória); `npm run typecheck` do servidor passa |

São 80 casos E2E e 23 de API. Não há `.skip`, `.only` nem `.fixme`. A matriz de cobertura por funcionalidade está no anexo [`diagnostico/testes.md`](diagnostico/testes.md). O que importa para a refatoração:

- **Testes que só usam a UI, o HTTP e o `window.__dice`** sobrevivem a qualquer mudança de pasta, desde que textos, roles, `data-testid`, classes CSS e o hook continuem iguais: `chat`, `coin`, `coin-software`, `failure`, `roll`, `smoke` e `table`.
- **Imports por texto, que nem o `tsc` nem o grafo enxergam:**
  - `e2e/kraken.spec.ts:33` importa `/src/store.ts` e `/src/physics/presim.ts` pelo servidor do Vite;
  - `e2e/coin-performance.spec.ts` importa `/src/store.ts` e depende do nome `presim.worker` e do formato da mensagem do worker;
  - `e2e/table-kraken.spec.ts:5` importa `/src/scene/tableState.ts`.
  Mover esses arquivos quebra esses specs só na hora em que rodam.
- **A suíte da API não está no gate do projeto** (`build → lint → test → e2e`) e depende de `src/dice/kinds.ts` e `omen.ts`. Mover esses arquivos quebra o servidor sem que o gate acuse.
- **O `window.__dice` é montado em `Stage.tsx:196-295`** a partir de nomes de objeto de cena e de `userData`. Todo E2E depende dele.
- **Lacunas de comportamento:**
  - Arremesso e falhas:
    - timeout do worker e falha dupla (worker e cálculo local);
    - d4, d8, d6 de fogo e importados d4/d10/d12 nunca rolados em E2E.
  - Histórico:
    - envio do histórico pelo cliente sem E2E; o modo de teste não define `VITE_API_URL`.
  - Persistência:
    - `customStore`/`tableStore` sem teste de unidade;
    - modo sem IndexedDB;
    - `pagehide`.
  - Mesa e presságios:
    - fundo 360° com `.hdr` e "só entre animações";
    - raio e dualidade conferidos só pelo overlay HTML.
  - Interface:
    - teclas M e Esc;
    - botões desabilitados com 10 dados e com 1 dado.
- **Desempenho:** quatro specs têm orçamento calibrado na máquina do autor (`docs/performance-coins.md`).

## 9. Trabalho em paralelo **[verificado]**

| Branch | Situação |
|---|---|
| `feat/modo-de-rolagem` (pasta principal, ativa) | 2 commits fora de `origin/main`: "modo de rolagem relativo ou estático" e "botões de teste de presságio". Parte de `ffd4046` (`main` local, 93 commits atrás de `origin/main`). Toca 23 arquivos, entre eles `store.ts`, `Stage.tsx`, `Hand.tsx`, `presim.ts`, `presim.worker.ts`, `aim.ts`, `gesture.ts`, `Controls.tsx`, `testHook.ts`, e cria `dice/omenTest.ts` e `ui/OmenTests.tsx`. Um merge de teste com `origin/main` (`git merge-tree`, sem tocar em nada) dá **conflito em 4 arquivos**: `docs/contexto/armadilhas.md`, `docs/contexto/testes.md`, `src/testHook.ts` e `src/ui/Controls.tsx`. Os outros 8 que os dois lados tocaram se fundem sozinhos |
| `feat/dice-3d` | 11 commits locais fora de `origin/main`, mas `git cherry` mostra os 11 já presentes em `origin/main` com outro hash. **Não precisa entrar** |
| `main` local | 93 commits atrás de `origin/main`, sem commits próprios |
| `feat/dados-especiais-e-moedas`, `feat/presagios-kraken-fogo`, `feat/vendaval-e-backend`, `origin/dev-jg` | 0 commits fora de `origin/main`: já incorporadas |

Como esse trabalho entra na base refatorada fica para o plano (entrega 2). A recomendação está no resumo da entrega 1.

## 10. Achados (fora do escopo da refatoração, registrados para decisão)

1. **A falha da física em jogo derruba o 3D. [verificado]**
   - Se o worker e o cálculo local falham, `Stage.tsx:43-46` tenta voltar os dados à mão e põe `error = 'physics'`.
   - Com `error` não nulo, `App.tsx:34` desmonta o `<Canvas>`, e a mensagem diz "Recarregue a página" (`failure.ts:7`).
   - Ao mesmo tempo, o rodapé diz "os dados voltaram para a mão. Tente jogar de novo" (`Controls.tsx:79`).
   - `docs/contexto/arremesso.md` e `armadilhas.md` descrevem a volta à mão. Não há E2E desse caminho.
2. **O worker não volta depois de uma falha.** Após o primeiro fallback, todo arremesso roda na thread principal até recarregar (`Stage.tsx:39`). **[verificado]**
3. **Sem worker, o caminho síncrono não tem `try/catch`** (`Stage.tsx:79`), ao contrário do fallback. **[verificado]**
4. **`crypto.randomUUID` roda no carregamento de `api/history.ts:8`.** Fora de contexto seguro (o app servido por HTTP num IP de rede local), isso derrubaria o app inteiro. **[inferência]**
5. **`remove` da mesa cancela a gravação pendente de qualquer mesa**, não só da removida (`tableState.ts:62`). **[verificado]**
6. **`checkTheme` não tem chamador em produção**: tema lido do IndexedDB ou importado não é validado. **[verificado]**
7. **Código sem uso.** **[verificado]**
   - `forgetModel`: excluir um dado não libera o modelo em cache.
   - Só usados em testes: `clampHandX`, `SYMBOLS`, `handPositions` (fora o enquadramento da câmera).
   - Comentário órfão em `tableBuild.ts:106`.
8. **`ready` nunca volta a `false`** e é ligado pelo efeito que instala o test hook (`Stage.tsx:296`). **[verificado]**
9. **Um Esc fecha todas as gavetas abertas**, porque os três listeners globais não param a propagação. **[inferência]**

A refatoração preserva o comportamento atual, inclusive estes defeitos. A correção de cada um é uma decisão à parte (ver as dúvidas no resumo da entrega).

## 11. Documentação existente

- `docs/contexto/*.md` (7 módulos de contexto por tema) está correta no geral e foi insumo deste diagnóstico. Divergências encontradas:
  - o item 1 do §10;
  - `handPositions` descrito como a mão (hoje a mão é o redemoinho).
  O destino dela é proposto no plano.
- `docs/superpowers/` e `.superpowers/sdd/` são histórico e divergem do código, como o `CLAUDE.md` já avisa. Não foram usados.
