# Visão geral

Rolador de dados 3D no navegador. O jogador escolhe dados (botões ou chat com notação `2d10 + d100`), mira com o mouse/setas, segura para carregar a força e solta. A física (Rapier) decide o resultado; os dados voam até a câmera e mostram a face sorteada. Críticos/falhas de d20 e d100 disparam "presságios" (animações) antes do resultado. UI em pt-BR. O jogo roda sem rede; se o build tiver `VITE_API_URL`, cada resultado é enviado (sem esperar resposta) à API de histórico em `server/`.

## Stack

| Peça | Versão | Papel |
|---|---|---|
| React + react-dom | 19 | UI HTML (componentes dos módulos, compostos pelo `Painel` da casca) e casca |
| three | 0.187 | 3D |
| @react-three/fiber / drei | 9 / 10 | cena declarativa, `Environment`, `PerformanceMonitor` |
| @react-three/rapier | 2.2 | física na cena (Rapier 0.19.2 por baixo) |
| @dimforge/rapier3d-compat | **0.19.2 fixo** (dev) | física offline (pré-simulação, worker, testes Node) |
| troika-three-text | 0.52.5 fixo | numerais nas faces (`BatchedText`) e números em destaque |
| zustand | 5 | um store vanilla por módulo (`src/modules/<m>/store.ts`) |
| Vite 8 / TypeScript 7 / oxlint | — | build e lint |
| Vitest 4.1 / Playwright 1.65 | fixos | unit (Node) / E2E (Chrome + SwiftShader) |

Node local: 24.x. Fonte local em `public/fonts/` (Bricolage Grotesque, OFL).

## Comandos

```bash
npm run dev        # Vite
npm run build      # tsc -b && vite build  (tsc cobre src, tests e e2e)
npm run lint       # oxlint
npm test           # vitest run  (tests/**/*.test.ts, ambiente Node, inclui física real)
npm run e2e        # playwright test (sobe `npm run dev:test` em 127.0.0.1:5179)
cd server && npm test   # API do histórico (Fastify + MongoDB em memória)
```

Gate de entrega usado no projeto: build → lint → test → e2e, todos verdes.

## Árvore

