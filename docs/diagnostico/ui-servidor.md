# Inventário fase 1: UI (src/ui, App, CSS, api, failure) e servidor (server/)

Fonte: leitura integral dos arquivos do escopo + trechos de `src/store.ts`, `src/scene/tableState.ts`, `src/scene/Die.tsx`, `src/scene/table*.ts`, `src/dice/{kinds,omen,custom,notation,importer}.ts`, `e2e/*.spec.ts` (só seletores). "Quem importa quem" vem de `grafo-pastas.md`. O que não conferi está marcado **(inferência)**.

---

## 1. Tabela por arquivo

| Arquivo | Linhas | Papel | Exports | Domínio |
|---|---|---|---|---|
| src/ui/Controls.tsx | 85 | Cabeçalho (botões de dado, "Meus dados", pool, Chat, Mesa, abre ImportDie lazy) e rodapé (resultado, barra de força, texto de ajuda por fase). Contém `InkButton` (tinta de dado importado) e `Force` | `Controls` | **misto**: seleção e notação + dados importados (InkButton, excluir, abrir import) + arremesso (fase/força) + resultado/presságio (espera `omenPlaying`) |
| src/ui/Chat.tsx | 65 | Gaveta "Chat de dados": parse da notação e `setDice`; log local de 20 linhas; atalho C | `Chat` | seleção e notação |
| src/ui/ImportDie.tsx | 393 | Assistente de importação (arquivo → forma → números → salvar) com prévia R3F própria (`Canvas`, `Marker`, `Rig`, `Preview`) | `ImportDie` | dados importados (com renderização 3D embutida) |
| src/ui/InkChoice.tsx | 35 | Rádios de tinta/acabamento, compartilhado por ImportDie e InkButton | `InkChoice` | dados importados |
| src/ui/OmenOverlay.tsx | 55 | Camada HTML do presságio (flash, deep, heat, sea/rain/thunder), escreve `data-omen/kraken/storm` em `.game-area`, anúncio sr-only | `OmenOverlay` | apresentação/presságio |
| src/ui/Safeguard.tsx | 22 | Error boundary `Guard` (grava `store.error`) e `Failure` (mensagem) | `Guard`, `Failure` | falhas/infra |
| src/ui/TablePanel.tsx | 198 | Gaveta "Personalizar mesa": fundo, feltro/madeira, exportar/importar `.glb`, mesas salvas; atalho M | `TablePanel` | mesa e fundo |
| src/index.css | 171 | Estilos globais e de todas as partes (layout, gavetas, presságios, import, mesa, falha) | — | **misto** |
| src/api/history.ts | 36 | Cliente da API de histórico: `playerId` anônimo (localStorage), corpo do POST, `fetch` fire-and-forget | `playerId`, `rollBody`, `saveRoll` | histórico |
| src/failure.ts | 22 | Textos de falha e sonda WebGL (cache em variável de módulo) | `FAILURE`, `hasWebGL` | falhas/infra |
| src/App.tsx | 49 | Casca: compõe Controls/Canvas/Stage/Backdrop/Failure/OmenOverlay; boot (WebGL, loadCustoms, useTable.load, warmImageDecoder, reduced motion); **liga o histórico** (subscribe → saveRoll) | `default App` | **misto** (composição + infra + histórico + mesa + dados importados) |
| server/src/app.ts | 59 | Fastify: CORS, `GET /health`, `POST /rolls`, `GET /rolls` com JSON Schema | `buildApp` | histórico (rota) |
| server/src/main.ts | 23 | Bootstrap: env, MongoClient, `buildApp`, sinais, `listen` | — | histórico (infra) |
| server/src/rolls.ts | 71 | Acesso a dados: tipos `RollDoc`/`Roll`, `$jsonSchema`, criação/`collMod`, índice, `add`/`page` | `RollDoc`, `Roll`, `rollsCollection`, `rollStore`, `RollStore` | histórico (dados) |
| server/src/rules.ts | 28 | Regra: faixa de face por forma, `clean`, `score` (total + presságio) | `CUSTOM`, `Die`, `score` | histórico (regra) — reusa regra de dados |
| server/test/api.test.ts | 117 | Testes de integração com MongoDB em memória | — | histórico (teste) |
| server/README.md | 77 | Setup Atlas, modelagem, endpoints | — | histórico (doc) |
| server/package.json | 24 | Pacote separado (`type: module`, Node ≥22.18, scripts com `--env-file-if-exists`) | — | histórico |
| server/tsconfig.json | 18 | `nodenext`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noEmit` | — | histórico |
| server/vitest.config.ts | 4 | `test/**/*.test.ts`, node, hookTimeout 300 s | — | histórico |
| server/.env.example | 8 | `MONGODB_URI`, `MONGODB_DB`, `PORT`, `HOST`, `CORS_ORIGIN` | — | histórico |

---

## 2. Telas e interações do jogador

### 2.1 Cabeçalho (`header.controls.panel`, Controls.tsx:58-71)
| Elemento | O que faz | Onde |
|---|---|---|
| `h1` "Rolador de dados" | título | Controls.tsx:59 |
| Grupo `role=group aria-label="Dados"` | um `.pick` por `KINDS` | Controls.tsx:60-62 |
| Botão `aria-label="Adicionar {dieName}"`, `aria-pressed={n>0}`, texto = notação da quantidade ou nome; desabilitado com `dice.length >= MAX_DICE` | `addDie(type)` | Controls.tsx:42-43 |
| Botão `.remove` `aria-label="Remover {nome}"` "−", desabilitado se só há 1 dado | `removeDie(type)` | Controls.tsx:44-45 |
| Grupo `aria-label="Meus dados"` | um `.pick` por dado importado + botão "Importar dado" (`aria-expanded`, `aria-controls="import-die"`), que monta o ImportDie lazy na primeira vez (`mounted`) e alterna `importing` | Controls.tsx:63-66 |
| `<details class="ink-pop">` com `summary aria-label="Tinta de {nome}"` texto "Tinta" (só dado importado `printed`) | ao abrir um GLB carrega o modelo para saber se tem textura; `InkChoice` → `updateCustom({...die, ink/finish})` | Controls.tsx:15-27, 46 |
| Botão `aria-label="Excluir {nome}"` 🗑 | `confirm(...)` → `removeCustom` | Controls.tsx:47-48 |
| `p.pool aria-live=polite` | `formatDice(dice)` | Controls.tsx:67 |
| `<Chat/>`, `<TablePanel/>`, `<ImportDie/>` | gavetas (abaixo) | Controls.tsx:68-70 |

### 2.2 Rodapé (`footer.status.panel`, Controls.tsx:72-82)
- `output data-testid="result" aria-live=polite`: `<strong>{total}</strong><span>{detail}</span>` de `resultText(dice, results)`, só quando `results && !omenPlaying` (Controls.tsx:53-55, 74-76).
- `progress aria-label="Força"` (role progressbar) só na fase `charging` (Controls.tsx:29-32, 77).
- Texto de ajuda por fase / erro de física (Controls.tsx:79-81): `hand` (mira, Espaço), `settled` ("Clique na mesa para pegar os dados de novo."), `charging`, `rolling`, outro = `returning`; `error==='physics'` tem texto próprio.

### 2.3 Chat (Chat.tsx)
- Botão `.chat-toggle` "Chat <kbd>C</kbd>" (`aria-expanded`, `aria-controls="dice-chat"`, `aria-keyshortcuts="C"`) — Chat.tsx:46-47.
- `aside#dice-chat.chat.panel` `data-open`, `inert={!open}`, `aria-label="Chat de dados"` (role complementary) — :48.
- Fechar `aria-label="Fechar chat"` ×, devolve foco ao toggle — :51.
- `ol.chat-log aria-live`: dica inicial; linhas `.msg-you`/`.msg-app`, erro com `data-error` — :53-56.
- Form: input `aria-label="Dados, por exemplo 2d10 + d100"` (role textbox), botão "Aplicar" (submit/Enter) — :57-61.
- Atalhos: **C** alterna (ignora quando o foco está em input/textarea/select/contentEditable e com Ctrl/Meta/Alt/repeat) — :22-24; **Esc** fecha se aberto — :23. Foco no input ao abrir — :30.

