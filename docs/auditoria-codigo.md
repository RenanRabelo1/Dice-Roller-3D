# Auditoria de código morto e repetido

OS-0066 (HUD imersivo, parte 3). Só relatório: nenhum código foi alterado. Feito em 2026-11-16 sobre `claude/os-0066-auditoria-20b5d2` (base `e7c02c2`). O João decide o que vira ordem de limpeza.

## Como ler

- **Colunas:** Onde (arquivo:linha) | O quê | Prova (comando que qualquer um repete) | Ganho | Risco.
- **Ganho** é "manutenção" ou "bundle". O Vite/Rollup já descarta export sem uso, então apagar `export` ou re-export de porta **nunca** diminui o bundle. Só CSS e dependência mexem no tamanho entregue, e mesmo o CSS ganha pouco (o `index.css` tem 378 linhas).
- **Risco** é o de remover sem olhar a tela. Onde o risco é visual, a prova é por leitura de especificidade, **não por captura de tela**: confirmar no navegador antes de apagar (ver "Limites").
- Ordem das tabelas: ganho primeiro, depois risco, os fáceis no topo.
- Provas com `rg`: rodar na raiz do repositório.

## Método e limites

Feito por leitura e busca, sem instalar nada (não há `node_modules` no worktree, então `npm run lint` e `tsc` não rodaram). Para os exports foi usado um script descartável em `node` puro (fora do repositório) que, para cada `export`, procura o nome como palavra em `src/`, `server/src/`, `e2e/` e `tests/`, separando uso de produção, uso só de teste e uso só no próprio arquivo. Para as portas (`index.ts`, `cena.ts`), contou só consumidores **fora** do módulo. O mesmo nome em outro módulo conta como uso (falso negativo possível, nunca falso positivo). O `window.__dice` e o worker entram na busca porque são arquivos como os outros.

- **Não coberto:** pixel a pixel (nenhuma captura), `tests/` de módulo comparado com `tests/` da raiz, `docs/`, `references/` e `.superpowers/` (histórico/doc, não é código entregue).
- **Já garantido pelo build:** `noUnusedLocals` e `noUnusedParameters` estão ligados nos três `tsconfig`. Variável local, import e parâmetro sem uso não existem em código que compila; por isso a caça é só a export e a CSS.
- **Não repeti a OS-0050:** `clampHandX`, `checkTheme`, `assinarArremesso`, `SYMBOLS`, `pisoEstaOculto` e `carregarImportador` já estão decididos em `docs/backlog.md` (seção 6) e ficam fora dos achados (os dois primeiros seguem pendentes de decisão do João lá).
- **Faixas e vinheta (OS-0062):** `.controls`, `.status`, `.game-area::before/::after` e o bloco "OS-0061: reações" estão sendo mexidos em paralelo e não entram como achado. Só aparecem em "Observações" por causa de uma regra que talvez nunca vença (ver O-1).

## Resultado em uma linha

Não há arquivo órfão, dependência sem uso nem seletor CSS cuja classe tenha sumido do DOM. O que existe é: (1) **regras de CSS 100% sobrescritas** pelo livro (OS-0052 a 0055), que sobraram do painel lateral antigo; (2) **superfície de porta maior que o uso** (63 re-exports sem consumidor fora do módulo); (3) **helpers de E2E copiados** entre specs; (4) **meia dúzia de funções pequenas repetidas** entre módulos.

---

## 1. Código morto

### 1.1 CSS (`src/index.css`)

Todas as classes e ids do CSS ainda existem no DOM (conferido: cada `.classe`/`#id` de `index.css` e de `presagios.css` aparece em algum `.tsx`/`.ts` fora de teste; `.msg-you`/`.msg-app` nascem de `` `msg-${l.from}` `` em `Chat.tsx:48`). O morto é **a declaração**, não o seletor: a regra existe, mas outra mais específica, do livro, vence em todas as propriedades. Os quatro painéis (`#dice-chat`, `#table-panel`, `#meus-dados`, `#import-die`) são `<aside class="chat panel …">` dentro de `.livro`, então tudo o que `.livro > aside` redefine apaga o `.chat` antigo.

Prova geral: `rg -n 'className="chat panel' src` (os 4 asides, todos filhos de `<div className="livro">` em `src/app/Painel.tsx:33`) e `rg -n '^\.livro > aside' src/index.css` (l.195-208).

