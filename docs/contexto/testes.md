# Testes

## Unitários — Vitest (`npm test`)

- `tests/**/*.test.ts` e `src/**/tests/**/*.test.ts`, ambiente **Node**, timeout 10 s (`vite.config.ts`).
- Onde fica cada teste (ADR 0007, ponto 9): o unitário de um módulo mora em `src/<...>/tests/` e só importa o próprio módulo (o primeiro é `src/shared/tests/events.test.ts`). O `tests/` da raiz fica para o que atravessa módulos: física de ponta a ponta, rede de segurança e arquitetura. Os testes de `src/` são checados pelo `tsconfig.test.json` (tipos do Node); o `tsconfig.app.json` os exclui, e o `tsc -b` do build roda os dois.
- Cobrem os módulos puros e a física real: `aim`, `gesture`, `settle`, `world`, `polyhedra`, `read`, `notation`, `omen`, `symbols`, `highlight`, `showcase`, `kraken`, `fire`, `vortex`, `history`, `store`, `physics`, `importer`, `custom`, `table`.
- A API tem sua própria suíte: `npm run test:server` (typecheck + `vitest` em `server/`; Fastify de verdade num MongoDB em memória via `mongodb-memory-server`). Precisa de `npm install` em `server/` uma vez.
- `tests/helpers/sim.ts`:
  - `initRapier()` — inicializa `rapier3d-compat` uma vez e silencia o aviso de depreciação conhecido do wasm-bindgen.
  - `models.ts`: `modelTriangles` (sólido nosso, chanfrado, girado e deslocado como um export de fatiador), `stl`, `glb`, `subdivided`, `customDieOf` (dado importado registrado).
  - `simulate({ kind|dice, count, force, target, seed, perturb? })` — roda o **mesmo** `presimulate` do app a partir das poses da mão. Use para testes de física (determinismo, fuga, timeout, seleção mista).
- Teste novo de lógica pura: arquivo `src/<...>/tests/<x>.test.ts`, dentro do módulo, sem fixtures nem mocks de three. Os que hoje estão em `tests/` migram na extração de cada módulo.
- O `server/vitest.config.ts` inclui só `src/**/tests/**/*.test.ts`. A suíte da API mora em `server/src/modules/historico/tests/api.test.ts`.

## Arquitetura — `tests/arquitetura/` (dentro do `npm test`)

Imports e ciclos (regras 1 e 4 do guia, ADR 0006 parte A) e dono dos dados (regra 2, parte B, abaixo). O leitor é nosso (ADR 0009), sem `dependency-cruiser`: o `parseSync` do `@swc/core` lê cada `.ts`/`.tsx` de `src/` e `server/src`. A suíte leva menos de 1 s.

- `leitor.ts`: arestas de `import`/`export … from` (só `import type`/`export type` contam como tipo, por causa do `verbatimModuleSyntax`), `import()` com string literal e `new URL('./x', import.meta.url)` (o worker). Resolve caminho relativo com ou sem extensão e `index.ts`/`index.tsx` de pasta, e só guarda destinos `.ts`/`.tsx` (css e imagem são ignorados). **Derrubam a suíte:** import relativo que não resolve, import com grafia diferente da do disco (o Windows aceita, o Linux não), caminho absoluto `/src/...` e `import()` sem string literal. Hoje não há alias de `paths` no tsconfig; se aparecer, o leitor precisa recusá-lo também.
- `leitor.test.ts`: prova as quatro arestas reais (estático, `import type` de `dados/domain/leitura.ts`, `import()` do `AssistenteDeImportacao` em `meus-dados/cena.ts`, o worker de `app/Cena.tsx`) e, em `fixtures/leitor/`, cada recusa acima e o `new URL` de não-código.
- Ciclos são procurados em `src/` e em `server/src` (e entre os dois).
- `regras.ts` + `imports.test.ts`, sobre o código real:
  - **ciclos** (Tarjan, contando tipo, dinâmico e worker) em dois níveis: `arquivo` e `pasta` (unidade = `src/modules/<m>`, `src/<pasta>` ou arquivo da raiz de `src/`; no servidor, `server/src/modules/<m>`, `server/src/<pasta>` ou arquivo da raiz de `server/src`);
  - `src/shared/**` não importa nada de `src/` fora de `src/shared/`;
  - de outro módulo, só as portas: `index.ts` (pura), `cena.ts` (componentes e hooks React/R3F, ADR 0010) ou `contracts.ts` com `import type`; o fecho do `index.ts` de cada módulo (os arquivos do próprio módulo que ele alcança, `import()` incluído; `import type` não conta) não importa `react` nem `@react-three/*` (`indexSemReact`, ADR 0010); módulo não importa a casca (`src/main.tsx`, `src/App.tsx`, `src/app/**`); dentro de `src/`, um arquivo de `src/modules/<m>/**` (testes incluídos) só importa o próprio módulo, a porta de outro módulo e `src/shared/**`: um arquivo fora dos módulos e de `src/shared` (hoje, a casca) falha (`moduloSemLegado`); `src/modules/regras/**` não importa pacote nem arquivo fora dele (ADR 0002);
  - `server/**` → `src/**` só para os arquivos de `SERVIDOR_PODE_IMPORTAR`; `src/**` → `server/**` só `import type` de `server/src/modules/<m>/contracts.ts`. Dentro do `server/`, o `routes.ts` de um módulo só importa o próprio `service.ts`/`contracts.ts`/`repository.ts` ou algo de `server/src/shared/`, e `mongodb` só é importado por `repository.ts` e `server/src/shared/db.ts` (arquivos em `server/src/**/tests/` também podem, para montar o banco de teste).
