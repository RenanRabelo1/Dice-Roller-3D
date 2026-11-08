# DiceRoller 3D — Design

Data: 2026-11-08 · Status: aguardando revisão do usuário · Caminho do brainstorming: arquitetural

## 1. Objetivo

Peça de portfólio: um rolador de dados de RPG em 3D realista, rodando só local (sem deploy). O momento central é o arremesso: o jogador segura os dados, mira num recipiente, carrega a força e solta. O resultado sai da física de verdade, então mudar a mira e a força muda o resultado.

**Sucesso significa:**
- Arremessar d4 a d100, em quantidade de 1 a 10, e ler o resultado certo da face de cima.
- Dados que batem nas paredes, rolam e param de forma crível, com aparência de gema.
- Todos os gates da seção 7 verdes.

## 2. Entendimento

**O usuário disse:**
- Sistema de rolagem 3D, visual, para portfólio, testado localmente.
- Os dados ficam "na mão" e mexem junto com o mouse.
- Um vetor de mira com direção e intensidade, apontado para um recipiente; mudar o vetor dá a impressão de mudar o resultado.
- Arremesso realista: bater nas paredes do recipiente, rolar de verdade.
- Tipos de RPG de d4 a d100; escolher tipo e quantidade; o formato do dado muda com o tipo.
- React + Three.js; usar exemplos do site do Three.js como referência.
- Ordem: brainstorming → arquitetura → execução (ponytail, kernel, loop, superpowers) → loop de revisão até todos os testes passarem.

**Decisões tomadas no brainstorming (aprovadas):**
- Gesto: mirar com o mouse + segurar para carregar a força.
- Visual: dados de gema translúcidos sobre veludo escuro.
- Técnica: React Three Fiber + Rapier + refração por dado (`MeshTransmissionMaterial` do drei).
- Resultado lido da física (não sorteado antes).
- Um tipo de dado por arremesso; d100 = par de d10.
- O app 2D (`index.html`) é substituído pelo projeto React na mesma pasta; a versão 2D fica preservada no histórico do git.
- Repositório git local, sem remoto e sem push.

## 3. Experiência

### 3.1 Cena

- Câmera fixa do lado do jogador, inclinada cerca de 55°, enquadrando a bandeja inteira. Sem controle de órbita.
- Bandeja retangular de madeira escura com fundo de veludo vinho-escuro.
- Iluminação procedural com `Lightformer` do drei dentro de `<Environment>`: sem download de HDRI, funciona offline.

### 3.2 Dados

| Tipo | Forma | Gema | Números | Leitura |
| --- | --- | --- | --- | --- |
| d4 | tetraedro | esmeralda | cada face mostra os 3 números dos seus vértices, perto dos cantos | número do vértice de cima |
| d6 | cubo | rubi | 1–6, opostas somam 7 | face de cima |
| d8 | octaedro | safira | 1–8, opostas somam 9 | face de cima |
| d10 | trapezoedro pentagonal | topázio | 0–9 (0 vale 10), opostas somam 9 | face de cima |
| d12 | dodecaedro | ametista | 1–12, opostas somam 13 | face de cima |
| d20 | icosaedro | cristal claro | 1–20, opostas somam 21 | face de cima |
| d100 | 2 × trapezoedro pentagonal | citrino | um dado 00–90, outro 0–9 | dezenas + unidades; 00 + 0 = 100 |

- Números em dourado opaco, levemente afundados na face; 6 e 9 levam um ponto (`6.` `9.`) para não serem confundidos.
- Todos os tipos têm tamanho parecido (cerca de 1 unidade), como dados reais.

### 3.3 Mão, mira e arremesso

1. **Na mão:** os dados flutuam acima da borda próxima da bandeja, agrupados. Seguem o X do mouse com atraso de mola e giram conforme a velocidade do mouse: a face que sairia muda enquanto você mexe.
2. **Mirar:** o ponto do mouse projetado na mesa, limitado à área interna da bandeja, é o alvo. Uma seta sobre o veludo vai da mão até o alvo.
3. **Carregar:** segurar o botão do mouse, o toque ou a tecla Espaço. Uma barra de força oscila 0 → 100% → 0 (ciclo de ~1,4 s). A seta cresce e muda de cor com a força; a mão recua levemente.
4. **Soltar:** cada dado vira corpo dinâmico com velocidade = direção × força (com componente para cima, formando um arco) + giro aleatório com semente + o giro que já tinha na mão.
5. **Rolar:** os dados batem nas paredes e uns nos outros e param.

### 3.4 Resultado e recolher

- Quando todos os dados param, cada valor é lido (seção 4.4) e o painel mostra os valores e a soma.
- Clicar/tocar de novo (ou Espaço) com o resultado na tela faz os dados voltarem voando para a mão. Mudar tipo ou quantidade também recolhe.

### 3.5 Controles (HTML sobre o canvas)