| Onde | O quê | Prova | Ganho | Risco |
|---|---|---|---|---|
| `index.css:108-111` | `.chat-log .msg-you`, `.msg-app`, `[data-error]`, `.hint`: **toda** declaração (align-self, background, color, opacity) é redefinida por `.livro > #dice-chat .chat-log …` nas l.216-221. O chat só existe dentro do livro. | `sed -n '108,111p;216,221p' src/index.css`. Especificidade: `.chat-log .msg-you` (0,2,0) contra `.livro > #dice-chat .chat-log .msg-you` (1,3,0). Único consumidor do chat: `rg -n 'className="chat panel"' src` → `Chat.tsx:41`. | manutenção | baixo |
| `index.css:55` | `.pool { min-width:110px; font-weight:800; color:brass }`: `min-width`, `font-weight` e `color` são todos redefinidos por `.roda-botao .pool` (l.164). `.pool` só existe dentro de `.roda-botao` (`ResumoDaMao` só é usado em `RodaDeDados.tsx:25`). | `rg -n 'ResumoDaMao' src` (3 arquivos, 1 uso) e `sed -n '55p;164p' src/index.css` | manutenção | baixo |
| `index.css:153-155` ou `237-238` | O mesmo bloco duas vezes, idêntico: `.table-list li { display:flex; gap:6px }` e `.table-list li button:first-child { flex:1; text-align:left }` (l.154-155 e l.237-238, esta com mais especificidade). Apagar as de 237-238 não muda nada. | `sed -n '154,155p;237,238p' src/index.css` | manutenção | baixo |
| `index.css:98-102`, `104`, `115` | O bloco antigo do painel lateral: `.chat` (position fixed, top/right/bottom, width, transform `translateX(100%)`, box-shadow, border-left, visibility, transition), `.chat[data-open="true"]` e o `prefers-reduced-motion` do `.chat`. `.livro > aside` (l.195) redefine position, inset, width, border, box-shadow e **transform: none**; `.livro > aside[data-open="true"]` (l.198) já põe `display` e `visibility`. Resultado: transform e transition nunca animam, e o `[data-open]` (l.102) não muda nada. `.chat h2` (l.104) perde para `.livro > aside h2` (font-size, margin). **Ficam** o `gap:12px` (vale para o grid do aside) e o `z-index:10`. | `sed -n '98,104p;195,199p' src/index.css` | manutenção | médio (é o bloco mais "estrutural": tirar e ver a tela) |
| `index.css:52`, `83-84` | `.selection { display:flex; align-items; gap; flex-wrap }`: os dois usos (`BotoesDeDados` na roda e `MeusDados`) têm `display:block` por cima (l.170 e l.246), então `align-items`, `gap` e `flex-wrap` não fazem nada. O `flex:1 1 100%` mobile (l.83) também: o pai (`.roda-anel` ou `.import-body`) não é flex. **Fica** o `.selection button { padding }` mobile (l.84), que ainda vale em `#meus-dados`. | `rg -n 'className="selection"' src` (2) e `rg -n '\.selection' src/index.css` | manutenção | baixo |
| `index.css:121` | `.import { width: min(420px,100vw) }`: `.livro > aside { width:auto }` vence (a `overflow-y:auto` dessa regra ainda vale, fica). | `sed -n '121p;195p' src/index.css` | manutenção | baixo |
| `index.css:123-126`, `131`, `144` | Valores do importador antigo que o livro troca no único lugar onde existem: `.import-drop` borda `#786958` (l.269 troca por `--fio`) e seu `:focus-within` (l.124 contra l.270); `.import-preview` height 220px, border e background (l.126 contra l.268, só em `#import-die`); `.import-error` cor (l.131 contra l.240 e l.274; `#meus-dados` não tem `.import-error`); `.import-choice button.primary` background/color/border-color (l.144 contra l.272; só em `#import-die`). Cada regra antiga ainda tem **uma** propriedade viva (`display`, `padding`, `font-weight`…): é cirurgia, não apagar a linha. | `sed -n '123,126p;131p;144p;268,274p' src/index.css` e `rg -n 'import-(drop\|preview\|error\|choice)' src --glob '*.tsx'` | manutenção | médio |
| `index.css:152` | `.table-row select`: `font`, `color`, `background`, `border`, `padding` são redefinidos por `.livro > #table-panel select` (l.233). Só `border-radius:3px` e `font-weight/style` herdados ficam. | `sed -n '152p;233p' src/index.css` | manutenção | baixo |
| `index.css:22` | Variável `--wine` declarada e nunca lida (`var(--wine)`). | `rg -n -e '--wine' src` → só a declaração | manutenção | zero |
| `index.css:43`, `80` (`.panel`) | A classe `.panel` nos 4 `<aside>` não faz nada: `padding` e `background` são redefinidos em `.livro > aside` (l.195, 197, 295). Ela só vale em `<header>` e `<footer>` de `Painel.tsx`. Tirar `panel` dos asides muda o HTML que `componentes.test.ts` e os `fixtures/*.json` comparam (3 módulos), então o ganho é pequeno e a mudança toca teste. | `rg -n 'class(Name)?=.chat panel' src` | manutenção | médio (muda fixtures) |

### 1.2 TypeScript