- **Os testes da raiz também passam pela porta única** (`testesDaRaizPelasPortas`). A regra lê `tests/` sem `tests/arquitetura/` (`RAIZES_TESTES_DA_RAIZ` e `FORA_DOS_TESTES_DA_RAIZ`), ou seja, `tests/*.ts` e `tests/helpers/**`, e exige que o import de `src/modules/<m>/` vá só por `index.ts`, `cena.ts` ou `contracts.ts` com `import type`. Um `store.ts` ou outro arquivo interno falha. Os testes dentro dos módulos (`src/modules/<m>/tests/`) são do próprio módulo e ficam de fora. A base é a regra 1 do guia e o ADR 0006. A fixture é `fixtures/testes/`. **Heurística:** a regra lê só as arestas do leitor, então não vê `vi.mock`/`vi.doMock`/`vi.importActual` com caminho de módulo nem import de arquivo interno de `server/src/modules/<m>/`; a revisão confere.
- **Nenhuma porta reexporta o store cru** (`storeCruNaPorta`, ADR 0003 ponto 2, ADR 0006). O `index.ts` e o `cena.ts` de `src/modules/<m>/` não reexportam a ligação `store` de `./store.ts`: nem `export { store }`, nem com outro nome (`export { store as x }`), nem `export *` (ou `export * as x`) de `./store.ts`, nem um nome importado dele como `store` (ou como namespace) e exportado de novo. Reexportar as funções do store e usar o store dentro de uma função da porta passam. É heurística na AST: lê só o nível de cima da porta, e `export const x = store` fica para a revisão. A fixture é `fixtures/store-cru/`.
- As regras de módulo valem antes de existir módulo: `fixtures/modulos/` é uma árvore mínima (`src/`, `server/`) que viola cada regra uma vez, e o teste confere que cada uma dispara. Os fixtures são checados pelo `tsc -b` (`tsconfig.test.json`); os que não compilam de propósito (import quebrado, caminho absoluto, grafia) usam `// @ts-nocheck`.
- Falha sai como `[regra] origem → destino (regra do guia / ADR)`.

**Exceções** só em `tests/arquitetura/config.ts`, cada uma com o ADR ou a linha do plano ao lado. As duas listas de exceção, `CICLOS_CONHECIDOS` e `DADOS_LEGADO`, estão vazias desde a OS-0049 (fase 7); o mecanismo fica para uma exceção futura com ADR, e um teste confere que as duas são `[]`. As permissões definitivas são `SERVIDOR_PODE_IMPORTAR` (desde a OS-0014, só `src/modules/regras/index.ts`: é a permissão definitiva dos ADRs 0002/0004, não uma exceção que some), e `REGRAS_TESTES_PODEM_IMPORTAR` (`vitest` nos testes do próprio módulo, ADR 0007 ponto 9).

### Dono dos dados (`donos.ts` + `dados.test.ts`)

Regra 2 do guia (ADR 0006 parte B; ADR 0003 pontos 2 e 5). Varre só produção: `src/` e `server/src`, sem nenhuma pasta `tests/`. Lê cada arquivo pela AST do `@swc/core`, como o leitor de imports.