- Seletor de tipo d4, d6, d8, d10, d12, d20, d100.
- Quantidade 1–10 com botões − e +.
- Barra de força (visível ao carregar).
- Painel de resultado com `aria-live="polite"`.
- Teclado: setas movem a mira, Espaço segura para carregar e solta para jogar. Foco visível em todos os controles.
- `prefers-reduced-motion`: sem balanço da mão; a física do arremesso continua (é o conteúdo).

## 4. Arquitetura

### 4.1 Stack (versões conferidas no npm em 2026-11-08)

| Pacote | Versão | Papel |
| --- | --- | --- |
| vite + template React TS | 8.3 | build e servidor local |
| react / react-dom | 19.3 | UI |
| @react-three/fiber | 9.8 | Three.js em React |
| three | 0.187 | renderização |
| @react-three/drei | 10.7 | `MeshTransmissionMaterial`, `Text`, `Environment`, `Lightformer`, `PerformanceMonitor`, `useFBO` |
| @react-three/rapier | 2.2 | física no React (usa Rapier 0.19.2) |
| @dimforge/rapier3d-compat | **0.19.2 fixo** | física nos testes em Node; mesma versão que o @react-three/rapier usa |
| zustand | 5.1 | estado |
| vitest | 5.1 | testes unitários e de física |
| @playwright/test | 1.65 | E2E com o Chrome já instalado (`channel: 'chrome'`, sem baixar navegador) |

### 4.2 Unidades

```
src/
  dice/polyhedra.ts   puro: vértices, faces, normais e números de cada dado
  dice/read.ts        puro: rotação → número de cima + inclinação; combina o par do d100
  throw/aim.ts        puro: alvo limitado à bandeja, oscilador de força,
                      velocidade de lançamento, giro com semente (determinístico)
  physics/world.ts    puro: dimensões da bandeja, gravidade, atrito, restituição,
                      pontos do casco convexo de cada dado — compartilhado pela cena e pelos testes
  store.ts            zustand: tipo, quantidade, fase, resultados, semente
  scene/Stage.tsx     câmera, ambiente, <Physics>, buffer de refração compartilhado
  scene/Tray.tsx      malhas da bandeja + colisores fixos (paredes + tampa invisível)
  scene/Die.tsx       corpo rígido + gema + números; cinemático na mão, dinâmico no arremesso
  scene/Hand.tsx      entrada (ponteiro/teclado) → mira, carga, arremesso; seta de mira
  ui/Controls.tsx     tipo, quantidade, barra de força, painel de resultado
  App.tsx, main.tsx
tests/                unitários e de física (Vitest)
e2e/                  Playwright
```

Regra de fronteira: toda lógica com decisão (geometria, leitura, mira, física) fica nas unidades puras e é testada sem navegador. Os componentes de `scene/` e `ui/` só ligam essas unidades ao React e ao Three.

### 4.3 Fases e fluxo de dados

Fases no store: `hand` → `charging` → `rolling` → `settled` → (recolher) → `hand`.

1. `Controls` muda tipo/quantidade no store → fase volta para `hand`; o `Stage` renderiza N `Die` (2N para d100) nas posições da mão.
2. `Hand` lê o ponteiro, faz raycast num plano invisível da mesa e grava o alvo (`aim.clampTarget`).
3. Ao apertar: fase `charging`, guarda o instante. A cada quadro a força é `aim.charge(t)`.
4. Ao soltar: `store.throw()` gera a semente e muda para `rolling`. Cada `Die` vira dinâmico e recebe `aim.launchVelocity(...)` + `aim.spin(seed, i)`.
5. Quando um dado dorme (`onSleep` do Rapier), `read.readUp(tipo, rotação)` dá valor e inclinação → `store.report(i, valor)`.
6. Quando todos reportaram: fase `settled`, painel mostra resultado (d100 combinado com `read.combineD100`).
7. Novo clique/Espaço em `settled`: os dados voltam à mão (cinemáticos, interpolação ~400 ms) e a fase volta para `hand`.

### 4.4 Leitura do resultado

- Faces: a face cuja normal (girada pela rotação do corpo) tem o maior produto escalar com +Y é a de cima. A inclinação é o ângulo entre essa normal e +Y.
- d4: o vértice com maior Y (após a rotação) é o de cima.
- Dado "encostado": inclinação > 15°.

### 4.5 Física (valores iniciais, ajustados por sensação; os testes usam os mesmos)

- Escala: dado ≈ 1 unidade; bandeja interna ≈ 14 × 9; paredes ≈ 1,5 de altura + tampa invisível.
- Gravidade inicial −40 (mais forte que −9,81 para dar peso a um dado de 1 unidade).
- CCD ligado nos dados; passo fixo 1/60.
- Colisor de cada dado: casco convexo dos vértices do poliedro (`polyhedra.ts`), o mesmo usado nos testes.

### 4.6 Refração por dado sem derrubar o FPS

- Um `useFBO` renderiza a cena sem os dados uma vez por quadro; todos os `MeshTransmissionMaterial` usam esse buffer (`buffer={fbo.texture}`). Cada dado tem sua própria refração e aberração cromática, mas a cena é desenhada uma vez só.
- `PerformanceMonitor` do drei reduz resolução e amostras do material se o FPS cair.