Nenhum arquivo de produção sem importador (`src/troika-three-text.d.ts` é declaração de tipos e `server/vitest.config.ts` é config; os dois são lidos pelo tsconfig/vitest, não por import). Zero dependência do `package.json` sem uso (ver 1.3).

| Onde | O quê | Prova | Ganho | Risco |
|---|---|---|---|---|
| `shared/plataforma/movimento.ts:11` e `plataforma/index.ts:5` | `useMovimentoReduzido`: **nenhum** arquivo o importa, nem teste. A casca lê o movimento por outro caminho (`data-movimento` em `App.tsx`). A OS-0009 já dizia "sem consumidor nem teste por enquanto" (`docs/ordens/0009-…md:106`), e `docs/hud-imersivo.md:124` ainda cita o hook como o canal da casca (a doc está velha). | `rg -nw useMovimentoReduzido src tests e2e` → 2 linhas (a definição e o re-export) | manutenção | baixo (e some o `useSyncExternalStore` desse arquivo) |
| `tests/helpers/models.ts:43` | `stockPoly`, helper exportado sem nenhum chamador. | `rg -nw stockPoly src tests e2e` → só a definição | manutenção | zero |
| `vitrine/contracts.ts:10` e `vitrine/index.ts:7` | `TextoDoPainel` (tipo) sem nenhum uso. | `rg -nw TextoDoPainel src tests e2e` | manutenção | zero |
| `arremesso/contracts.ts:38`, `arremesso/domain/settle.ts:6`, `vortex.ts:39,54`, `world.ts:24`; `dados/domain/modelo.ts:22` (`forgetModel`); `mesa/domain/importacao.ts:5`, `luz.ts:3`, `tableBuild.ts:15` (`PLACEHOLDER`), `tableTheme.ts:8,40` (`PanoramaFormat`, `isHex`); `pressagios/domain/krakenMotion.ts:14` (`FAR`), `luz.ts:25` (`COR_DUALIDADE`), `scene/Kraken.ts:15` (`SHARD_DEFAULT`); `vitrine/contracts.ts:14,15`, `domain/highlight.ts:11`, `inkGlow.ts:8` (`UP_INK`), `showcase.ts:6`; `shared/db.ts:4` (`Store`), `shared/events.ts:3` (`Signal`); `server/…/repository.ts:9` (`RollDoc`) | 24 símbolos com `export` mas usados **só dentro do próprio arquivo** (`SettleState`, `Orbit`, `Whirl`, `Box`, `HandMotion`, `View`, `Highlight`, `Store`, `Signal`…). Tirar o `export`. | `rg -nw '<nome>' src server/src tests e2e` → só o próprio arquivo. Lista completa: ver "Anexo A". | manutenção (o build já descarta) | zero |
| Portas: ver 1.4 | 106 re-exports sem consumidor fora do módulo (63 sem nenhum teste pela porta). | Anexo B | manutenção | baixo |
| `arremesso/domain/aim.ts:31` (`rng`), `dados/domain/tinta.ts:4` (`INK_COLORS`), `mesa/domain/tableBuild.ts:31` (`defaultTable`), `tableFile.ts:67,85` (`cleanTable`, `fitTable`), `mesa/domain/luz.ts:24` (`presetsSemLuz`), `meus-dados/domain/importador.ts:80,181,188,218,290` (`detectPlanes`, `tierOf`, `detectFree`, `idealSolid`, `looksNumbered`), `pressagios/domain/fireMotion.ts:9` (`FIRE`), `luz.ts:19` (`TROVAO`), `omen.ts:8` (`OMEN_MS`), `scene/Kraken.ts:16` (`shardWood`), `pressagios/store.ts:29` (`reiniciarPresagio`), `vitrine/domain/inkGlow.ts:9` (`upInk`), `plataforma/movimento.ts:13` (`definirMovimentoReduzido`) | Exportados só para teste (e, em dois casos, para o E2E). É a mesma classe das quatro que a OS-0050 deixou "de propósito". Registro para o João decidir se a regra é "pode ficar quando o teste precisa". Não recomendo mexer: o teste perderia o gancho. | `rg -nw '<nome>' src tests e2e` → só testes | manutenção | médio (quebra teste) |

### 1.3 Dependências

Nenhuma sem uso.

| Pacote | Quem usa |
|---|---|
| `@fontsource/cinzel`, `cormorant-garamond`, `eb-garamond` | `src/main.tsx:3-7` (5 folhas); as famílias aparecem em `index.css` (l.64, 164, 196, 199, 207…) |
| `troika-three-text` | `AparenciaDoDado.tsx:3`, `Vitrine.tsx:5`, `src/troika-three-text.d.ts` |
| `@react-three/drei`, `fiber`, `rapier`, `three`, `zustand`, `react`, `react-dom` | `src/app/Cena.tsx`, `mesa/scene/AmbienteDaMesa.tsx`, stores… |
| `@dimforge/rapier3d-compat` | `arremesso/domain/apply.ts`, `presim.ts`, `tests/helpers/sim.ts` |
| `@swc/core` | `tests/arquitetura/{leitor,donos,regras}.ts` |
| `@types/node` | os `node:` imports de `tests/`, `e2e/`, `playwright.config.ts` |
| `@types/three`, `@vitejs/plugin-react`, `oxlint`, `typescript`, `vite`, `vitest`, `@playwright/test` | tooling |