- **Fonte única:** os donos vêm do bloco ` ```json donos-dos-dados ` de `docs/mapa-modulos.md` (`MAPA_DE_DONOS`). Se o bloco faltar, o JSON for inválido ou faltar um dos grupos `indexedDB`, `localStorage` ou `mongodb`, a suíte falha com `[fonte única] …`.
- **Dado novo:** acrescente-o ao bloco do mapa, no grupo certo, como `"<nome>": "<módulo dono>"`, no mesmo commit do código. Depois disso:
  - uma store do IndexedDB é definida com `defineStore('<nome>')`, com string literal, uma única vez e dentro de `src/modules/<dono>/`;
  - uma chave do `localStorage`/`sessionStorage` só é usada em `src/modules/<dono>/repository.ts`, e o literal da chave aparece nesse arquivo;
  - uma coleção do MongoDB é acessada só em `server/src/modules/<dono>/repository.ts` ou em `server/src/shared/db.ts`.
- **O que falha:**
  - `indexedDB` fora de `src/shared/db.ts`;
  - `defineStore` com nome fora do bloco, sem string literal, fora do módulo dono, ou o mesmo nome definido mais de uma vez (ou nenhuma);
  - um arquivo que usa `localStorage`/`sessionStorage` sem nenhum literal de chave do bloco, ou com `getItem`/`setItem`/`removeItem` de uma chave literal que não está no bloco ("chave não declarada no mapa");
  - uma coleção fora do bloco ou fora do lugar. Contam como acesso `.collection`, `.createCollection` e `.dropCollection` (o primeiro argumento), `listCollections({ name })` e `command({ collMod | create | drop })`;
  - um `$lookup`/`$graphLookup` cujo `from` é de outro dono (join entre domínios);
  - um store do zustand criado fora de `src/modules/<m>/store.ts` e de `src/shared/plataforma/falha.ts`. Contam o `create` e o `createStore` de `zustand` e o `createStore` de `zustand/vanilla`, com outro nome ou por namespace também. A permissão de `falha.ts` (o store privado da falha da plataforma, ADR 0008) está na própria regra, nomeada, e não em `DADOS_LEGADO`.
- A falha sai como `[regra] arquivo: dado (dono esperado: …; ADR)`.
- **Exceções:** ficam em `DADOS_LEGADO` (`config.ts`), no formato `{ arquivo, dado, motivo }`. É uma por arquivo e por dado, e cobre todas as regras que aquele arquivo quebra com aquele dado. O `dado` é o nome da store, da chave ou da coleção, ou então `indexedDB`/`zustand` para a API crua. O motivo cita o ADR ou o plano. Hoje a lista está vazia. Como em `CICLOS_CONHECIDOS`, a suíte também falha com uma exceção sem uso ou repetida. Tire a entrada no mesmo commit que moveu o acesso.
- **Heurística** (ADR 0006: "pega o caso comum"). O teste procura padrões na AST. Ele não segue um nome que vem de variável de outro arquivo, um acesso por função de outro módulo nem um global renomeado. Também não vê o `createWithEqualityFn` de `zustand/traditional` (vê `create` e `createStore`) nem `$unionWith` no MongoDB (só `$lookup`/`$graphLookup`). A regra "nenhum `index.ts` reexporta o store cru" (ADR 0003 ponto 2, ADR 0006) é a `storeCruNaPorta`, na parte de imports, acima. A revisão continua obrigatória.
- `fixtures/dados/` tem o próprio `mapa.md` e viola cada regra uma vez. O teste recebe a raiz e o bloco por parâmetro.

**Ciclo conhecido:** a entrada é `{ nivel, membros, motivo }`, e `membros` é o componente fortemente conexo inteiro, em ordem alfabética (a mensagem de falha mostra um caminho do ciclo). O teste falha nos dois sentidos: ciclo fora da lista (desfaça; só acrescente com motivo citando a tabela "Ciclos de hoje" do `docs/mapa-modulos.md` ou o `docs/plano-refatoracao.md` §8) e ciclo da lista que não existe mais (tire a entrada no mesmo commit que o desfez). Se o componente cresce ou encolhe, a entrada muda junto.

## E2E — Playwright (`npm run e2e`)

- `playwright.config.ts`: Chrome instalado (`channel: 'chrome'`), WebGL por software (`--use-gl=angle --use-angle=swiftshader`), 1440×900, `workers: 1`, timeout 120 s.
- Sobe `npm run dev:test` (Vite em `--mode test`, 127.0.0.1:5179, porta fixa). Não reusa servidor existente (nem o stub abaixo).
- Sobe também `node e2e/api-stub.mjs` (127.0.0.1:5180): um stub da API do histórico que responde 204 a tudo, com CORS e preflight `OPTIONS`. O Vite de teste recebe `VITE_API_URL=http://127.0.0.1:5180`, então o build de teste envia o histórico (`src/modules/historico/`) e um POST que nenhum teste intercepta não gera erro de console (um 404 ou um endereço morto gerariam, e vários specs exigem console limpo). `history.spec` intercepta `http://127.0.0.1:5180/rolls` com `page.route`.
- Em `mode === 'test'` o canvas usa `preserveDrawingBuffer` e o app expõe `window.__dice` (tipo em `src/app/testHook.ts`, instalado em `app/Cena.tsx`). `labels`, `numbersVisible` e `gemLook` chamam a `inspecao` de `dados` (`rotulos`, `numeraisVisiveis`, `aparenciaDaGema`, em `src/modules/dados/domain/inspecao.ts`). `bodies` e `launches` vêm de `inspecao().corpos()` e `.lancamentos()` do `arremesso`, e `ready` e `previewSurface` leem o `registroDeCorpos` dele.

