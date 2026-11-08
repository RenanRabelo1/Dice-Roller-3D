# DiceRoller 3D — Design

Data: 2026-11-08 · Status: revisado (parecer R1–R10 de `docs/superpowers/reviews/2026-11-08-dice-roller-3d-review.md` incorporado), aguardando revisão do usuário · Caminho do brainstorming: arquitetural

## 1. Objetivo

Peça de portfólio: um rolador de dados de RPG em 3D realista, rodando só local (sem deploy). O momento central é o arremesso: o jogador segura os dados, mira num recipiente, carrega a força e solta. O resultado sai da física de verdade, então mudar a mira e a força muda o resultado.

**Sucesso significa:**
- Arremessar d4 a d100, em quantidade de 1 a 10, e ler o resultado certo da face de cima.
- O valor publicado é sempre o que está visível nos dados parados.
- Dados que batem nas paredes, rolam e param de forma crível, com aparência de gema.
- Todos os gates da seção 8 verdes.

## 2. Entendimento

**O usuário disse:**
- Sistema de rolagem 3D, visual, para portfólio, testado localmente.
- Os dados ficam "na mão" e mexem junto com o mouse.
- Um vetor de mira com direção e intensidade, apontado para um recipiente; mudar o vetor dá a impressão de mudar o resultado.
- Arremesso realista: bater nas paredes do recipiente, rolar de verdade.
- Tipos de RPG de d4 a d100; escolher tipo e quantidade; o formato do dado muda com o tipo.
- React + Three.js; usar exemplos do site do Three.js como referência.
- Ordem: brainstorming → arquitetura → execução (ponytail, kernel, loop, superpowers) → loop de revisão até todos os testes passarem.

**Decisões aprovadas:**
- Gesto: mirar com o mouse + segurar para carregar a força.
- Visual: dados de gema translúcidos sobre veludo escuro.
- Técnica: React Three Fiber + Rapier + refração por dado (`MeshTransmissionMaterial` do drei).
- Resultado lido da física (não sorteado antes).
- Um tipo de dado por arremesso; d100 = par de d10.
- O app 2D (`index.html`) é substituído pelo projeto React na mesma pasta; a versão 2D fica no commit `b335fc9` da `main`.
- Repositório git local, sem remoto e sem push.
- Vitest 4.1.12 em vez de 5.1, porque o Node local é 25.9.0 e o Vitest 5.1 não o suporta (R3).

## 3. Experiência

### 3.1 Cena

- Câmera fixa do lado do jogador, inclinada cerca de 55°, enquadrando a bandeja inteira. Sem controle de órbita.
- Bandeja retangular de madeira escura com fundo de veludo vinho-escuro.
- Iluminação procedural com `Lightformer` do drei dentro de `<Environment>`: sem download de HDRI.

### 3.2 Dados

| Tipo | Forma | Gema | Números | Leitura |
| --- | --- | --- | --- | --- |
| d4 | tetraedro | esmeralda | cada face mostra os 3 números dos seus vértices, perto dos cantos (cada número aparece desenhado em 3 faces) | número do vértice de cima |
| d6 | cubo | rubi | 1–6, opostas somam 7 | face de cima |
| d8 | octaedro | safira | 1–8, opostas somam 9 | face de cima |
| d10 | trapezoedro pentagonal | topázio | dígitos 0–9, opostas somam 9; no d10 isolado o 0 vale 10 | face de cima |
| d12 | dodecaedro | ametista | 1–12, opostas somam 13 | face de cima |
| d20 | icosaedro | cristal claro | 1–20, opostas somam 21 | face de cima |
| d100 | 2 × trapezoedro pentagonal | citrino | dezenas 00–90 e unidades 0–9 | dezenas + unidades com os dígitos brutos; 00 + 0 = 100 |

- **Números na superfície (R9):** os glifos são marcações sobre a face (texto plano rente à superfície, com `depthOffset` para não brigar com a profundidade da gema), em dourado opaco com aparência de gravação. Não ficam dentro da casca, onde a superfície refrativa os esconderia.
- 6 e 9 levam um ponto (`6.` `9.`).
- Fonte dos números: arquivo local em `public/fonts/` (só os glifos `0123456789.`), carregado explicitamente no `Text`. Sem CDN de fonte em tempo de execução.
- Todos os tipos têm tamanho parecido (cerca de 1 unidade), como dados reais.

### 3.3 Mão, mira e arremesso