Observação (não é achado): `@dimforge/rapier3d-compat` está em `devDependencies`, mas o código de produção o importa. O Vite embute no bundle, então nada quebra; só a classificação é enganosa. Não mexi.

Fonte: `public/fonts/bricolage-grotesque-400.woff` e `-800.woff` estão em uso (`index.css:3,10` e `dados/domain/aparencia.ts:22`).

### 1.4 Portas largas demais (a maior fatia numérica)

106 re-exports de `index.ts`/`cena.ts` não têm consumidor fora do módulo (nem produção, nem teste, nem E2E). Destes, **63** também não são importados pela porta por nenhum teste do próprio módulo (conferência aproximada: um teste do módulo que importa de `../index.ts` ou `../cena.ts` e cita o nome). Os outros 43 só existem para os testes do próprio módulo. Sobraram da extração: o módulo expôs "por via das dúvidas". Os 63, por módulo (valores e tipos, contando a `cena.ts`): `mesa` 21, `arremesso` 17, `vitrine` 9, `pressagios` 7, `dados` 5, `selecao` 2, `meus-dados` 2. As linhas abaixo misturam os dois grupos; o Anexo B separa.

| Onde | O quê | Prova | Ganho | Risco |
|---|---|---|---|---|
| `mesa/index.ts` | `clampBlur`, `clampDim`, `clampIntensity`, `clampPanoramaBlur`, `clampRotation`, `clampTile`, `fileSafe`, `PRESETS`, `panoramaPicture`, `panoramaTexture`, `preparePanorama`, `reduceImage`, `colorsOf`, `disposeTable`, `carregarArquivoDeMesa`, `TableError`, `TableState`, `PresetName`, `MesaImportada`, `MesaInspecionada` (+`useMesa` em `cena.ts`) | Anexo B, comando: `rg -nw clampBlur src tests e2e server/src` e confira que só aparece dentro de `modules/mesa/` | manutenção (porta menor = o `CLAUDE.md` do módulo fica menor e honesto) | baixo |
| `arremesso/index.ts` | `newWhirl`, `stepWhirl`, `vortexCenter`, `vortexRadius`, `spinAngle`, `restingPlaces`, `bodyStates`, `toKinematic`, `clampTarget`, `setAim`, `setForce`, `setChargeMode`, `initialGesture`, `criarWorkerDePresimulacao`, `MATERIAL`, `BIAS_BUDGET`, `ORBITS`, `VORTEX`, `HAND` e 8 tipos | Anexo B | manutenção | baixo |
| `pressagios/index.ts` | `fireAt`, `fireIndices`, `fireReach`, `fractureCells`, `krakenAt`, `krakenIndices`, `stormIndices`, `trayBrokenAt`, `planoDoPresagio`, `DUALITY_HIT`, `OMEN_TESTS` + 5 tipos; `cena.ts`: `SHARD_DEFAULT`, `shardWood` | Anexo B | manutenção | baixo |
| `vitrine/index.ts` | `CAPTION`, `HL_SIZE`, `SHOW`, `UP_INK`, `upInk`, `glowMesh`, `highlightAt`, `showcasePoses`, `setShowcased` + 7 tipos (`TextoDoPainel`, `View`, `Highlight`…) | Anexo B | manutenção | baixo |
| `dados/index.ts`, `selecao/index.ts`, `meus-dados/index.ts` | `INK_COLORS`, 5 tipos de `dados`; `remover`, `LeituraDaNotacao`, `SelecaoAlterada`; `excluir`, `montarDado`, `salvar`, `tintaPermitida`, `PedidoDeMontagem`, `DadoInspecionado`, `useMeusDados` | Anexo B | manutenção | baixo |

Cuidados: (a) o teste de arquitetura não exige que a porta tenha consumidor, então apagar passa limpo; (b) o `CLAUDE.md` de cada módulo lista parte desses nomes (regra 8: atualizar a doc no mesmo commit); (c) alguns tipos de `contracts.ts` fazem parte do contrato documentado: quem decide é o dono do módulo. Fica o aviso de que **é uma ordem por módulo** (regra 6), então seriam 8 ordens pequenas ou uma só autorizada pelo João.

---

## 2. Código repetido

### 2.1 E2E (`e2e/`)

Não existe arquivo de helper compartilhado em `e2e/` (o `tests/helpers/` é do Vitest). Cada spec copia o que precisa.