### 2.4 Importar dado (ImportDie.tsx)
- `aside#import-die.chat.panel.import` `data-open`, `inert`, `aria-label="Importar dado"` — :286. Fechar `aria-label="Fechar importação"` (chama `close` = onClose + reset) — :289. **Esc** chama só `onClose` (sem reset) — :153.
- Nota `role=status` de sessão sem armazenamento — :292.
- **Passo `file`** (:293-304): `label.import-drop` com drag&drop; `input type=file accept=".stl,.glb" data-testid="import-file"`; se não-padrão, `div data-testid="import-not-standard"` com botão "Importar como dado de forma livre". "Lendo o modelo…" `role=status` (:386).
- **Prévia** `div.import-preview aria-label="Prévia do dado"` com `data-ink`/`data-finish` só no passo save (:305-322); OrbitControls (arrastar gira).
- **Passo `shape`** (:323-344): `p data-testid="import-shape"` ("Reconheci um d20…" ou "Dado de forma livre: encontrei N faces de apoio…"); nota de faces ignoradas; pergunta de camadas `data-testid="import-tier"` com "Sim, só as grandes" / "Não, todas"; `data-testid="import-uneven"`; "A física usa o contorno externo do modelo."; checkbox "Conta como d20 nos críticos" (só base d20); "Cor da gema" (só STL); botão "Continuar" (desabilitado enquanto a pergunta de camadas está aberta).
- **Passo `numbers`** (:345-374): pergunta "Esse modelo já vem com números gravados nas faces?" + `data-testid="import-hint"`; "Sim, calibrar" / "Não, numerar para mim". Calibração: `p data-testid="import-progress"` "k de N"; input `name=value` com label "Que número está nesta face?" / "Que número você lê com ele apoiado assim?" / "Que número você lê no vértice voltado para você?"; `data-testid="import-suggestion"`; botões "Voltar à face", "↻ Girar" (`aria-label="Girar o numeral"`), "Voltar", submit "Confirmar face"/"Concluir".
- **Passo `save`** (:375-385): "Nome" (maxLength 24), "Apelido no chat" (auto do nome até ser editado), `InkChoice`, "Salvar".
- Erro `p.import-error role=alert` (:387); rodapé "N dado(s) guardado(s) neste navegador." (:389).

### 2.5 InkChoice (InkChoice.tsx)
Fieldsets "Tinta dos números" (Automática/Dourada/Escura/Branca/Sem tinta; com textura só Escura/Sem tinta) e "Acabamento" (Gema/Fosco, só STL) — :4-5, 13, 17-32. Rótulos são alvo de `getByLabel` no e2e.

### 2.6 Personalizar mesa (TablePanel.tsx)
- Toggle `.chat-toggle` "Mesa <kbd>M</kbd>" (`aria-controls="table-panel"`, `aria-keyshortcuts="M"`) — :92-93. `aside#table-panel.chat.panel.import.table-panel` `aria-label="Personalizar mesa"` — :94. Fechar `aria-label="Fechar painel da mesa"` — :97. Atalhos **M** e **Esc** — :24-28.
- **Fundo** (:101-132): grupo `aria-label="Tipo de fundo"` botões "Cor" / "Foto" / "360°" / "Tema" (`aria-pressed`); inputs ocultos `data-testid="table-panorama"` e `data-testid="table-photo"`; "Cor do fundo"; grupo `aria-label="Temas de fundo"` (Taverna/Pôquer/Cosmos); Foto: sliders "Desfoque", "Escurecer"; 360°: "Girar", "Brilho", "Desfoque", checkbox "Refletir nos dados", dica 2:1.
- **Mesa** (:133-154, fieldset desabilitado com mesa importada): "Feltro", "Madeira", select "Textura do feltro" (Liso/Veludo/Couro/Minha imagem… → abre `data-testid="table-felt-image"`), "Tamanho da textura".
- **Arquivo** (:155-167): "Nome da mesa" (maxLength 40, desabilitado na padrão), "Exportar mesa", "Importar mesa" (→ `data-testid="table-import"`), "Duplicar mesa", "Restaurar mesa padrão".
- Status `role=status` (busy/note), erro `role=alert`, avisos `role=alertdialog aria-label="Avisos da mesa" data-testid="table-warnings"` com "Aplicar mesmo assim"/"Cancelar" (:168-180).
- **Mesas salvas** (:181-193): botão por mesa (`aria-pressed` ativa) → `apply(t)`; 🗑 `aria-label="Excluir {nome}"` → `confirm` → `remove`.

### 2.7 Área de jogo e camadas (App.tsx, OmenOverlay, Safeguard)
- `div.game-area tabIndex=0 aria-label="Área de arremesso"` (App.tsx:32): mouse/toque e teclado do arremesso estão em `scene/Hand.tsx` (fora do escopo): Espaço carrega/solta, setas miram (Hand.tsx:115-124), pointer down/up/move (Hand.tsx:134-137).
- `p.failure role=alert data-testid="failure"` (Safeguard.tsx:21).
- Presságio: `div.omen` (aria-hidden) + `p.sr-only role=status` com "Crítico!" / "Falha crítica!" / "Dualidade: crítico e falha!" (OmenOverlay.tsx:19, 52).