1. **Na mão:** os dados flutuam acima da borda próxima da bandeja, agrupados. Seguem o X do ponteiro com atraso de mola e giram conforme a velocidade do ponteiro: a face que sairia muda enquanto você mexe.
2. **Mirar:** o ponto do ponteiro projetado na mesa, limitado à área interna da bandeja, é o alvo. Uma seta sobre o veludo vai da mão até o alvo.
3. **Carregar:** segurar o botão do mouse, o toque ou a tecla Espaço **dentro da área de jogo** (seção 3.5). Uma barra de força oscila 0 → 100% → 0 (ciclo de ~1,4 s). A seta cresce e muda de cor com a força; a mão recua levemente.
4. **Soltar:** cada dado vira corpo dinâmico com velocidade = direção × força (com componente para cima, formando um arco) + giro com semente (diferente para cada índice) + o giro que já tinha na mão.
5. **Rolar:** os dados batem nas paredes e uns nos outros e param. O resultado só é publicado pelo protocolo de conclusão (seção 4.5).

### 3.4 Resultado e recolher

- O painel mostra os valores e a soma quando o protocolo de conclusão publica.
- Clicar/tocar de novo na área de jogo (ou Espaço com ela em foco) com o resultado na tela faz os dados voltarem voando para a mão. Mudar tipo ou quantidade também recolhe, em qualquer fase.

### 3.5 Controles e entrada (R6)

- **Área de jogo:** o elemento que contém o canvas é focável (`tabindex="0"`, rótulo acessível "Área de arremesso"), tem foco visível e `touch-action: none`. Os gestos de arremesso só começam nela.
- **Controles HTML** sobre o canvas (seletor de tipo d4…d100, quantidade 1–10 com − e +, barra de força, painel de resultado com `aria-live="polite"`) mantêm seus eventos nativos: Espaço num botão aciona o botão e nunca arremessa.
- **Regras da carga:**
  - Guarda a origem (`pointer` com seu `pointerId`, ou `key`) e usa captura do ponteiro.
  - Só a mesma origem pode soltar: outro ponteiro ou outra tecla não arremessa.
  - Repetição de tecla (`event.repeat`) é ignorada.
  - `pointercancel`, perda de captura ou perda de foco da área de jogo cancelam a carga e voltam para `hand`, sem arremesso.
- Teclado: setas movem a mira; Espaço segura para carregar e solta para jogar (com a área de jogo em foco).
- `prefers-reduced-motion`: sem balanço da mão e sem voo de recolher (os dados reaparecem na mão com um fade curto); a física do arremesso continua, porque é o conteúdo.

## 4. Arquitetura

### 4.1 Stack (versões conferidas no npm em 2026-11-08)

| Pacote | Versão | Papel |
| --- | --- | --- |
| Node | 25.9.0 (local) | runtime; compatível com Vite 8.3, Vitest 4.1 e Playwright 1.65 |
| create-vite, template `react-ts` | 9.3 | scaffold: Vite 8.3, React 19.3, TypeScript ~7.0, oxlint |
| @react-three/fiber | 9.8 | Three.js em React |
| three | 0.187 | renderização |
| @react-three/drei | 10.7 | `MeshTransmissionMaterial`, `Text`, `Environment`, `Lightformer`, `PerformanceMonitor`, `useFBO` |
| @react-three/rapier | 2.2 | física no React (usa Rapier 0.19.2) |
| @dimforge/rapier3d-compat | **0.19.2 fixo** | física nos testes em Node; mesma versão que o @react-three/rapier usa |
| zustand | 5.1 | estado |
| vitest | **4.1.12** | testes unitários e de física (engines inclui Node 25; aceita Vite 8) |
| @playwright/test | 1.65 | E2E com o Chrome já instalado (seção 7) |

Lint: oxlint, que vem no template. Checagem de tipos: `tsc -b` do template (R2).

### 4.2 Unidades

```
src/
  dice/polyhedra.ts   puro: vértices, faces, normais, números e âncoras dos rótulos de cada dado
                      (uma única tabela de faces alimenta o desenho dos números e a leitura)
  dice/read.ts        puro: rotação → número de cima + inclinação; d4 pelo vértice; combina o par do d100
  throw/aim.ts        puro: alvo limitado à bandeja, oscilador de força,
                      velocidade de lançamento, giro com semente por índice (determinístico)
  throw/gesture.ts    puro: regras da carga (origem, pointerId, repetição, cancelamento)
  throw/settle.ts     puro: protocolo de conclusão (seção 4.5)
  physics/world.ts    puro: dimensões da bandeja, gravidade, atrito, restituição, passo,
                      pontos do casco convexo — compartilhado pela cena e pelos testes em Node
  store.ts            zustand: tipo, quantidade, fase, throwId, semente, resultados
  scene/Stage.tsx     câmera, ambiente, <Physics>, buffer de refração, coleta de estado por passo
  scene/Tray.tsx      malhas da bandeja + colisores fixos (paredes + tampa invisível)
  scene/Die.tsx       corpo rígido (colliders={false} + ConvexHullCollider explícito),
                      gema, rótulos na superfície; cinemático na mão, dinâmico no arremesso
  scene/Hand.tsx      liga a área de jogo a gesture.ts e aim.ts; seta de mira
  ui/Controls.tsx     tipo, quantidade, barra de força, painel de resultado
  App.tsx             error boundaries + Suspense (seção 5)
  main.tsx
public/fonts/         fonte local dos números
tests/                unitários e de física (Vitest)
e2e/                  Playwright
```