| Onde | O quê | Prova | Ganho | Risco |
|---|---|---|---|---|
| `history.spec.ts:9`, `import.spec.ts:12`, `roll.spec.ts:3`, `worker.spec.ts:5` | `ready(p, n?)` idêntico nos 4. `hud.spec.ts:4` e `omen.spec.ts:4` têm outro `ready(page, n)` (idêntico entre si, `n` obrigatório). | `rg -n '^const ready' e2e` | manutenção | baixo |
| `history.spec.ts:10`, `import.spec.ts:13`, `roll.spec.ts:4`, `worker.spec.ts:6` | `settled(p)` idêntico nos 4 (mesma espera de `phase==='settled' && showcased===throwId`, mesmo timeout). `hud.spec.ts:5` (`shown`, timeout 60 s) e `omen.spec.ts:5` (`shown`, sem timeout) são a mesma ideia com timeout diferente. | `rg -n '^const (settled\|shown)' e2e` | manutenção | baixo |
| `history.spec.ts:11`, `import.spec.ts:14`, `roll.spec.ts:16`, `worker.spec.ts:15` | `throwWithSpace` idêntico nos 4 (foco na `.game-area`, Space 700 ms). `hud.spec.ts:6` e `omen.spec.ts:6` têm `roll` com 300 ms (idênticos entre si). | `rg -n 'throwWithSpace\|^const roll' e2e` | manutenção | baixo |
| `kraken.spec.ts:6`, `table-kraken.spec.ts:9` | `advance(page, ms)` idêntico (relógio falso até `omenTime`). Os `launch` são parecidos mas diferem (um aceita `naturalOne`). | `rg -n 'function advance' e2e` | manutenção | baixo |
| `roll.spec.ts:5`, `worker.spec.ts:7`, `import.spec.ts:19` | `topValue` em 3 variantes do mesmo cálculo (face mais voltada à câmera): `roll` tem o ramo `d4` e devolve `String`, `worker` devolve `String`, `import` devolve o número. | `rg -n 'topValue = async' e2e` | manutenção | médio (as variantes diferem no retorno; o `d4` só existe em `roll`) |
| `controls.spec.ts:3`, `chat.spec.ts:3` | `dice(p)` igual; `controls.spec.ts:4` e `table.spec.ts:12` têm `panel(p)` igual (`#table-panel`). `import.spec.ts:9` (`file`) e `table.spec.ts:9` (`glbFile`) montam o mesmo objeto de arquivo para upload. | `rg -n '^const (dice\|panel\|file\|glbFile)' e2e` | manutenção | baixo |

Resumo: `e2e/helpers.ts` (nome com endereço próprio, por exemplo `e2e/esperas.ts`) com `ready`, `settled`/`shown`, `throwWithSpace`, `advance` tira ~40 linhas e 14 cópias. Nenhum teste muda de asserção. O risco real é o orçamento de tempo dos E2E (variantes de timeout): manter cada timeout como parâmetro. A ordem de limpeza deve rodar os E2E um por vez, como manda o `CLAUDE.md`.

### 2.2 TypeScript de `src/`

Procurado por função igual ou quase igual em arquivos diferentes (varredura de blocos de 3 e 5 linhas iguais em arquivos de produção diferentes, mais nomes de função repetidos).

