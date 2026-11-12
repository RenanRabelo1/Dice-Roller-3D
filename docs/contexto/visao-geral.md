# Visão geral

Rolador de dados 3D no navegador. O jogador escolhe dados (botões ou chat com notação `2d10 + d100`), mira com o mouse/setas, segura para carregar a força e solta. A física (Rapier) decide o resultado; os dados voam até a câmera e mostram a face sorteada. Críticos/falhas de d20 e d100 disparam "presságios" (animações) antes do resultado. UI em pt-BR. Sem backend, sem rede em tempo de execução.

## Stack

| Peça | Versão | Papel |
|---|---|---|
| React + react-dom | 19 | UI HTML (`src/ui/`) e casca |
| three | 0.187 | 3D |
| @react-three/fiber / drei | 9 / 10 | cena declarativa, `Environment`, `PerformanceMonitor` |
| @react-three/rapier | 2.2 | física na cena (Rapier 0.19.2 por baixo) |
| @dimforge/rapier3d-compat | **0.19.2 fixo** (dev) | física offline (pré-simulação, worker, testes Node) |
| troika-three-text | 0.52.5 fixo | numerais nas faces (`BatchedText`) e números em destaque |
| zustand | 5 | store único (`src/store.ts`) |
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
```

Gate de entrega usado no projeto: build → lint → test → e2e, todos verdes.

## Árvore

```
src/
  indexedDb.ts             abre o IndexedDB `dice-roller` v2 (dados importados + mesas)
  main.tsx, App.tsx        casca: <Controls/> + <Canvas><Stage/></Canvas> + <OmenOverlay/>
  failure.ts               sonda WebGL e falhas de renderer/física → `store.error`  → armadilhas.md
  store.ts                 zustand: seleção, fase, throwId, launch, results, omen  → arremesso.md
  testHook.ts              window.__dice (só em mode=test)                          → testes.md
  dice/                    domínio puro dos dados (sem React)                       → dados.md
    polyhedra.ts             tipos, geometria, numeração, rótulos, `fromTriangles`
    custom.ts                tipo `CustomDie` + registro em memória dos dados importados
    customStore.ts           IndexedDB store `customDice`
    importer.ts              .stl/.glb → poliedro (detecção, sólido ideal, calibração)
    read.ts                  face de cima → valor; raw → resultado
    notation.ts              parser/formatador "2d10 + d100", texto do painel
    omen.ts                  regra de crítico/falha e duração dos presságios
    symbols.ts               desenhos vetoriais (ankh, caveira, presas, cara, coroa)
  throw/                   lógica pura do arremesso                                 → arremesso.md
    gesture.ts               máquina de fases (reducer)
    aim.ts                   mira, carga, velocidade, giro com semente
    settle.ts                quando os dados "pararam"
  physics/                 Rapier fora da cena                                      → arremesso.md
    world.ts                 constantes (bandeja, materiais, mão) e geometria da mão
    apply.ts                 único lugar que muda tipo/velocidade/pose de corpo
    presim.ts                simula o arremesso inteiro offline e grava os quadros
    presim.worker.ts         roda presim fora da thread de render
  scene/                   componentes R3F
    Stage.tsx                raiz da cena, ThrowLoop (replay), câmera, DPR, test hook
    Hand.tsx                 input, mão, retorno, showcase pós-resultado             → apresentacao.md
    Die.tsx, Tray.tsx        corpo+malha de cada dado; bandeja (visual do tema da mesa)
    table*.ts, Backdrop.tsx  mesa e fundo personalizados, .glb                      → mesa.md
    showcase.ts, highlight.ts poses e linha do tempo do "voo até a câmera"         → apresentacao.md
    Omens.tsx, Kraken.ts, krakenMotion.ts  presságios 3D                            → apresentacao.md
  ui/                      HTML: Controls (seleção + painel), Chat, OmenOverlay, ImportDie (assistente, carregado sob demanda),
                           TablePanel (mesa e fundo), Safeguard (mensagens de falha de WebGL/renderer/física)
tests/                     Vitest (unidades puras + física Node); helpers/sim.ts
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
| fase | `hand → charging → rolling → settled → returning → hand` (`throw/gesture.ts`) |
| `throwId` | contador que invalida tudo que é de um arremesso/seleção anterior |
| `Launch` | snapshot imutável do arremesso (semente, alvo, força, pose/giro da mão) |
| `raw` | valor físico da face de cima (dígito 0–9 do d10, vértice do d4, 1/2 da moeda) |
| `results` | valor para o jogador (`toResults`: d10 0 → 10) |
| presságio (`omen`) | animação de crítico/falha/dualidade antes do resultado aparecer |
| showcase | os dados voam até a frente da câmera mostrando a face sorteada |
| Cara/Coroa | moeda: 1 = cara (tampa de cima), 2 = coroa |