### `window.__dice` (DiceHook)

| Método | Para quê |
|---|---|
| `table()` | mesa ativa lida da cena: id, nome, fundo (incl. `panorama`), cores do feltro/madeira, textura, se há modelo, caixa da guia, nº de mesas salvas, `reflect` (fundo 360°) e `programs` (nº de programas de shader, para checar recompilação) |
| `shards()` | cores (feltro/madeira) do primeiro caco do kraken |
| `state()` | dice, phase, throwId, results, ready, error, aim, showcased, omen, omenDone, reducedMotion, omenTime, trayBroken, burning (fogo do d20 visível), force (carga agora ou do último arremesso) |
| `select(dice)` | troca a seleção sem clicar |
| `rigOmen(omen \| null)` | força o presságio dos próximos arremessos (a física e o resultado continuam reais) |
| `bodies()` / `meshes()` | poses dos corpos Rapier / quaternions das malhas `gem-i` |
| `labels(i)` | numerais do dado i em coordenadas de mundo (texto, valor, posição, normal) |
| `numbersVisible(i)`, `highlights()` | visibilidade dos numerais e dos números em destaque (texto, visível, posição) |
| `inkGlow(i)` | brilho da gravação de um dado de forma livre gravado no showcase: visível, triângulos, opacidade (`null` sem brilho) |
| `gemLook(i)` | malhas visíveis do dado i: tipo de material, opaco, pintado por vértice e a cor da primeira tinta (números pintados) |
| `camera()`, `launches()` | posição da câmera; contagem e poses antes/depois do último lançamento |
| `customs()` | dados importados: kind, id, nome, apelido, base, `printed` |
| `previewSurface(i, p, q)` | posiciona um dado à mão; só com `?surface-preview` e fase `hand` |

Depois de `page.emulateMedia({ reducedMotion })` com relógio simulado, **espere** `state().reducedMotion` antes de avançar o relógio: o evento do `matchMedia` chega assíncrono (ver `docs/superpowers/specs/2026-11-11-correcao-falhas-e2e.md`).

Padrão dos specs: esperar `state().ready`, interagir pelo teclado/ponteiro na `.game-area`, esperar `phase === 'settled'` e `showcased === throwId`, comparar `results` com o que os corpos/labels mostram. Para testar um valor específico (ex.: d100 = 1) os specs **procuram uma semente** que tire o valor na física real; não fabricam resultado.

### Arquivos