| Onde | O quê | Prova | Ganho | Risco |
|---|---|---|---|---|
| `arremesso/domain/vortex.ts:30-31`, `dados/domain/solidos.ts:27-30`, `dados/domain/gravacao.ts:10`, `meus-dados/domain/importador.ts:97-99` | Álgebra de `Vec3` copiada 4 vezes: `cross`/`cross3` (idênticas), `unit`, `dot`/`dot3` (idênticas), `sub`/`sub3` (idênticas). `shared/math.ts` já é o dono do tipo `Vec3` e das curvas, mas não tem as operações. Mover para `shared/math.ts` (arquivo "sem imports", que o servidor pode importar). **Confirmar com o ADR 0008** se estender um item existente de `shared/` precisa de ADR. | `rg -n 'const (cross\|cross3\|unit\|dot\|dot3\|sub\|sub3) = ' src --glob '!**/tests/**'` | manutenção | médio (geometria dos sólidos e do redemoinho: os testes `polyhedra`/`vortex`/`importador` cobrem, rodar todos) |
| `shared/math.ts:8` (`clamp01`) contra `historico/index.ts:12`, `arremesso/domain/luz.ts:8`, `arremesso/domain/aim.ts:17`, `vitrine/domain/destaque.ts:4`, `vitrine/scene/Vitrine.tsx:187` | `Math.min(1, Math.max(0, x))` escrito inline 5 vezes, com `clamp01` já em `shared/math`. | `rg -n 'Math.min\(1, Math.max\(0' src` | manutenção | baixo (mesma expressão; **não** substituir o `clamp` de `mesa/tableTheme.ts:41`, que trata `NaN`) |
| `arremesso/scene/MaoDoArremesso.tsx:33-38` e `vitrine/scene/Vitrine.tsx:62-67` | O callback `live` (filtra `registroDeCorpos.current` pelos corpos válidos da seleção atual e só devolve se `ready` e a contagem bate) é o mesmo texto, linha por linha, nas duas cenas. O `arremesso` é dono do registro; faltou ele expor "corpos vivos". `vitrine → arremesso` é dependência permitida. | `diff <(sed -n '33,38p' src/modules/arremesso/scene/MaoDoArremesso.tsx) <(sed -n '62,67p' src/modules/vitrine/scene/Vitrine.tsx)` → vazio | manutenção | médio (é o laço da física; mover sem mudar a lógica e rodar `roll`/`omen`) |
| `pressagios/scene/PresagiosNaCena.tsx:26`, `arremesso/scene/MaoDoArremesso.tsx:154`, `pressagios/domain/krakenMotion.ts:65` | `1 - (1 - t) ** 3` escrito 2 vezes e `** 2` uma vez; `shared/math.ts:7` tem `easeOut` de grau 4 (outra curva, **não** é duplicata). Só vale se virar um `easeOutCubic` em `shared/math`, e aí é mudança de `shared` (ADR). Ganho pequeno. | `rg -n '1 - \(1 - ' src` | manutenção | baixo |
| `pressagios/scene/PresagiosNaCena.tsx:26` | O nome `easeOut` aqui é uma curva diferente da de `shared/math` (cúbica com `clamp01` contra quártica). Não é código repetido, é nome enganoso. Renomear (`easeOutCubica`) evita alguém "unificar" e mudar a animação. | `sed -n '26p' …; sed -n '7p' src/shared/math.ts` | manutenção | zero |

### 2.3 CSS (blocos de OS diferentes que se sobrescrevem)

Já listados em 1.1, porque nesses casos o bloco antigo ficou **morto**. Repetição que não é morte (mesma declaração em dois seletores, ainda funcionando) e que dá para agrupar:

| Onde | O quê | Prova | Ganho | Risco |
|---|---|---|---|---|
| `index.css:226` e `245` | `.import-body` de `#table-panel` e de `#meus-dados` repetem `column-count:2; column-gap:96px; display:block; overflow-y:auto; min-height:0`. Um só seletor `.livro > :is(#table-panel,#meus-dados) .import-body`. | `sed -n '226p;245p' src/index.css` | manutenção | baixo |
| `index.css:225`, `244` | `grid-template-rows: auto 1fr` repetido em 3 asides; `header { display:contents }` em l.212 e l.256. | `rg -n 'grid-template-rows: auto 1fr\|display: contents' src/index.css` | manutenção | baixo |
| `index.css` (várias) | Cores literais repetidas sem token: `#786958` ×9, `#1E1517` ×4, `#49332E` ×3, `#F28B6B` ×2, `rgba(255, 250, 236, .35)` ×4, `#f6ecd6` ×4, `#9b2a1a` ×3, `rgba(212,169,63,.45)` ×3 (as duas últimas em blocos de OS-0061 em andamento, não mexer agora). Os tokens do livro (`--fio`, `--tinta`, …) existem, os do painel antigo não. | `grep -o '#786958' src/index.css \| wc -l` | manutenção | baixo |

---

## 3. Duplicação intencional (não é achado)

Uma linha cada. Cada uma existe por causa de uma regra do `CLAUDE.md`/ADR.