### 2.8 Contrato com os testes (e2e, contagem de usos)
- **data-testid**: `result` (18), `table-import` (6), `import-shape` (6), `import-file` (3), `table-photo` (3), `table-panorama` (3), `table-felt-image` (2), `import-suggestion` (2), `import-hint` (2), `table-warnings`, `import-tier`, `import-progress`, `failure`. (`import-not-standard`, `import-uneven` existem no código e não aparecem no e2e.)
- **Classes/ids via `locator`**: `.game-area` (28), `.omen` (5), `canvas` (4), `.backdrop-art` (4), `.pool`, `.omen-heat`, `.backdrop-dim`, `.omen-rain i`, `.omen-flash`, `.backdrop`, `.backdrop[data-kind="preset"|"image"]`, `.import-preview`, `.chat-toggle` (hasText "Mesa"), `.chat-log [data-error]`, `#table-panel`, `#import-die`, `header.controls`, `footer`, `strong`; negativo `.omen-blood, .omen-heaven` (count 0, omen.spec.ts:37).
- **Atributos**: `data-omen` (6), `data-storm`, `data-kraken` (em `.game-area`), `data-open` (gavetas), `data-ink`, `data-finish` (`.import-preview`), `data-kind` (`.backdrop`).
- **Roles/nomes**: `alert` (9), `complementary "Chat de dados"`, `textbox /Dados/`, `progressbar "Força"`, `heading "Rolador de dados"`; botões "Continuar", "Restaurar mesa padrão", "Sim, calibrar", "Não, numerar para mim", "Exportar mesa", "Importar como dado de forma livre", "Adicionar d20 Caveira", "Adicionar Prisma", "Adicionar Moeda", "Adicionar d6" (exact), "Adicionar d6 Fogo", "Sim, só as grandes", "Tema"/"Cor" (exact), "Cosmos", "Salvar", "Remover d20", "Importar dado", "Excluir d20 Caveira", "Cancelar", "Aplicar mesmo assim", "Aplicar", `/Chat/`.
- **Labels**: "Desfoque", "Textura do feltro", "Refletir nos dados", "Girar", "Feltro" (exact), "Madeira", "Escurecer", "Brilho", "Fosco", "Branca", "Gema", "Automática", "Sem tinta", "Nome" (exact), "Nome da mesa", "Cor do fundo", "Que número está nesta face?", "Que número você lê com ele apoiado assim?", `/^Dados, por exemplo/`.
- **Textos**: "Tinta" (exact), "proporção 2:1" (vem de mensagem de erro de `tableImages`, **inferência**), "Mesa importada", "Esse modelo já vem com números gravados nas faces?", "A física usa o contorno externo do modelo.", "A cor do feltro tinge a textura".
- **Teclas**: Enter (14), Space (10), `c` (7), Escape (4), ArrowRight (1). `m` não é usado nos testes (abrem a mesa pelo clique em `.chat-toggle`).
- Consequência: `dieName` (notation.ts:12-15) é contrato de teste via `aria-label="Adicionar {nome}"`; o seletor CSS `.selection[aria-label="Meus dados"]` (index.css:132) depende do texto do aria-label.

---

## 3. Acesso a dados por componente

### useDice (store `src/store.ts`)
| Componente | Lê | Chama | Arquivo:linha |
|---|---|---|---|
| Controls | `dice`, `customs` | `addDie`, `removeDie`, `removeCustom` | Controls.tsx:35, 43, 45, 48 |
| Controls | `gesture.phase`, `results`, `omenPlaying(s)`, `error==='physics'` | — | Controls.tsx:52-54 |
| Controls/Force | `force` | — | Controls.tsx:30 |
| Controls/InkButton | — | `updateCustom` | Controls.tsx:17 |
| Chat | — | `setDice` | Chat.tsx:37 |
| ImportDie | `customs` (só `.length`), `sessionOnly`, `dice` (só `.length`) | `addCustom`, `addDie` | ImportDie.tsx:105, 276, 279 |
| OmenOverlay | `omenPlaying(s)`, `omen`, `dice` | — | OmenOverlay.tsx:22 |
| Safeguard/Guard | `getState().error` | `setError(kind)` | Safeguard.tsx:13 |
| Safeguard/Failure | `error` | — | Safeguard.tsx:19 |
| App | `error` | `setError('webgl')`, `loadCustoms`, `setReducedMotion`, `subscribe` (lê `results`, `dice`, `force`) | App.tsx:16-18, 21, 26-28 |

### useTable (store `src/scene/tableState.ts`)
| Componente | Lê | Chama | Arquivo:linha |
|---|---|---|---|
| TablePanel | `useTable()` **sem seletor** (assina o estado inteiro, inclusive `colors` que Tray reescreve): `theme`, `tables`, `sessionOnly` | `edit`, `apply`, `copy`, `remove`, `reset` | TablePanel.tsx:14 |
| App | — | `load` | App.tsx:18 |

### Registros/variáveis de módulo lidos por fora do store
- `customDie(type)` (registro `Map` em `dice/custom.ts:43`) lido direto em Controls.tsx:46 e api/history.ts:23.
- `parseDice` e `slugProblem` leem `customList()` por parâmetro default (notation.ts:20, 57) → Chat.tsx:36 e ImportDie.tsx:252 leem o registro de dados importados sem passar pelo store.
- `isD20`/`omenOf` dependem do `Set` global `omenD20s` (kinds.ts:21), escrito por `registerCustom`/`unregisterCustom` (custom.ts:56, 60) → OmenOverlay (via `isD20`) e o servidor (vazio lá).
- `failure.ts:10` `probed` (cache da sonda); `history.ts:8` `SESSION`; `tableState.ts:22-23` `timer`/`unsaved`.

### Estado local relevante
- Controls: `importing`, `mounted` (:36); InkButton `textured` (:16).
- Chat: `open`, `lines` (≤20), `text`, `nextId` (:13-18).
- ImportDie: 21 `useState` (:106-132, 210): `step`, `loaded` (bytes do arquivo em memória), `error`, `busy`, `notStandard`, `omens`, `color`, `ink`, `surface`, `printed`, `asking`, `pos`, `values`, `confirmed`, `turns`, `name`, `slug`, `slugEdited`, `bigOnly`, `look`.
- TablePanel: `open`, `busy`, `error`, `note`, `pending` (:15-19).