```
src/
  shared/db.ts             abre o IndexedDB `dice-roller` v2; cada dono declara a sua store (`defineStore`)
  main.tsx, App.tsx        casca: <Painel/> + <Canvas><Cena/></Canvas> + <OverlayDoPresagio/> (de `pressagios`)
  shared/plataforma/       falha registrada (`registrarFalha`), `Guard`, `Failure`, sonda WebGL, renderizador por software, movimento reduzido (`movimentoReduzido`, evento de mudança)  → armadilhas.md
  app/                     casca: a cena, o window.__dice e o Painel (`app/Painel.tsx`: cabeçalho com os componentes de selecao, Meus dados e o painel da mesa; rodapé com o do arremesso e o painel do resultado, da vitrine)
    Cena.tsx                 raiz da cena (compõe os componentes dos módulos), câmera, DPR, test hook
    testHook.ts              window.__dice (só em mode=test)                        → testes.md
  modules/regras/          regras do jogo, puras, compartilhadas com server/        → modules/regras/CLAUDE.md
  modules/historico/       assina o resultado publicado e envia cada um à API (só com VITE_API_URL)        → server/src/modules/historico/CLAUDE.md
  modules/dados/           sólidos, catálogo (registro dos importados), leitura, símbolos, tinta, aparência; `index.ts` puro, `cena.ts` com componentes e hooks  → dados.md
  modules/selecao/         a mão (store vanilla), notação e apelido, chat e botões de dado; `index.ts` puro, `cena.ts` com hook e componentes  → modules/selecao/CLAUDE.md
  modules/meus-dados/      os dados do jogador: lista e `sessionOnly` (store vanilla), gravação (`repository.ts`, store `customDice`), importador (`domain/importador.ts`, .stl/.glb → poliedro, sob demanda por `carregarImportador`), `montarDado`; `cena.ts` com `useMeusDados`, `InkChoice` e o `AssistenteDeImportacao` (lazy)  → dados.md
  modules/mesa/            mesa e fundo: tema, texturas, panorama, mesa padrão, `.glb` (`domain/tableFile.ts`, sob demanda por `carregarArquivoDeMesa`), gravação (`repository.ts`, store `tables`, `mesa.ativa`), estado (store vanilla, `mesa()`, `coresDaMesa()`), `ocultarPiso`; `cena.ts` com `useMesa`, `MesaNaCena` (a bandeja visível), `AmbienteDaMesa` (cor de fundo, panorama, mapa de reflexo), `FundoCss` (foto, tema pronto) e `PainelDaMesa` (o painel "Personalizar mesa")  → modules/mesa/CLAUDE.md
  modules/arremesso/       arremesso: domínio, store, laço, corpos e seu registro, colisores, a mão (`MaoDoArremesso`) e o rodapé (modo de rolagem, força, dica); `index.ts` puro, com `criarWorkerDePresimulacao`  → modules/arremesso/CLAUDE.md
    domain/gesture.ts        máquina de fases (reducer)
    domain/aim.ts            mira, carga, velocidade, giro com semente
    domain/settle.ts         quando os dados "pararam"
    domain/vortex.ts         redemoinho dos dados na mão
    domain/world.ts          constantes (bandeja, materiais, mão) e geometria da mão
    domain/apply.ts          único lugar que muda tipo/velocidade/pose de corpo
    domain/presim.ts         simula o arremesso inteiro offline e grava os quadros (Rapier fora da cena)
    domain/presim.worker.ts  roda presim fora da thread de render
    domain/vies.ts           `plays`: se um resultado toca o presságio do botão de teste
  modules/pressagios/      presságios: o estado (store vanilla, `presagio()`, `presagioTocando()`, decidido em `resultadoPublicado`), a duração (`domain/omen.ts`), os botões de teste (`domain/omenTest.ts`) e o movimento do kraken, da tempestade e do fogo (`domain/krakenMotion.ts`, `domain/fireMotion.ts`), que efeito em que dado (`domain/plano.ts`) e o percurso do d100 (`domain/percurso.ts`); `cena.ts` com `usePresagio`, `usePresagioTocando`, `PresagiosNaCena` e `QuebraDaMesa` (em `scene/`, com `Kraken.ts` e `Fire.ts`), `OverlayDoPresagio` (com `ui/presagios.css`) e `BotoesDeTeste` (em `ui/`); `inspecao` para o test hook  → src/modules/pressagios/CLAUDE.md
  modules/vitrine/         vitrine: poses do voo (`domain/showcase.ts`), destaque (`domain/highlight.ts`), gravação acesa (`domain/inkGlow.ts`), texto do painel (`domain/painel.ts`, `resultText`), o estado `showcased` (store vanilla, `vitrine()`, `vitrineConcluida()`), `inspecao` para o test hook; `cena.ts` com `useVitrine`, `Vitrine` (a cena em `settled`: voo, números, gravação acesa; em `scene/`) e `PainelDoResultado`  → src/modules/vitrine/CLAUDE.md
tests/                     Vitest (unidades puras + física Node); helpers/sim.ts
server/                    API do histórico (Fastify + MongoDB; usa `src/modules/regras` pelo `index.ts`, roda em Node com TS nativo)
e2e/                       Playwright; usa window.__dice
references/threejs/        exemplos oficiais do three.js (só leitura, ver CLAUDE.md)
docs/superpowers/          specs (as de 2026-11-11 são as atuais) e planos/revisões HISTÓRICOS (ver armadilhas.md)
docs/backlog.md            features combinadas e o link para a spec de cada uma
docs/performance-coins.md  diagnóstico de desempenho com várias moedas
```

## Glossário

| Termo | Significado |
|---|---|
| `DieKind` | tipo escolhível: `BuiltinKind` (`d4 d6 d8 d10 d12 d20 d100 vtm hunger fire coin`) ou `custom:<uuid>` (dado importado) |
| `Shape` | corpo físico real; `baseOf(kind)` mapeia kind → shape (`vtm`/`hunger` → d10, `fire` → d6, importado → a base reconhecida) |
| fase | `hand → charging → rolling → settled → returning → hand` (`modules/arremesso/domain/gesture.ts`) |
| `throwId` | contador que invalida tudo que é de um arremesso/seleção anterior |
| `Launch` | snapshot imutável do arremesso (semente, alvo, força, pose/giro da mão) |
| `raw` | valor físico da face de cima (dígito 0–9 do d10, vértice do d4, 1/2 da moeda) |
| `results` | valor para o jogador (`toResults`: d10 0 → 10) |
| presságio (`omen`) | animação de crítico/falha/dualidade antes do resultado aparecer |
| showcase | os dados voam até a frente da câmera mostrando a face sorteada |
| Cara/Coroa | moeda: 1 = cara (tampa de cima), 2 = coroa |