### 4.7 Referências Three.js (`references/threejs/`, conforme o `CLAUDE.md` do projeto)

Fontes oficiais fixadas (MIT). São adaptadas, não executadas.

| Fonte | O que aproveitar | Onde entra |
| --- | --- | --- |
| `physics_rapier_basic.html` | gravidade, restituição (`addMesh(mesh, massa, restituição)`), corpo fixo vs. dinâmico, cópia corpo → malha | `physics/world.ts`, `Tray.tsx`, `Die.tsx` (a cópia corpo → malha o @react-three/rapier já faz) |
| `physics_ammo_break.html` | `initInput()`: Raycaster da câmera + `setLinearVelocity(direção × 24)`; `createConvexHullPhysicsShape(posições)` | `aim.launchVelocity` troca o 24 fixo por direção mão → alvo × força carregada; o casco convexo vira o colisor de cada dado. A fratura é descartada |
| `misc_controls_drag.html` | `transformGroup = true`: o grupo inteiro acompanha o ponteiro | `Hand.tsx`: os dados da mão se movem juntos seguindo o raycast do ponteiro na mesa. A classe `DragControls` em si não é usada, porque ela arrasta só com o botão pressionado e, neste design, segurar o botão é carregar a força |
| `webgl_geometries.html` | `TetrahedronGeometry`, `BoxGeometry`, `OctahedronGeometry`, `IcosahedronGeometry` (+ `DodecahedronGeometry` para o d12) | `polyhedra.ts`. O d10/d100 (trapezoedro pentagonal) é montado à mão |

Online, sem cópia local: `webgl_materials_physical_transmission` (threejs.org) como referência de transmissão, IOR e espessura da gema.

## 5. Tratamento de erros

| Situação | Comportamento |
| --- | --- |
| Navegador sem WebGL | Fallback do `<Canvas>` com mensagem: "Este navegador não tem WebGL ativo. Abra no Chrome, Edge ou Firefox atualizados." |
| Física (WASM) não carrega | Error boundary com mensagem: "Não foi possível carregar a física. Recarregue a página." |
| Dado sai da bandeja (Y abaixo do chão) | Volta ao centro da bandeja e cai de novo |
| Dado encostado | Empurrãozinho, até 3 vezes; depois vale a face mais próxima |
| Não para em 8 s | Lê assim mesmo |
| Clique/Espaço durante `rolling` | Ignorado |

## 6. Testes

**Unitários (Vitest):**
- `polyhedra`: número de faces certo por tipo; cada número aparece uma vez; opostas somam o esperado; normais unitárias e para fora.
- `read`: para cada face (e cada vértice do d4), uma rotação que a põe para cima é lida como esse número; inclinação detectada; `combineD100` (00+0=100, 90+9=99, 00+1=1).
- `aim`: alvo sempre dentro da bandeja; oscilador entre 0 e 1 e periódico; velocidade cresce com a força e aponta para o alvo; mesma semente → mesmo giro.

**Física em Node (Vitest + Rapier 0.19.2, com `physics/world.ts` e `aim.ts` reais):**
- Para cada tipo, 10 dados em força mínima e máxima: todos dormem dentro do tempo e terminam dentro da bandeja (nenhum atravessa parede).
- Justiça: centenas de arremessos de d6 e d20 com sementes fixas passam num teste qui-quadrado (p > 0,001). Determinístico, não é instável.

**E2E (Playwright + Chrome instalado, WebGL por software):**
- A página abre sem erros no console e o canvas desenha (pixels não uniformes).
- d20 × 3 → segurar Espaço ~0,7 s → soltar → painel mostra 3 valores entre 1 e 20 e a soma certa.
- d100 × 1 → valor entre 1 e 100.

## 7. Loop de verificação (gate do cerebro-loop)

Uma rodada só passa com todos verdes:

1. `tsc --noEmit`
2. `eslint .`
3. `vitest run` (unitários + física)
4. `vite build`
5. `playwright test`
6. Capturas em 1440, 768 e 390 px revisadas visualmente; `code-review` no diff.

Falha → diagnóstico da causa raiz (`systematic-debugging`) → correção mínima → rodar o gate de novo. Até 3 tentativas por falha; depois disso, parar e reportar.

## 8. Riscos

- **GPU fraca:** a refração por dado é a escolha mais pesada. Mitigado pelo buffer compartilhado e pelo `PerformanceMonitor`; se ainda assim travar, a saída é trocar para `MeshPhysicalMaterial` com transmissão (decisão a levar ao usuário, não automática).
- **Justiça física:** dados físicos podem sair viciados se o giro inicial for fraco. O teste qui-quadrado detecta; o ajuste é no giro e no atrito.
- **WebGL headless:** o E2E roda em renderização por software, mais lenta; timeouts generosos.
- **Versão do Rapier:** os testes precisam da mesma versão do engine que a tela usa (0.19.2). Se o @react-three/rapier mudar de versão, o teste de física deve acompanhar.

## 9. Fora de escopo

Som, histórico de rolagens, misturar tipos num arremesso, salvar preferências, multiplayer, deploy.