### Acesso direto a APIs do navegador / ambiente
| O quê | Onde |
|---|---|
| `localStorage` `diceroller.player` | api/history.ts:7, 13-14 |
| `localStorage` `mesa.ativa` (fora do escopo, mas é da mesa) | scene/tableStore.ts:9-11 |
| IndexedDB `dice-roller` v2 (`customDice`, `tables`) | só via `dice/customStore.ts` e `scene/tableStore.ts` (nenhum componente de UI toca direto) |
| `fetch` | api/history.ts:32 |
| `crypto.randomUUID` | api/history.ts:8 (no carregamento do módulo), :14; ImportDie.tsx:269; TablePanel.tsx:79 (tableState.ts:21 tem fallback; estes não) |
| `import.meta.env.VITE_API_URL` | api/history.ts:6 |
| `import.meta.env.MODE` | App.tsx:37 (`preserveDrawingBuffer` em test) |
| `matchMedia('(prefers-reduced-motion)')` | App.tsx:20 |
| `confirm` | Controls.tsx:48, TablePanel.tsx:188 |
| `document.getElementById(...).click()` (abre inputs ocultos) | TablePanel.tsx:105, 106, 141, 160 |
| `URL.createObjectURL`/`<a download>`, `createImageBitmap`, `Blob` | TablePanel.tsx:57, 61-65 |
| `File.arrayBuffer`, drag&drop | ImportDie.tsx:173, 294; TablePanel.tsx:71 |
| `window.addEventListener('keydown')` | Chat.tsx:26, TablePanel.tsx:29, ImportDie.tsx:154 |
| DOM do pai via ref (`setAttribute` em `.game-area`) | OmenOverlay.tsx:31-34 |
| `document.createElement('canvas').getContext` | failure.ts:16-18 |
| `import()` dinâmico de `dice/importer` / `scene/tableFile` / `three` | Controls.tsx:20; TablePanel.tsx:54-55, 72 |

---

## 4. Regra de negócio dentro de componente React

| # | Regra | Arquivo:linha | Função pura equivalente? |
|---|---|---|---|
| R1 | Limite de 10 dados no botão (desabilita) | Controls.tsx:42 | store já garante (store.ts:68); duplicação defensiva de UI |
| R2 | Não remove o último dado | Controls.tsx:44 | store já garante (store.ts:71) |
| R3 | Tinta editável só para importado `printed` | Controls.tsx:46 | não |
| R4 | GLB "com textura" detectado carregando o modelo (`modelObject` + `hasTexture`) | Controls.tsx:20 | `importer.hasTexture` existe; a composição está duplicada em ImportDie.tsx:128 |
| R5 | Resultado só aparece depois do presságio (`!omenPlaying`) | Controls.tsx:53-55 | `omenPlaying` (store.ts:61) é a regra; a decisão de esconder fica no componente |
| R6 | Texto de ajuda por fase (mapa fase → mensagem) | Controls.tsx:79-81 | não (só apresentação) |
| R7 | Chat: aplica só se parse ok; limpa input só em sucesso; log limitado a 20 | Chat.tsx:36-41 | `parseDice` (notation.ts:57) faz a regra; limites de UI locais |
| R8 | Atalho C/M ignorado ao digitar | Chat.tsx:7-8, 24; TablePanel.tsx:7-8, 27 | não; `typing` duplicado nos dois arquivos |
| R9 | Com textura só tinta escura ou nenhuma; fallback para a primeira | InkChoice.tsx:13-14 | não; mesma regra em ImportDie.tsx:131 e :273 (`textured && ink !== 'nenhuma' ? 'escura' : ink`) — 3 lugares |
| R10 | Quais efeitos do presságio: flash = crit com d20; deep (kraken) = crit com d100; heat = fumble com d20; storm = fumble com d100 | OmenOverlay.tsx:25-27, 40-43 | **sim**: `krakenIndices`/`stormIndices` (krakenMotion.ts:21, 83), `fireIndices` (fireMotion.ts:13); Omens.tsx:200 repete a de raio. OmenOverlay recalcula por conta própria |
| R11 | Duração do overlay = `omenMs` | OmenOverlay.tsx:39 | `omenMs` (omen.ts:26) |
| R12 | Chuva semeada (LCG, 90 gotas) | OmenOverlay.tsx:11-18 | não (apresentação) |
| R13 | O primeiro erro gravado vence (física não vira "graphics") | Safeguard.tsx:13 | não |
| R14 | Sem WebGL → erro `webgl` antes do 1º render | App.tsx:17 | `hasWebGL` (failure.ts:11) |
| R15 | **Quando salvar no histórico**: a cada `results` novo | App.tsx:26-28 | não; a decisão está na casca |
| R16 | Reduced motion vem do SO | App.tsx:19-24 | store anula o presságio (store.ts:119, 144) |
| R17 | Arquivo: formato `.stl/.glb` e ≤10 MB antes de ler | ImportDie.tsx:168-170 | `formatOf` existe; o limite de bytes é **repetido** em `readModel` (importer.ts:75) |
| R18 | Não reconheceu d4–d20 (`nao-padrao`) → oferece forma livre | ImportDie.tsx:177, 192-198 | erro vem de `detectPlanes` (importer.ts:145); fluxo no componente |
| R19 | Cor padrão = gema da base (livre → d20); nome padrão = nome do arquivo sem extensão, 24 chars | ImportDie.tsx:187-188 | parcial: `gemColor` (Die.tsx:23) faz o mesmo para dado já salvo |
| R20 | Forma livre em camadas: se o jogador aceitar, só as `tier` maiores faces valem resultado (ordena áreas, pega `tier`, `withReadable`) | ImportDie.tsx:134-138 | `tierOf`/`withReadable` existem (importer.ts:234, 322); a seleção das maiores está no componente |
| R21 | Desequilíbrio: `unevenOf(readAreas)` com faces legíveis | ImportDie.tsx:141, 336 | `unevenOf` (importer.ts:239) |
| R22 | Sugestão da face oposta: pareamento por `pos % 2` (depende do layout de `askOrder`), d10 sugere 10 no lugar de 0 | ImportDie.tsx:149, 231-233, 364 | `suggestOpposite`/`askOrder` (importer.ts:406, 411); a dependência do pareamento e o 0→10 estão no componente |
| R23 | Validação por face: vazio, faixa (`checkValue`/`checkFreeValue`), número repetido entre faces confirmadas | ImportDie.tsx:222-230 | `checkValue`, `checkFreeValue`, `normaliseValues` existem; a checagem incremental de repetição é inline (`checkValues` faz a do conjunto) |
| R24 | Conclusão: quantidade esperada (d4 = vértices; livre = faces legíveis; senão faces) + `checkValues`/`checkFreeValues` | ImportDie.tsx:241-248 | parcialmente (`checkValues`, `checkFreeValues`) |
| R25 | Nome 1–24 caracteres; apelido via `slugProblem` | ImportDie.tsx:252 (+ :188, :377 `maxLength`) | `slugProblem` sim; **nome não** |
| R26 | Montagem do `CustomDie`: renumeração calibrada (valores normalizados, giros, d4 sem giro); forma livre não calibrada numerada 1..N pela maior face; `omens` só em base d20; `color` só STL; `ink` só se `printed` (com coerção R9); `finish` só STL; `id`/`createdAt` | ImportDie.tsx:254-274 | `renumbered`/`normaliseValues` sim; **a montagem do registro não** (é a fábrica de `CustomDie`, regra de dados importados) |
| R27 | Depois de salvar, adiciona à seleção se couber | ImportDie.tsx:279 | não |
| R28 | Giro do numeral módulo nº de lados da face | ImportDie.tsx:18-22, 283, 367 | não (cálculo "pontos no plano da face" repetido em :21, :37, :215 e importer.ts:415) |
| R29 | Câmera/orientação da prévia (faces livres vistas por baixo; distância ≈75%) | ImportDie.tsx:201-217 | não (apresentação 3D) |
| R30 | Foto de fundo: reduz a `photoPx`; mantém desfoque/escurecer anteriores ou 0/25 | TablePanel.tsx:38-41 | `reduceImage` sim; padrões não |
| R31 | Panorama: decodifica antes (checa 2:1) e padrões rotação 0, brilho 1, desfoque 0, refletir | TablePanel.tsx:42-46; os mesmos padrões em :77 | `preparePanorama`/`panoramaTexture` sim; padrões duplicados, sem constante |
| R32 | Textura de feltro própria: cor vira branco, `tile: 2` | TablePanel.tsx:47-50 | não (`extrasOf` usa o mesmo 2 em tableTheme.ts:83) |
| R33 | Botão Cor volta à cor de `DEFAULT_THEME` (fallback `#140E10`); Tema começa em `taverna` | TablePanel.tsx:104, 107 | não |
| R34 | Exportar: escolhe mapa do fundo, avisa HDR→JPEG, nome `mesa-{fileSafe}.glb` | TablePanel.tsx:53-67 | `buildFor`/`exportTable`/`fileSafe` sim; orquestração no componente |
| R35 | **Importar mesa**: extensão `.glb`; cores do modelo ou padrão; resolução do fundo (ternário aninhado: extras image/panorama/cor/preset, painel 360° sem ajustes, ou mantém o atual); monta `TableTheme` novo (id, nome ≤40, `felt.texture='liso'`, `model`); avisos → confirmação | TablePanel.tsx:69-83 | `readTable` (tableFile.ts:154) faz leitura/validação; **a conversão `ImportedTable → TableTheme` não existe como função** |
| R36 | Mesa padrão: nome, duplicar e restaurar desabilitados; com modelo importado cores/textura desabilitadas | TablePanel.tsx:133, 157, 163-164 | `DEFAULT_ID` existe; regra na UI (o store também ignora persistir a padrão, tableState.ts:27) |
| R37 | Clamps dos sliders | TablePanel.tsx:122-128, 151-152 | `clamp*` (tableTheme.ts:42-47) — ok |