Regra de fronteira: toda lógica com decisão (geometria, leitura, mira, gesto, conclusão, física) fica nas unidades puras e é testada sem navegador. Os componentes de `scene/` e `ui/` só ligam essas unidades ao React e ao Three.

### 4.3 Fases e fluxo de dados

Fases no store: `hand` → `charging` → `rolling` → `settled` → (recolher) → `hand`.

1. `Controls` muda tipo/quantidade → novo `throwId`, fase `hand`. O `Stage` renderiza N `Die` (2N para d100) com `key` contendo o `throwId`: trocar tipo/quantidade em qualquer fase remonta os corpos, e nenhum evento do arremesso anterior sobrevive.
2. `Hand` faz raycast do ponteiro num plano invisível da mesa e grava o alvo (`aim.clampTarget`).
3. Início da carga aceito por `gesture.ts`: fase `charging`, guarda o instante e a origem. A cada quadro a força é `aim.charge(t)`.
4. Soltura aceita por `gesture.ts`: `store.throw()` gera a semente e muda para `rolling`. Cada `Die` vira dinâmico e recebe `aim.launchVelocity(...)` + `aim.spin(seed, i)`.
5. Depois de cada passo físico (`useAfterPhysicsStep`), o `Stage` coleta o estado de todos os corpos do `throwId` atual (dormindo?, rotação, posição) e chama `settle.step(...)`. As ações devolvidas (esperar, empurrar, reposicionar, congelar, publicar) são aplicadas aos corpos e ao store.
6. Publicação: fase `settled`, painel mostra os resultados (d100 combinado com `read.combineD100`).
7. Novo clique/Espaço em `settled`: os dados voltam à mão (cinemáticos, interpolação ~400 ms; instantâneo com reduced motion), fase `hand`.

### 4.4 Leitura do resultado

- **Faces:** a face cuja normal (girada pela rotação do corpo) tem o maior produto escalar com +Y é a de cima. Inclinação = ângulo entre essa normal e +Y.
- **d4 (R5):** o vértice de cima é o de maior Y após a rotação. Inclinação = ângulo entre o vetor normalizado centro → vértice de cima (girado) e +Y; num d4 bem apoiado é 0°. (Pela regra de faces, um d4 bem apoiado daria 70,53° e seria marcado como encostado; por isso o d4 tem regra própria.)
- **Encostado:** inclinação > 15°, para todos os tipos, cada um com sua regra de inclinação.
- **Valores lógicos:** cada valor de 1 a N aparece uma vez como resultado possível; o desenho do d4 repete cada número em 3 faces.
- **d100:** `combineD100(dezenas, unidades)` recebe os dígitos brutos (0–9 cada). 0 e 0 → 100; caso contrário, dezenas × 10 + unidades. A conversão 0 → 10 vale só para o d10 isolado.

### 4.5 Protocolo de conclusão (R1, R4)

Função pura `settle.step(estado, corpos, tempoSimulado)`, chamada depois de cada passo físico com o estado **atual** de todos os corpos do arremesso. Nada é publicado a partir de um histórico de "já dormiu".

1. Algum corpo acordado ou empurrão pendente → esperar. (Sequência A dorme → A acorda → B dorme: A não está dormindo agora, então espera.)
2. Corpo fora da bandeja (Y abaixo do chão) → reposicionar no centro e soltar de novo; conta como tentativa daquele corpo.
3. Todos dormindo: ler todos no mesmo passo. Se algum está encostado e tem menos de 3 tentativas → empurrãozinho só nele (que o acorda), tentativas +1, esperar. Com 3 tentativas, vale a face mais próxima.
4. Todos dormindo e nenhum empurrão necessário → publicar todos os valores juntos.
5. **Tempo limite:** 8 s de **tempo simulado** (passos × 1/60) desde o arremesso → congelar todos os corpos na pose atual (viram fixos), ler essas poses e publicar. A face visível não muda depois da publicação.