- **`plural`** em `selecao/domain/notacao.ts:24` e `vitrine/domain/painel.ts:4`: `vitrine` só pode depender de `pressagios`, `arremesso`, `dados` e `regras`, não de `selecao`; `regras` é "estreito" (mapa, fronteira 1) e `shared/` não tem regra de negócio (ADR 0008). É um template de uma linha.
- **`typing`** em `mesa/ui/PainelDaMesa.tsx:9` e `selecao/ui/campoDeTexto.ts:2`: `mesa` só depende de `arremesso`. Seria infra de DOM em `shared/plataforma`, o que exige ADR 0008. Se o João quiser, vira ADR + ordem; não é pendência de código.
- **Efeito de atalho de teclado (`keydown` com Esc/M/C/D)** em `PainelDaMesa.tsx:24-32`, `Chat.tsx:16-24`, `RodaDeDados.tsx:11-…`: a OS-0052 deixou "os atalhos ainda nos módulos" (mapa, fronteira 6) para cada painel ser controlado e testável sozinho.
- **`readModel`/`refuse`** em `meus-dados/domain/importador.ts:29-39` e `shared/modelos3d/ler.ts:31-54`: o comentário do importador explica ("a leitura vive em `shared/modelos3d`; os limites e a classe de erro do dado ficam aqui"). É o adaptador, não cópia (`ModelError` → `ImportError`).
- **`store`, `inspecao`, `catalogoAlterado`, `resultadoPublicado`, `selecaoAlterada`** em vários módulos: cada módulo tem o seu store e a sua `inspecao` (dono dos dados, ADR 0003); os três sinais aparecem no módulo dono e re-exportados na porta (ADR 0005).
- **`SYMBOL`** em `dados/domain/aparencia.ts:25` e `solidos.ts:16`: homônimos, são coisas diferentes (altura do símbolo contra mapa de símbolos por tipo). Nome parecido, zero repetição.
- **`LIMITS`** em `mesa/domain/tableTheme.ts:33` e `meus-dados/domain/importador.ts:12`, **`BASE`** em `mesa/domain/tableBuild.ts:11` e `regras/domain/catalogo.ts:6`, **`CUSTOM`** em `server/…/contracts.ts:6` e `dados/domain/aparencia.ts:39`: nomes iguais com conteúdo diferente (limites de arquivo de mesa × de dado; o servidor não importa o cliente, ADR 0004).
- **`useMesa` com 3 declarações** em `mesa/ui/useMesa.tsx:7-9`: são as sobrecargas do hook, não cópia.
- **`resultadoPublicado` entre `arremesso/index.ts:14` e `store.ts:19`**, **`presimulate`**: o `plays` do `arremesso` repete a escolha de efeito do `pressagios` **de propósito**, com teste de equivalência (mapa, linha do `pressagios`).
- **Testes que redefinem `dot`, `dist`, `unit`** (`dados/tests/polyhedra.test.ts:7`, `arremesso/tests/vortex.test.ts:6-7`, `world.test.ts:6`, `meus-dados/tests/importador.test.ts:10`): teste independente da implementação é desejável.

---

## 4. Observações (não são limpeza, mas o João vai querer saber)

Achadas no caminho. Não propus corrigir; cada uma muda efeito e precisa de decisão e olho humano.

- **O-1. Movimento reduzido provavelmente não desliga o tremor nas faixas.** `index.css:378` põe `animation:none` em `.app[data-movimento="reduzido"] header.controls` e `footer.status` (especificidade 0,3,1), mas a regra que liga o tremor, `index.css:371`, é `.app:has(.game-area[data-omen="fumble"]) header.controls` (0,4,1, porque `:has()` conta o argumento). A de 0,4,1 vence, então o `tremor` roda mesmo com movimento reduzido. As regras de `index.css:349-353` perdem pelo mesmo motivo. Só o `output strong` está coberto por E2E (`hud.spec.ts:64`). Está no bloco da OS-0061 e perto do que a OS-0062 mexe: avisar quem está nela. Prova: `sed -n '349,353p;371,371p;378p' src/index.css`.
- **O-2. As entradas de texto do livro talvez estejam com o estilo errado.** `.import input:not([type="checkbox"])…` (l.130, especificidade 0,5,1) vence `.livro > aside input` (l.206-208, 0,1,2) nos três painéis que têm a classe `import` (mesa, meus dados, importar). Resultado: fundo escuro `#1E1517`, borda inteira e `color: var(--chalk)` do painel antigo dentro do pergaminho, no lugar do input "sublinhado" que o livro define. Só o chat (que não é `.import`) usa o estilo do livro. Pode ser intencional (as telas passaram nos aceites), então fica como pergunta: **o João vê campo escuro no pergaminho?** Se sim, é defeito de especificidade, não sobra.
- **O-3. `docs/hud-imersivo.md:124`** cita `useMovimentoReduzido` como a leitura da casca; o código não usa (ver 1.2).

---

## 5. O que sugiro virar ordem (por ganho e risco)

Não é decisão minha. Em ordem de "mais fácil e mais seguro" para "mais estrutural":

1. **CSS morto do chat e do importador antigo** (1.1: l.55, 108-111, 237-238 ou 154-155, 22, 121, 152 e a parte dos `.selection`): um commit só em `index.css`, depois de a OS-0062 fechar, com captura de tela dos 4 capítulos antes e depois.
2. **Bloco `.chat` antigo e `.panel` nos asides** (1.1: l.98-104, 115, e o `panel` do `className`): ordem à parte, porque toca os fixtures dos testes de 3 módulos.
3. **`useMovimentoReduzido`, `stockPoly`, `TextoDoPainel`, os 24 `export` só internos** (1.2).
4. **Portas** (1.4): uma ordem por módulo, começando por `mesa` e `arremesso` (a maior fatia).
5. **E2E** (2.1): `e2e/esperas.ts` com as quatro esperas.
6. **Álgebra de `Vec3` e `clamp01`** (2.2) e **`corposVivos` no `arremesso`**: precisam de decisão de ADR 0008 e de rodar todos os testes de geometria e física.

---

## Anexo A. Exports usados só dentro do próprio arquivo (sem consumidor em nenhum outro arquivo)