---

## 5. ImportDie.tsx e TablePanel.tsx por faixa

### ImportDie.tsx
| Linhas | Passo | Usa |
|---|---|---|
| 1-16 | imports, tipos `Step`/`Loaded`, `prettySize` | — |
| 18-28 | `sidesOf`, `orientation` (geometria three) | `Polyhedron` |
| 30-53 | `Marker` (polígono/esfera da face perguntada) | `Polyhedron` |
| 55-63 | `Rig` (câmera da calibração) | drei `OrbitControls` |
| 65-102 | `Preview`: modelo pintado na leitura, prévia "vestida" no save | importer `inkOf` (:78), `inkTriangles` (:86), `markInk` (:88); scene/Die `usePainted` (:87), `paintGlb` (:89), `GemMaterial` (:95) |
| 104-149 | estado + derivados | importer `hasTexture` (:128), `withReadable` (:137), `askOrder` (:139); custom `inkColorOf` (:131); scene/Die `GEM` (:112, :131) |
| 151-163 | Esc/foco, `reset`, `close` | — |
| 165-198 | passo file: `pick`, `load`, `goFree` | importer `formatOf`, `LIMITS`, `importModel`, `ImportError`; `GEM` (:187) |
| 200-217 | orientação/distância da prévia | importer `renumbered` (:203) |
| 219-248 | `askNext`, `finish` | importer `checkValue`, `checkFreeValue`, `normaliseValues`, `suggestOpposite`, `checkValues`, `checkFreeValues` |
| 250-281 | `save` (monta `CustomDie`) | notation `slugProblem`; importer `renumbered`, `normaliseValues`; custom `customKind`, tipo `CustomDie`; store `addCustom`/`addDie`; `MAX_DICE` |
| 283-392 | JSX dos 4 passos | importer `unevenOf` (:336), `LIMITS` (:296); notation `slugOf` (:377); `InkChoice` |

### TablePanel.tsx
| Linhas | Passo | Usa |
|---|---|---|
| 1-21 | imports, `typing`, store e estado | tableState `useTable` |
| 23-37 | teclado; `task` (TableError → mensagem) | tableImages `TableError` |
| 38-51 | foto, panorama, imagem de feltro, `setBackground` | tableImages `reduceImage`, `preparePanorama`, `panoramaTexture`; tableTheme `LIMITS` |
| 53-67 | exportar | tableFile `buildFor`, `exportTable` (dinâmico); three `CanvasTexture` (dinâmico); tableImages `panoramaPicture`; tableTheme `fileSafe`; tableBuild `disposeTable` |
| 69-83 | importar | tableFile `readTable` (dinâmico); tableBuild `colorsOf`, `disposeTable`; tableTheme `DEFAULT_THEME`, tipos |
| 85-197 | JSX | tableTheme `PRESETS`, `LIMITS`, `clamp*`, `DEFAULT_THEME` |