Tentativas são contadas por corpo e por arremesso. O `throwId` garante que um arremesso novo começa do zero.

### 4.6 Física (valores iniciais, ajustados por sensação; os testes usam os mesmos)

- Escala: dado ≈ 1 unidade; bandeja interna ≈ 14 × 9; paredes ≈ 1,5 de altura + tampa invisível.
- Gravidade inicial −40 (mais forte que −9,81 para dar peso a um dado de 1 unidade).
- CCD ligado nos dados; passo fixo 1/60.
- **Colisor de cada dado (R7):** `RigidBody` com `colliders={false}` e um `ConvexHullCollider` explícito com os vértices de `polyhedra.ts`, os mesmos usados nos testes em Node. Sem colisor automático duplicado.

### 4.7 Refração por dado

- Um `useFBO` captura a cena sem os dados, e todos os `MeshTransmissionMaterial` usam esse buffer (`buffer={fbo.texture}`). Por quadro há **dois** desenhos da cena (a captura compartilhada e o render final), não um por dado. Cada dado mantém sua refração e aberração cromática.
- Limitação aceita: como a captura exclui os dados, um dado não aparece na refração de outro.
- `PerformanceMonitor` do drei reduz qualidade quando o FPS cai, redimensionando o **FBO externo** (e as amostras do material), não só a propriedade `resolution` do material.

### 4.8 Referências Three.js (`references/threejs/`, conforme o `CLAUDE.md` do projeto)

Fontes oficiais fixadas (MIT). São adaptadas, não executadas.

| Fonte | O que aproveitar | Onde entra |
| --- | --- | --- |
| `physics_rapier_basic.html` | gravidade, restituição (`addMesh(mesh, massa, restituição)`), corpo fixo vs. dinâmico, cópia corpo → malha | `physics/world.ts`, `Tray.tsx`, `Die.tsx` (a cópia corpo → malha o @react-three/rapier já faz) |
| `physics_ammo_break.html` | `initInput()`: Raycaster da câmera + `setLinearVelocity(direção × 24)`; `createConvexHullPhysicsShape(posições)` | `aim.launchVelocity` troca o 24 fixo por direção mão → alvo × força carregada; o casco convexo vira o colisor de cada dado. A fratura é descartada |
| `misc_controls_drag.html` | `transformGroup = true`: o grupo inteiro acompanha o ponteiro | `Hand.tsx`: os dados da mão se movem juntos seguindo o raycast do ponteiro na mesa. A classe `DragControls` em si não é usada, porque ela arrasta só com o botão pressionado e, neste design, segurar o botão é carregar a força |
| `webgl_geometries.html` | `TetrahedronGeometry`, `BoxGeometry`, `OctahedronGeometry`, `IcosahedronGeometry` (+ `DodecahedronGeometry` para o d12) | `polyhedra.ts`. O d10/d100 (trapezoedro pentagonal) é montado à mão |

Online, sem cópia local: `webgl_materials_physical_transmission` (threejs.org) como referência de transmissão, IOR e espessura da gema.

## 5. Tratamento de erros (R10)

| Situação | Comportamento |
| --- | --- |
| Navegador sem WebGL | Fallback do `<Canvas>`: "Este navegador não tem WebGL ativo. Abra no Chrome, Edge ou Firefox atualizados." |
| Falha do renderer/contexto | Error boundary **externa** ao `<Canvas>`: "O 3D falhou neste navegador. Recarregue a página." |
| Física (WASM) não carrega | Error boundary + `Suspense` em volta do `<Physics>`: "Não foi possível carregar a física. Recarregue a página." |
| Fonte dos números carregando | `Suspense`; a cena aparece quando a fonte está pronta |
| Dado fora da bandeja, encostado, sem parar | Protocolo de conclusão (seção 4.5) |
| Carga cancelada (pointercancel, perda de captura ou foco) | Volta para `hand`, sem arremesso |
| Clique/Espaço durante `rolling` | Ignorado |

## 6. Ordem de construção

1. Unidades puras com testes: `polyhedra`, `read`, `aim`, `gesture`, `settle`, `world`.
2. Física em Node com os mesmos módulos.
3. **Um dado** na cena com gema e números, validado visualmente (legível de vários ângulos e em 390 px de largura) antes de replicar para todos os tipos.
4. Bandeja, mão, mira, arremesso, conclusão, controles.
5. E2E, revisão visual, revisão de código.

## 7. Testes