`server/src/modules/historico/repository.ts:9` `RollDoc` · `arremesso/contracts.ts:38` `HandMotion` · `arremesso/domain/settle.ts:6` `SettleState` · `arremesso/domain/vortex.ts:39` `Orbit`, `:54` `Whirl` · `arremesso/domain/world.ts:24` `Box` · `dados/domain/modelo.ts:22` `forgetModel` · `mesa/domain/importacao.ts:5` `MesaImportada` · `mesa/domain/luz.ts:3` `LuzDaMesa` · `mesa/domain/tableBuild.ts:15` `PLACEHOLDER` · `mesa/domain/tableTheme.ts:8` `PanoramaFormat`, `:40` `isHex` · `pressagios/domain/krakenMotion.ts:14` `FAR` · `pressagios/domain/luz.ts:25` `COR_DUALIDADE` · `pressagios/scene/Kraken.ts:15` `SHARD_DEFAULT` · `vitrine/contracts.ts:14` `DestaqueInspecionado`, `:15` `BrilhoInspecionado` · `vitrine/domain/highlight.ts:11` `Highlight` · `vitrine/domain/inkGlow.ts:8` `UP_INK` · `vitrine/domain/showcase.ts:6` `View` · `shared/db.ts:4` `Store` · `shared/events.ts:3` `Signal`. (`TextoDoPainel` e `useMovimentoReduzido`, sem nenhum uso, estão em 1.2.)

Comando para repetir qualquer um deles: `rg -nw <nome> src server/src tests e2e`.

## Anexo B. Re-exports de porta sem consumidor fora do módulo

Critério: o nome não aparece em nenhum arquivo fora de `src/modules/<m>/`, e nenhum teste de dentro do módulo importa pela porta. Repetir: `rg -nw <nome> src server/src tests e2e` e ver que todos os arquivos são do próprio módulo.

- **mesa/index.ts:** `MesaImportada`, `MesaInspecionada`, `PresetName`, `TableState`, `TableError`, `clampBlur`, `clampDim`, `clampIntensity`, `clampPanoramaBlur`, `clampRotation`, `clampTile`, `fileSafe`, `PRESETS`, `panoramaPicture`, `panoramaTexture`, `preparePanorama`, `reduceImage`, `colorsOf`, `disposeTable`, `carregarArquivoDeMesa`; **mesa/cena.ts:** `useMesa`.
- **arremesso/index.ts:** `ChargeMode`, `GestureEvent`, `GestureState`, `HandMotion`, `Launch`, `Recording`, `RollResponse`, `UltimoLancamento`, `initialGesture`, `MATERIAL`, `BIAS_BUDGET`, `newWhirl`, `ORBITS`, `restingPlaces`, `spinAngle`, `stepWhirl`, `criarWorkerDePresimulacao`.
- **vitrine/index.ts:** `BrilhoInspecionado`, `DestaqueInspecionado`, `EstadoDaVitrine`, `TextoDoPainel`, `VitrineInspecionada`, `View`, `Highlight`, `UP_INK`; **vitrine/cena.ts:** `useVitrine`.
- **pressagios/index.ts:** `EstadoDoPresagio`, `MovimentoNoPresagio`, `PlanoDoPresagio`, `PresagioInspecionado`, `DUALITY_HIT`, `OMEN_TESTS`; **pressagios/cena.ts:** `SHARD_DEFAULT`.
- **dados/index.ts:** `AparenciaDaGema`, `Face`, `Label`, `RotuloNaCena`, `SymbolName`.
- **selecao/index.ts:** `LeituraDaNotacao`, `SelecaoAlterada`.
- **meus-dados/index.ts:** `DadoInspecionado`; **meus-dados/cena.ts:** `useMeusDados`.

Também sem consumidor fora do módulo, mas com teste do próprio módulo que passa pela porta (por isso fora da lista acima): `arremesso` (`setAim`, `setForce`, `setChargeMode`, `bodyStates`, `toKinematic`, `clampTarget`, `vortexCenter`, `vortexRadius`, `VORTEX`, `HAND`, `ResultadoPublicado`), `mesa` (`Background`, `DEFAULT_THEME`, `TableTheme`, `temaDaMesaImportada`), `meus-dados` (`excluir`, `montarDado`, `salvar`, `tintaPermitida`, `PedidoDeMontagem`), `pressagios` (`fireAt`, `fireIndices`, `fireReach`, `fractureCells`, `krakenAt`, `krakenIndices`, `stormIndices`, `trayBrokenAt`, `planoDoPresagio`), `selecao` (`remover`), `vitrine` (`CAPTION`, `HL_SIZE`, `SHOW`, `glowMesh`, `highlightAt`, `showcasePoses`, `setShowcased`), `dados` (`INK_COLORS`), `selecao` (`SelecaoAlterada` é tipo). Essas só saem da porta se o teste passar a importar do arquivo interno.