### Avaliação: é "dado importado"/"mesa" ou "cena"?
- **ImportDie ← scene/Die.tsx**: `GEM` (paleta de gemas dos dados embutidos, Die.tsx:16) e `GemMaterial` (material de *todos* os dados, Die.tsx:156) são **aparência de dado na cena**; se fossem para "dados importados", Die.tsx (que pinta d4–d20) passaria a depender de dados importados para desenhar dados comuns — direção errada. `usePainted` (Die.tsx:123) e `paintGlb` (Die.tsx:141) só servem dado importado `printed` (pintura da tinta via máscara `userData.ink` gerada por `importer.inkTriangles/markInk`), mas são renderização three/React. Leitura: o assistente de importação tem uma **prévia 3D que reusa o renderizador de dado**; a fronteira natural é a cena (ou um submódulo "aparência de dado") expor `GEM`, `GemMaterial`, `usePainted`, `paintGlb` no seu index, e "dados importados" depender dela. Alternativa (decisão do dono): o módulo de dados importados ser dono de `usePainted`/`paintGlb` (só existem por causa dele) e a cena depender dele — a cena já importa `dice/custom` e `dice/importer` (Die.tsx:7, 92). Os helpers de geometria da prévia (ImportDie.tsx:18-102, 201-217) são renderização e poderiam sair do componente para um arquivo de cena do assistente.
- **TablePanel ← scene/table\***: nada disso é "cena" no sentido de render loop. `tableTheme` é domínio puro da mesa; `tableState` é o store da mesa; `tableStore` é a persistência (IndexedDB `tables` + localStorage `mesa.ativa`); `tableImages` é preparo de imagens (canvas); `tableFile` é E/S `.glb`; `tableBuild.colorsOf/disposeTable` são utilitários three específicos de mesa. Ou seja, **é o módulo "mesa" morando em `scene/`**; a cena (Tray, Backdrop, Stage, Omens/Kraken lendo `colors`) é consumidora. Isso também explica o ciclo de pastas scene↔ui do grafo (2b): some se a mesa sair de `scene/`. Observação: `tableFile` depende de `dice/importer.parseGlb` (tableFile.ts:3) e reconhece `ImportError` por `e.constructor.name` (tableFile.ts:161) — mesa depende de dados importados para ler GLB; candidata a infra compartilhada de carregamento GLB ou a um export explícito no contrato de dados importados.

---

## 6. Histórico ponta a ponta

### (a) Cliente
- **Quando**: `App.tsx:26-28` `useDice.subscribe((s, prev) => { if (s.results && s.results !== prev.results) saveRoll(s.dice, s.results, s.force) })`. `results` só ganha array novo em `publish` (store.ts:140-146), que também transita a fase e calcula o presságio. Logo: **um POST por arremesso publicado**, no instante da publicação (antes do presságio terminar), inclusive com reduced motion e com `omenRig` de teste (o rig só troca o presságio, não os resultados).
- **Payload** (`rollBody`, history.ts:27-28): `{ playerId, dice: [{kind, value} | {kind, value, base, omens}], force: clamp(force,0,1) }`. Dado importado leva `base` e `omens` do registro `customDie(kind)` (history.ts:22-25). Se o dado sumiu do registro, vai sem `base` e o servidor recusa (400) **(inferência: só ocorreria em corrida com exclusão)**. Não há guarda para `results.length !== dice.length` (`value` undefined → 400).
- **playerId**: `localStorage['diceroller.player']`, criado com `crypto.randomUUID()` na primeira vez (history.ts:11-19); com storage bloqueado, um UUID por visita (`SESSION`, history.ts:8).
- **Erros**: `fetch(...).catch(() => {})` (history.ts:35); respostas 4xx/5xx também são ignoradas (não lê `res.ok`). `keepalive: true`.
- **Env**: `VITE_API_URL` (history.ts:6); sem ela `saveRoll` retorna sem nada (history.ts:31). Barra final removida (:32). Não há tipagem própria de `ImportMetaEnv` (cast `as string | undefined`).
- **Leitura**: nenhum código do front chama `GET /rolls` — o histórico hoje é só escrita.
- **Testes**: tests/history.test.ts (corpo, importado, forma livre, sem URL não envia, URL com barra, fetch rejeitado engolido, id estável). Nenhum e2e toca a API.

### (b) Servidor
| Rota | Validação | Resposta | Códigos |
|---|---|---|---|
| `GET /health` (app.ts:14-16) | — | `{ok:true, db:'up'}` | 200; 503 `{ok:false, db:'down'}` se `ping` falha |
| `POST /rolls` (app.ts:18-43) | JSON Schema: `playerId` UUID minúsculo (app.ts:8); `dice` 1..10 itens `{kind: enum KINDS | pattern CUSTOM, value: integer -99..999, base?: enum CUSTOM_BASES, omens?: boolean}`, `additionalProperties:false`; `force?` 0..1. Depois `score(dice)` (faixa por forma) | 201 `Roll` | 400 (schema, formato padrão do Fastify `{statusCode, code, error, message}`); 400 `{error}` de `score`; 500 se o Mongo recusar **(inferência: handler padrão)** |
| `GET /rolls` (app.ts:45-56) | querystring `playerId` (UUID), `limit` 1..100 default 20, `before` 24 hex | `{rolls: Roll[], next: string|null}` | 200; 400 |

- `additionalProperties:false` **não rejeita**, remove (teste "ignores a total sent by the client", api.test.ts:75-77, espera 201 com `total` recalculado) — comportamento padrão do Ajv no Fastify (`removeAdditional`) **(inferência sobre a config; o teste confirma o efeito)**.
- **Regras no servidor** (rules.ts):
  - faixa de valor: forma livre −99..999 (`FREE_VALUES`); importado padrão 1..`SIDES[base]`; embutido 1..`SIDES[BASE[kind]]` (d10 1..10, d100 1..100, moeda 1..2); importado sem `base` → recusado (rules.ts:9-16, 23-24). Mensagem "O dado X não tem a face Y."
  - `clean`: embutido perde `base/omens`; importado guarda `base` e `omens = base==='d20' && omens===true` (rules.ts:18).
  - presságio: `omenOf` com importado d20 optante mapeado para `'d20'` (rules.ts:26) — o servidor não usa o `Set` `omenD20s`; `omenKind`.
  - total: soma exceto moedas (rules.ts:27).