**Unitários (Vitest):**
- `polyhedra`: número de faces certo por tipo; cada valor lógico aparece uma vez; opostas somam o esperado; normais unitárias e para fora; a âncora de cada rótulo está na face cujo número ela mostra (liga desenho e leitura).
- `read`: para cada face (e cada vértice do d4), uma rotação que a põe para cima é lida como esse número; d4 bem apoiado tem inclinação 0° (e não 70,53°); inclinação acima de 15° é detectada; `combineD100` com dígitos brutos (0+0=100, 9+9=99, 0+1=1) e o d10 isolado (0 → 10).
- `aim`: alvo sempre dentro da bandeja; oscilador entre 0 e 1 e periódico; velocidade cresce com a força e aponta para o alvo; mesma semente → mesmo giro; índices diferentes → giros diferentes (dezenas e unidades do d100 recebem estados distintos).
- `gesture`: carga só começa com origem válida; soltura só da mesma origem/`pointerId`; repetição de tecla ignorada; cancelamento e perda de foco voltam para `hand`; troca de tipo/quantidade durante `charging` e `rolling` volta para `hand`.
- `settle`: A dorme → A acorda → B dorme não publica; todos dormindo publica todos juntos; encostado recebe até 3 empurrões; fora da bandeja reposiciona; 8 s de tempo simulado congela e publica; estado de outro `throwId` não interfere.

**Física em Node (Vitest + Rapier 0.19.2, com `world.ts`, `aim.ts`, `polyhedra.ts` e `settle.ts` reais):**
- Para cada tipo, a quantidade máxima (10 dados; no d100, **20 corpos em 10 pares, 10 resultados**), em força mínima e máxima: o protocolo publica dentro do tempo e todos terminam dentro da bandeja (nenhum atravessa parede).
- Diagnóstico de distribuição: centenas de arremessos de d6 e d20 com sementes fixas, qui-quadrado com p > 0,001. É repetível, mas não prova justiça para toda mira/força; se indicar viés, ajustar giro e atrito.

**E2E (Playwright, R8):**
- Chrome instalado (`channel: 'chrome'`) com WebGL por software explícito: `launchOptions.args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']`, conforme suporte da versão instalada.
- Antes dos cenários: verificar que o contexto WebGL foi criado e registrar o renderer.
- A página abre sem erros no console e o canvas desenha (pixels não uniformes).
- d20 × 3: foco na área de jogo → segurar Espaço ~0,7 s → soltar → os valores do painel são iguais aos lidos dos corpos dentro da página (gancho `window.__dice` exposto só em modo dev/teste) e a soma confere.
- d100 × 10: 20 corpos, 10 resultados entre 1 e 100, iguais aos lidos dos corpos.
- Espaço num botão dos controles não arremessa; perder o foco durante a carga cancela.

## 8. Gate do loop (cerebro-loop)

Uma rodada só passa com todos verdes:

1. `npm run build` → `tsc -b && vite build`. Os projetos TypeScript referenciados cobrem `src/`, `tests/` e `e2e/`.
2. `npm run lint` → oxlint.
3. `npm test` → `vitest run` (unitários + física).
4. `npm run e2e` → `playwright test`.
5. Capturas em 1440, 768 e 390 px revisadas visualmente; `code-review` no diff.

Falha → diagnóstico da causa raiz (`systematic-debugging`) → correção mínima → rodar o gate de novo. Até 3 tentativas por falha; depois disso, parar e reportar.

## 9. Riscos

- **GPU fraca:** a refração por dado é a escolha mais pesada. Mitigado pelo buffer compartilhado e pelo `PerformanceMonitor`; se ainda assim travar, a saída é trocar para `MeshPhysicalMaterial` com transmissão (decisão a levar ao usuário, não automática). Nenhum FPS foi medido ainda.
- **Legibilidade dos números na gema:** risco deduzido, não observado; a etapa 3 da ordem de construção valida um dado antes de replicar.
- **Justiça física:** o qui-quadrado é diagnóstico; o ajuste é no giro e no atrito.
- **WebGL por software:** os flags do SwiftShader dependem da versão do Chrome instalado; o E2E verifica o contexto antes de rodar.
- **Versões fixas:** o Rapier dos testes tem de acompanhar o do @react-three/rapier (0.19.2); o Vitest fica em 4.1 enquanto o Node local for 25.
- **Rede:** o app roda local; com a fonte local e a iluminação procedural, não depende de CDN em tempo de execução.

## 10. Fora de escopo

Som, histórico de rolagens, misturar tipos num arremesso, salvar preferências, multiplayer, deploy.