| Spec | Foco |
|---|---|
| `smoke` | contexto WebGL, canvas pinta, toda seleção cria corpos e numerais |
| `roll` | face de cima = resultado publicado, Espaço, d100×10, seleção mista, d4/d8/d6 Fogo ×3 (o d4 lê o numeral mais alto), captura de ponteiro, blur, reduced motion, moeda, modo de rolagem Relativa/Estática (carga e escolha lembrada) |
| `controls` | limites da mão (com 1 dado o "−" desabilitado; com 10, todos os "Adicionar …" do grupo Dados), `M` abre "Personalizar mesa" e `Esc` fecha (foco volta ao botão Mesa), `m`/`M` digitados no chat não abrem o painel |
| `chat` | tecla C, notação, Vampiro, bola de fogo, erro, moedas |
| `failure` | sem WebGL, falha do renderer e física que não carrega (simuladas por `addInitScript`): mensagem em pt-BR, sem canvas |
| `table` | fundo (tema/foto/cor), cores no pixel, ida-e-volta exportar→importar (M13), arquivo com escala/Z para cima/moldura invadindo, recusas, upgrade do IndexedDB v1→v2 |
| `table-kraken` | cacos com a cor do feltro da mesa; modelo sem piso some inteiro na quebra |
| `omen` / `kraken` | presságios forçados (raio, kraken que arremessa e busca o d100, fogo do d20, tempestade do d100), reduced motion, recolher durante presságio, bandeja quebrada/restaurada; os 5 botões de teste (dois arremessos reais caindo no presságio, e desligar com os dados na mão; **sensíveis à carga da máquina**: a busca por semente tem orçamento de tempo, `BIAS_BUDGET` 6000 ms no worker, e com a CPU ocupada por outros processos o arremesso sai comum e o caso falha com "nenhum arremesso com … em 6000 ms") |
| `import` | importar STL/GLB (gerados por `tests/helpers/models.ts` a partir dos nossos sólidos), calibrar, rolar, recarregar, excluir, recusas, 10 dados de ~48 mil triângulos |
| `coin` | repetição de jogadas da moeda, mobile; a moeda sobe e "Cara"/"Coroa" fica embaixo |
| `coin-performance` / `coin-software` | orçamento de quadros com 10 moedas, worker atrasado/falho, DPR no SwiftShader |
| `worker` | `Worker` da pré-simulação trocado por `addInitScript` por um que nunca responde: o cálculo local entra depois do `WORKER_TIMEOUT` (≥ 2 s, < 5 s entre o pedido e o `terminate`) e publica a face de cima. Com o pedido envenenado (o falso não clona; o cálculo local lança ao ler), caracteriza o comportamento **atual** da falha dupla (`docs/diagnostico.md` §10, item 1): `error: 'physics'`, mesma mão de volta com novo `throwId`, mensagem "Não foi possível carregar a física. Recarregue a página.", canvas removido e o rodapé dizendo "os dados voltaram para a mão. Tente jogar de novo." Quando esse caminho for corrigido, esse caso muda junto |
| `history` | histórico: 1 d20 gera exatamente um POST `{ playerId, dice, force }` quando o resultado é publicado; seleção mista na ordem de `dice` com os valores de `results`; mesmo `playerId` em dois arremessos e depois de recarregar; resposta 500 não afeta o jogo |

Os testes de desempenho têm orçamentos calibrados na máquina do autor (ver `docs/performance-coins.md`); falha só neles em outra máquina pode ser ambiente.

### Helpers comuns dos specs

As esperas e os atalhos repetidos ficam em `e2e/esperas.ts` (OS-0073): `ready`, `settled`, `throwWithSpace`, `advance`, `dice`, `panel` e o arquivo de upload. Variante que difere (timeout, tempo de tecla, retorno) fica no próprio spec.

### Conferir visual sem o painel do navegador do app

- **Painel escondido não serve para medir:** o Chrome não roda `ResizeObserver`, `IntersectionObserver` nem animação em página que não renderiza, então a medição ali engana.
- **Use um Chromium sem janela:** um script curto com `@playwright/test`, apontando o `executablePath` para o `chrome-headless-shell` instalado em `%LOCALAPPDATA%/ms-playwright`, contra o servidor de dev. Ele mede (`elementFromPoint`, `scrollWidth`, `getComputedStyle`) e tira captura.
- **Não é E2E:** não passa pelo `playwright.config` nem sobe servidor próprio.

## Gate antes de entregar

```bash
npm run build
npm run lint
npm test
npm run test:server
npm run e2e
```

## Rodar E2E sem atrapalhar outra rodada

O WebGL dos testes é por software (SwiftShader) e usa a CPU. Duas rodadas ao mesmo tempo dividem a máquina: os testes **funcionais** passam, só mais devagar; os de **desempenho** (`coin-performance`, `coin-software`) e qualquer medição de FPS falham ou distorcem. Rodadas completas e medições: uma por vez. Para rodar testes funcionais isolados em paralelo, use um config temporário em `temp/` (fora do git) que importa o `playwright.config.ts` e troca só a porta (`baseURL` e o `--port` do `webServer.command`), e rode com `-c temp/<arquivo>`. Com a máquina sobrecarregada aparecem falsos negativos típicos: timeout em `beforeEach` esperando `ready` e erro do `clock.pauseAt`.

Artefatos locais ignorados pelo Git: `test-results/`, `playwright-report/`, `screens/` (capturas e medições).

## `screens.spec.ts` (numerais na superfície)

Falhava em 7 casos por duas causas do teste, não do desenho: (1) contava pixels **dourados** em todos os dados, mas d10, d20 e d100 têm numeral **escuro** em gema clara (`numeralInk` em `src/modules/dados/domain/aparencia.ts`); agora conta tinta escura entre pixels claros da mesma linha para esses três; (2) a página `?surface-preview` herdava o DPR 0,35 do SwiftShader e a queda adaptativa de DPR, deixando o dado com poucos pixels. A prévia (só em `mode=test`) agora mantém a resolução real (`isPreview` em `app/Cena.tsx`). As margens são conferidas em px CSS.