- **MongoDB** (rolls.ts): coleção `rolls`; índice `player_history {playerId:1, _id:-1}` (:48); `$jsonSchema` (:13-35) com `required` todos os campos, `playerId` string 1..64, `value` int −99..999, `total` int, `omen` enum incl. null, `force` double/int/null 0..1; cria com validador se não existe, senão `collMod` (falha só avisa no log, :43-45). Paginação por `_id < before`, `limit+1` para saber se há próxima (:63-68). DB: `MONGODB_DB ?? 'diceroller'` (main.ts:13).
- **Env**: `MONGODB_URI` obrigatório (sai com 1, main.ts:6-10), `MONGODB_DB`, `PORT` (3001), `HOST` (127.0.0.1), `CORS_ORIGIN` (default `http://127.0.0.1:5173,http://localhost:5173`). Carregado por `node --env-file-if-exists=.env` (package.json:8-9).
- **CORS**: `@fastify/cors` com `origin: string[]` (app.ts:12).
- **Init/encerramento**: `client.connect` → `rollsCollection` → `buildApp` (logger true) → `listen`; SIGINT/SIGTERM fecham app e client e `exit(0)` (main.ts:11-23). Sem tratamento de erro do `connect` (top-level await rejeita e o processo cai) **(inferência)**.

### (c) O que o servidor importa de src/ e restrições
- `server/src/app.ts:3`, `rolls.ts:2` → `src/dice/kinds.ts` {`CUSTOM_BASES`, `FREE_VALUES`, `KINDS`}; `rules.ts:1` → kinds {`BASE`, `isCustom`, `SIDES`, tipos}; `rules.ts:2` → `src/dice/omen.ts` {`omenOf`, `omenKind`, `OmenKind`}; `rolls.ts:3` → omen (tipo).
- Restrições impostas a esses arquivos: Node executa `.ts` por *type stripping* → imports relativos **com extensão `.ts`** (omen.ts:1 importa `./kinds.ts` por isso, comentário explícito), só sintaxe apagável (`erasableSyntaxOnly`: sem `enum`, `namespace`, parameter properties), `import type` para tipos (`verbatimModuleSyntax`), **sem three, sem DOM, sem dependências do front** (o pacote server tem node_modules próprio), ESM. `kinds.ts` não importa nada; `omen.ts` só kinds. Qualquer arquivo que entrar nessa cadeia herda as restrições.
- Efeito colateral: `kinds.ts:21` `omenD20s` (estado mutável global) também existe no servidor (vazio).

### (d) Contrato HTTP: tipos de cada lado
- **Não há tipo compartilhado do contrato.** Só os tipos de valor (`DieKind`, `CustomBase`, `OmenKind`) e constantes (`KINDS`, `CUSTOM_BASES`, `FREE_VALUES`) vêm de `src/dice/kinds.ts`/`omen.ts`.
- Cliente (inferido de `rollBody`, history.ts:22-28):
  ```ts
  { playerId: string; dice: ({ kind: DieKind; value: number } | { kind: DieKind; value: number; base: CustomBase; omens: boolean })[]; force: number }
  ```
  Resposta: não tipada nem lida.
- Servidor: `Die { kind: DieKind; value: number; base?: CustomBase; omens?: boolean }` (rules.ts:7); corpo `{ playerId: string; dice: Die[]; force?: number }` (app.ts:18); `Roll { id; createdAt: string; dice: Die[]; total; omen: OmenKind|null; force: number|null }` (rolls.ts:10); `RollDoc` (rolls.ts:9).
- Divergências: `force` obrigatório no cliente × opcional no servidor (vira `null`); `omens` sempre presente para importado no cliente × opcional no servidor; `playerId` UUID na rota × string 1..64 no Mongo; `kind` custom: cliente usa `custom:<uuid>` × servidor aceita `^custom:[A-Za-z0-9_-]{1,64}$` (rules.ts:5); limite de 10 dados = `MAX_DICE` no front (polyhedra.ts:253) × literal 10 em app.ts:25 e rolls.ts:21; a forma do dado está declarada **três vezes** (tipo `Die`, JSON Schema da rota app.ts:24-33, `$jsonSchema` rolls.ts:20-29).

### (e) Camadas
- Rota: app.ts (schema + chama `score` + `store.add`; regra mínima na rota: `force ?? null` e mapeamento `{error}` → 400, app.ts:40-42). Regra: rules.ts (pura). Dados: rolls.ts.
- Vazamentos: a validação de domínio está espalhada em 3 camadas (schema da rota, `score`, validador Mongo); rolls.ts (dados) importa `CUSTOM` de rules.ts (regra) (rolls.ts:4). Não há regra de negócio relevante dentro do handler.

### (f) Testes do servidor
- `mongodb-memory-server` (`MongoMemoryServer.create()`, baixa binário na 1ª vez; hookTimeout 300 s), `MongoClient` real, db `diceroller-test`, `app.inject` sem rede (api.test.ts:13-19).
- Cobrem: salvar com total/presságio calculados e ler de volta; dualidade, d100=1 crit, vtm/fire sem presságio; importado d20 com/sem opt-in e embutido sem `base`; forma livre (−99, 0, 999, total negativo, nunca presságio); 14 recusas (faixas, base ausente/indevida, id malformado, face/moeda inexistente, dado desconhecido, >10, 0 dados, playerId inválido, force>1); total do cliente ignorado; paginação por jogador; validador da coleção e uso do índice (explain); `collMod` atualiza coleção antiga; `/health` e preflight CORS.
- Não cobrem: `/health` 503, `before` malformado, fumble isolado de d20=1 e d100=100, falha do `collMod` (só aviso), `main.ts`.

---

## 7. CSS: seletores que são contrato entre partes

| Seletor (index.css) | Quem escreve | Quem lê além do CSS |
|---|---|---|
| `.game-area[data-omen="duality"] canvas` (:113), `.game-area[data-kraken] canvas` (:106), `.game-area[data-storm] canvas` (:103) | OmenOverlay.tsx:31-34, no `div` criado em App.tsx:32 e recebido por ref | e2e (`data-omen`, `data-kraken`, `data-storm`) |
| `.omen` com `--ms` (:92, :105 `kraken-depth var(--ms)`) | OmenOverlay.tsx:39 (`omenMs`) | e2e `.omen` |
| `.omen-flash/-deep/-heat/-sea/-rain i(.near)/-thunder` (:94-105) | OmenOverlay.tsx:40-50 | e2e |
| Tempos fixos no CSS que espelham `omen.ts`: `omen-shake` atraso 1100ms (= `DUALITY_HIT`, comentário :112), `storm-rock` 4600ms (= `OMEN_MS.storm`), `thunder` 1300ms, `kraken-impact` 450ms (:103, :106, :113) | — | duplicação CSS↔`dice/omen.ts` |
| `.chat` / `.chat[data-open="true"]` (:71-75) | Chat.tsx:48, ImportDie.tsx:286, TablePanel.tsx:94 (as três gavetas usam `.chat`; ImportDie e TablePanel também `.import`) | e2e `data-open` |
| `.chat-log [data-error]` (:83) | Chat.tsx:55 | e2e |
| `.selection[aria-label="Meus dados"]` (:132) | Controls.tsx:63 (texto do aria-label) | — |
| `button[aria-pressed="true"]` (:34) | Controls.tsx:42, TablePanel.tsx:104-107, 117, 187 | e2e via role |
| `.backdrop`, `.backdrop-art`, `.backdrop-dim` (:65-67); `data-kind` não é usado no CSS | scene/Backdrop.tsx:24-26 | e2e `.backdrop[data-kind=...]` |
| `.import-preview` (:138); `data-ink`/`data-finish` só para teste | ImportDie.tsx:306 | e2e |
| `.ink-pop`, `.ink-choice` (:145-152) | Controls.tsx:19, InkChoice.tsx:16 | — |
| `.failure` (:171), `.sr-only` (:91) | Safeguard.tsx:21, OmenOverlay.tsx:52 | e2e `failure` |
| `.import-error` usado também para aviso de sessão e avisos da mesa (TablePanel.tsx:100, 172) | — | semântica de "erro" reaproveitada |
| `.pool`, `header.controls`, `footer`, `output strong` | Controls.tsx | e2e |

---

## 8. Achados

### Código sem uso ou só para teste
1. `checkTheme` (tableTheme.ts:50) só é chamado por tests/table.test.ts — nenhum caminho de produção valida um `TableTheme` lido do IndexedDB ou montado no import (TablePanel.tsx:78-81).
2. `GET /rolls` não tem consumidor no front.
3. `data-testid="import-not-standard"` (ImportDie.tsx:301) e `"import-uneven"` (:336) não aparecem no e2e.
4. `playerId`/`rollBody` são exportados só para teste.

### Duplicações
5. Limite de nome: dado 24 (ImportDie.tsx:188, 252, 377); mesa 40 (TablePanel.tsx:79, 157; tableState.ts:58; tableTheme.ts:100). Sem constante.
6. Regra "tinta com textura" em 3 lugares (InkChoice.tsx:13; ImportDie.tsx:131, 273) e detecção de textura em 2 (Controls.tsx:20; ImportDie.tsx:128).
7. "`omens` só em base d20" em 3 lugares: ImportDie.tsx:270, custom.ts:56, rules.ts:18/26.
8. Total sem moedas: notation.ts:43 (`resultText`) e rules.ts:27. O servidor não pode importar `notation.ts` (puxa `custom.ts` → three).
9. Mapeamento presságio → efeito: OmenOverlay.tsx:25-27 × `krakenIndices`/`stormIndices`/`fireIndices` (krakenMotion.ts:21, 83; fireMotion.ts:13) × Omens.tsx:200.
10. Constantes de tempo do presságio no CSS × omen.ts (seção 7).
11. Forma do dado do histórico declarada 3× no servidor (tipo, schema da rota, `$jsonSchema`); `10` literal × `MAX_DICE`.
12. Limite de 10 MB checado em ImportDie.tsx:170 e importer.ts:75.
13. Padrões do panorama repetidos (TablePanel.tsx:45, 77).
14. `typing()` copiado em Chat.tsx:7 e TablePanel.tsx:7; "pontos no plano da face" em ImportDie.tsx:21, 37, 215 e importer.ts:415.

### Riscos e acoplamentos relevantes para as fronteiras
15. **Dados de "dados importados" lidos por fora do store**: o registro em memória de `dice/custom.ts` (Map + `omenD20s` em kinds.ts) é lido por Controls, history.ts, notation (defaults), omen.ts — dois "donos" para o mesmo dado (store `customs` e registro). `omenD20s` é estado de dados importados vivendo em `kinds.ts` e lido pela regra de presságio.
16. **Mesa mora em `scene/`** (seção 5) e gera o ciclo de pastas ui↔scene; o outro sentido do ciclo é `Stage.tsx → ui/Safeguard.Guard`.
17. **Histórico disparado pela casca** (App.tsx:26-28) e lendo store do arremesso + registro de dados importados (history.ts:23): o módulo de histórico depende de arremesso e de dados importados; nenhum dos dois sabe dele (bom), mas o gatilho precisa de dono.
18. `crypto.randomUUID` no carregamento de history.ts:8: só existe em contexto seguro; servido por HTTP fora de localhost (ex.: IP da LAN) lança na importação e derruba o App inteiro **(inferência: regra da Web Crypto, não testei)**. tableState.ts:21 já tem fallback; ImportDie.tsx:269 e TablePanel.tsx:79 não.
19. Se existir `.env.local` com `VITE_API_URL`, o modo `test` do Vite também o carrega e o e2e passaria a postar na API **(inferência sobre o carregamento de env do Vite)**.
20. TablePanel assina o store da mesa inteiro (`useTable()` sem seletor, TablePanel.tsx:14) — re-render a cada `setColors` do Tray.
21. Esc no assistente (ImportDie.tsx:153) fecha sem `reset`; o × (:289) reseta. Os três listeners globais de Esc não param a propagação: com duas gavetas abertas, um Esc fecha as duas **(inferência)**.
22. Dois formatos de erro 400 no servidor (Fastify × `{error}` de `score`); o cliente não lê nenhum.
23. `tableFile.ts:161` identifica `ImportError` por `constructor.name` (acoplamento por string com dados importados).

### Perguntas para o dono do negócio
- O histórico deve gravar o arremesso no instante da publicação (como hoje) ou só depois do presságio/visualização? Arremessos com reduced motion e em modo teste também contam?
- Haverá tela de histórico (`GET /rolls`)? Isso decide se "histórico" é um módulo de front também ou só um cliente de escrita.
- O `playerId` anônimo é do domínio "jogador/conta" (futuro) ou do histórico?
- Limites de produto: 24 (nome do dado), 16 (apelido), 40 (nome da mesa), 10 dados, −99..999 (forma livre), 10 MB/50 mil triângulos (dado), 20 MB/100 mil (mesa). São regras de negócio ou técnicas? Quem é o dono de cada uma?
- "Tinta" de dado importado pode ser mudada depois (InkButton) mas cor da gema, `omens` e nome não — intencional?
- Esc no assistente deve preservar o progresso (hoje sim) ou descartar como o ×?
- Mesa importada (.glb) bloqueia cores/textura: regra definitiva?
- Falha do `collMod` deve impedir a API de subir em vez de só avisar?
