# DiceRoller 3D — Design

Data: 2026-11-08 · Status: revisado após incorporação de R1–R10 e conferência do fluxo de estados; aguardando validação do usuário · Caminho do brainstorming: arquitetural

## Estado atual (revisado em 2026-11-11)

Este documento registra o design original e foi mantido como histórico. O código mudou depois dele; **onde houver conflito, valem o código e `docs/contexto/`**. O que mudou:

| Seção | O documento diz | O código faz hoje | Detalhe em |
|---|---|---|---|
| 2, 3.2 | um tipo de dado por arremesso; d100 = par de d10 com `combineD100` | seleção mista de até 10 dados de tipos diferentes; d100 é **um sólido de 100 faces** numeradas 1–100 | `docs/contexto/dados.md` |
| 2, 4.3–4.5 | resultado lido ao vivo após cada passo, com empurrãozinho em dado encostado (até 3) e timeout de 480 passos | o arremesso inteiro é **pré-simulado** no lançamento (num worker) e reproduzido na tela; `stepSettle` só espera, recupera ou revela, sem empurrão; timeout de **240 passos** (4 s) | `docs/contexto/arremesso.md` |
| 2, 4.7 | refração por dado com `MeshTransmissionMaterial` e FBO compartilhado | gema com `meshPhysicalMaterial` (clearcoat + translucidez), **sem** passe de refração; numerais em `BatchedText` do troika (um objeto por dado) | `docs/contexto/dados.md` |
| 3.4 | painel mostra o resultado quando para | os dados voam até a câmera mostrando a face sorteada (showcase) e o número sobe e brilha; d20/d100 podem tocar presságios antes | `docs/contexto/apresentacao.md` |
| 5 | error boundaries para WebGL, renderer e física (R10) | **implementadas** (`src/failure.ts`, `src/ui/Safeguard.tsx`, `store.error` = `webgl`/`graphics`/`physics`); coberto por `e2e/failure.spec.ts` | `docs/contexto/armadilhas.md` |
| 10 | fora de escopo: misturar tipos | misturar tipos é suportado; também existem d10 de Vampiro e Fome, d6 de Fogo, moeda, chat com notação e **dados importados** (STL/GLB) | `docs/contexto/dados.md` |
| 2, 4.1 | repositório local, sem remoto; Node 25.9 | repositório no GitHub (`RenanRabelo1/Dice-Roller-3D`), com PRs para a `main`; Node local 24.x | `docs/contexto/visao-geral.md` |

Specs posteriores: `2026-11-10-coin-and-omens-design.md` (moeda e presságios), `2026-11-11-importar-dado-design.md` (dado importado), `2026-11-11-mesa-e-fundo-design.md` (mesa e fundo, proposta).

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
- Fonte dos números: arquivo local em `public/fonts/`, contendo os glifos `0123456789.` e acompanhado da licença de redistribuição, carregado explicitamente no `Text`. Sem CDN de fonte em tempo de execução; não é necessário criar um subset.
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
  - `pointercancel`, perda de captura ou perda de foco da área de jogo, inclusive troca de janela, cancelam uma carga ainda ativa e voltam para `hand`, sem arremesso. A perda de captura após uma soltura já aceita não cancela o arremesso.
  - Só começa em `hand`, após os dados estarem prontos. Em `returning`, novos gestos são ignorados; os seletores continuam disponíveis.
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

Lint: oxlint, que vem no template. Checagem de tipos: `tsc -b` do template (R2). Scaffold fixado em `create-vite@9.3.0` e Vitest em `4.1.12`; gerar e preservar o lockfile na execução. Os metadados dessas versões incluem Node 25.9.0; não é necessário alterar o Node instalado para este plano.

Fontes do setup: metadados oficiais de [Vitest 4.1.12](https://registry.npmjs.org/vitest/4.1.12) e [create-vite 9.3.0](https://registry.npmjs.org/create-vite/9.3.0), incluindo o template `react-ts` do pacote publicado. Compatibilidade declarada conferida; instalação e gates serão validados na execução.

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

Fases no store: `hand` → `charging` → `rolling` → `settled` → `returning` → `hand`. Cancelamento da carga retorna a `hand`; mudança de tipo/quantidade, em qualquer fase, reinicia em `hand`.

1. `Controls` muda tipo/quantidade → invalida o `throwId` anterior, limpa carga, tentativas, tempo e resultados; fase `hand`. O `Stage` renderiza N `Die` (2N para d100), identificados por tipo, quantidade e índice. Só a mudança da seleção remonta esses corpos; mudar de fase ou iniciar outro arremesso com a mesma seleção não os remonta. Eventos antigos são descartados pelo `throwId`, sem depender da desmontagem.
2. `Hand` faz raycast do ponteiro num plano invisível da mesa e grava o alvo (`aim.clampTarget`).
3. Início da carga aceito por `gesture.ts`: fase `charging`, guarda o instante e a origem. A cada quadro a força é `aim.charge(t)`.
4. Soltura aceita por `gesture.ts`: `store.throw()` cria um novo `throwId` e captura semente, alvo, força, tipo/quantidade, poses e giro atual da mão. Com esse único snapshot, aplicar as poses aos corpos existentes, torná-los dinâmicos e aplicar a velocidade linear de `aim.launchVelocity(...)` e a velocidade angular da mão + `aim.spin(seed, i)` uma única vez. Só então iniciar a contagem dos passos de `rolling`; renderizações posteriores não reaplicam o lançamento.
5. Somente em `rolling`, depois de cada passo físico (`useAfterPhysicsStep`), o `Stage` coleta o estado de todos os corpos esperados do arremesso atual (identificador, dormindo?, rotação, posição) e chama `settle.step(...)`. As ações devolvidas (esperar, empurrar, reposicionar, congelar, publicar) são aplicadas aos corpos e ao store.
6. Publicação: fase `settled`, painel mostra os resultados (d100 combinado com `read.combineD100`).
7. Novo clique/Espaço em `settled`: fase `returning`; os dados voltam à mão como cinemáticos, com interpolação de ~400 ms. Ao terminar, fase `hand` e novos gestos são aceitos. Com reduced motion, o retorno é imediato. Mudança de seleção interrompe o retorno e reinicia a mão.

### 4.4 Leitura do resultado

- **Faces:** a face cuja normal (girada pela rotação do corpo) tem o maior produto escalar com +Y é a de cima. Inclinação = ângulo entre essa normal e +Y.
- **d4 (R5):** o vértice de cima é o de maior Y após a rotação. Inclinação = ângulo entre o vetor normalizado centro → vértice de cima (girado) e +Y; num d4 bem apoiado é 0°. (Pela regra de faces, um d4 bem apoiado daria 70,53° e seria marcado como encostado; por isso o d4 tem regra própria.)
- **Encostado:** inclinação > 15°, para todos os tipos, cada um com sua regra de inclinação.
- **Valores lógicos:** cada valor de 1 a N aparece uma vez como resultado possível; o desenho do d4 repete cada número em 3 faces.
- **d100:** `combineD100(dezenas, unidades)` recebe os dígitos brutos (0–9 cada). 0 e 0 → 100; caso contrário, dezenas × 10 + unidades. A conversão 0 → 10 vale só para o d10 isolado.

### 4.5 Protocolo de conclusão (R1, R4)

Função pura `settle.step(estado, corpos, tempoSimulado)`, chamada depois de cada passo físico com o estado **atual** de todos os corpos do arremesso. Nada é publicado a partir de um histórico de "já dormiu".

As condições abaixo têm prioridade, de cima para baixo; a espera nunca impede a recuperação nem o timeout:

1. **Validade:** ignorar outro `throwId`, fase diferente de `rolling` ou um arremesso já concluído. Só avaliar a conclusão quando todos os corpos esperados estiverem registrados (N, ou 2N no d100); uma lista vazia/incompleta não significa que todos dormiram.
2. **Tempo limite:** ao completar 480 passos de 1/60 s (8 s simulados), congelar todos os corpos nas poses atuais, ler essas mesmas poses e publicar uma única vez. Se houver corpo fora dos limites, recolocá-lo antes em uma pose de recuperação segura dentro da bandeja, preservando sua orientação, sem sobreposição. O timeout prevalece sobre corpo acordado e recuperação pendente.
3. **Recuperação:** antes do prazo, corpo que atravessou o chão ou escapou pelos limites laterais → reposicionar em um ponto seguro dentro da bandeja e acordá-lo; conta como tentativa daquele corpo. Considerar a extensão do colisor, não só seu centro. Recuperação invalida qualquer leitura anterior e não reinicia o prazo global.
4. **Espera:** algum corpo acordado ou recuperação ainda pendente → esperar. Sequência A dorme → A acorda → B dorme não publica, porque A não está dormindo agora.
5. **Encostado:** todos dormindo; se algum está encostado e tem menos de 3 tentativas → empurrãozinho só nele, acordá-lo, tentativas +1 e esperar. Com 3 tentativas, vale a face mais próxima.
6. **Conclusão normal:** todos dormindo e nenhuma recuperação necessária → capturar todas as poses no mesmo passo e publicar uma única vez.

Em qualquer conclusão, congelar os corpos, zerar suas velocidades e sincronizar as malhas com o snapshot final antes da publicação. `settled` mantém essas poses até recolher ou mudar a seleção; a interpolação visual não pode mostrar uma face diferente da publicada.

Tentativas são contadas por corpo e por arremesso. O `throwId` garante que um arremesso novo começa do zero.

### 4.6 Física (valores iniciais, ajustados por sensação; os testes usam os mesmos)

- Escala: dado ≈ 1 unidade; bandeja interna ≈ 14 × 9; paredes ≈ 1,5 de altura + tampa invisível.
- Gravidade inicial −40 (mais forte que −9,81 para dar peso a um dado de 1 unidade).
- CCD ligado nos dados; passo fixo 1/60.
- **Colisor de cada dado (R7):** `RigidBody` com `colliders={false}` e um `ConvexHullCollider` explícito com os vértices de `polyhedra.ts`, os mesmos usados nos testes em Node. Sem colisor automático duplicado.
- Na mão e durante o retorno, mover os próprios corpos cinemáticos e suas malhas sincronizadas. O giro da mão faz parte da pose física; não adicionar uma rotação visual que a leitura do resultado desconheça. As poses de lançamento ficam acima da borda próxima, com os volumes dentro da projeção interna da bandeja e sem sobreposição. Os pontos de recuperação também respeitam os limites e o tamanho dos corpos.

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
| Clique/Espaço durante `rolling` ou `returning` | Ignorado; seletores ainda podem reiniciar a mão |

## 6. Ordem de construção

1. Unidades puras com testes: `polyhedra`, `read`, `aim`, `gesture`, `settle`, `world`.
2. Física em Node com os mesmos módulos.
3. **Um dado** na cena com gema e números, validado visualmente (legível de vários ângulos e em 390 px de largura) antes de replicar para todos os tipos.
4. Bandeja, mão, mira, arremesso, conclusão, controles.
5. E2E, revisão visual, revisão de código.

## 7. Testes

**Unitários (Vitest):**
- Vitest coleta somente `tests/**/*.test.ts` em ambiente Node; Playwright usa `testDir: 'e2e'`. Os runners não coletam os testes um do outro. Configurar timeout próprio para a bateria física.
- `polyhedra`: número de faces certo por tipo; cada valor lógico aparece uma vez; opostas somam o esperado; normais unitárias e para fora; a âncora de cada rótulo está na face cujo número ela mostra (liga desenho e leitura).
- `read`: para cada face (e cada vértice do d4), uma rotação que a põe para cima é lida como esse número; d4 bem apoiado tem inclinação 0° (e não 70,53°); inclinação acima de 15° é detectada; `combineD100` com dígitos brutos (0+0=100, 9+9=99, 0+1=1) e o d10 isolado (0 → 10).
- `aim`: alvo sempre dentro da bandeja; oscilador entre 0 e 1 e periódico; velocidade cresce com a força e aponta para o alvo; mesma semente → mesmo giro; índices diferentes → giros diferentes (dezenas e unidades do d100 recebem estados distintos).
- `gesture`: carga só começa com origem válida em `hand`; soltura só da mesma origem/`pointerId`; repetição de tecla ignorada; cancelamento e perda de foco voltam para `hand`; perda de captura depois de uma soltura aceita não desfaz o lançamento; gestos durante `returning` são ignorados; troca de tipo/quantidade em qualquer fase volta para `hand`.
- `settle`: A dorme → A acorda → B dorme não publica; todos dormindo publica todos juntos; lista vazia/incompleta não publica; encostado recebe até 3 empurrões; corpo acordado fora da bandeja é recuperado antes de esperar; 480 passos congelam e publicam mesmo com corpos acordados/recuperação pendente; recuperação não zera o prazo; timeout com corpo fora respeita os limites; estado de outro `throwId` e chamadas após conclusão não publicam.

**Física em Node (Vitest + Rapier 0.19.2, com `world.ts`, `aim.ts`, `polyhedra.ts` e `settle.ts` reais):**
- Para cada tipo, a quantidade máxima (10 dados; no d100, **20 corpos em 10 pares, 10 resultados**), em força mínima e máxima: nenhum dado atravessa chão/parede durante a simulação normal; todos terminam dentro da bandeja e o protocolo publica até o passo 480. Testes separados forçam uma fuga e o timeout para validar a recuperação; ela não pode mascarar uma falha de colisão no cenário normal.
- Diagnóstico de distribuição: centenas de arremessos de d6 e d20 com sementes fixas, qui-quadrado com p > 0,001. É repetível, mas não prova justiça para toda mira/força; se indicar viés, ajustar giro e atrito.

**E2E (Playwright, R8):**
- Chrome instalado (`channel: 'chrome'`) com WebGL por software explícito: `launchOptions.args: ['--use-gl=angle', '--use-angle=swiftshader']`, conforme suporte da versão instalada. Essas flags ficam restritas à configuração de testes.
- Antes dos cenários: verificar que o contexto WebGL foi criado e registrar o renderer.
- `webServer` do Playwright inicia o Vite na raiz, em modo `test`, com host `127.0.0.1` e porta fixa. Os cenários aguardam física/fontes prontas antes de interagir. O gancho `window.__dice` existe somente nesse modo, não no build normal.
- A página abre sem erros no console e o canvas desenha (pixels não uniformes).
- Uma fixture de pose conhecida valida a cena real: quaternion do corpo e transformação mundial da malha concordam, glifos ficam nas faces/vértices previstos e o painel mostra o valor esperado fixo da fixture. O esperado não é calculado chamando novamente o leitor da aplicação.
- d20 × 3: foco na área de jogo → segurar Espaço ~0,7 s → soltar → painel e poses finais dos corpos concordam e a soma confere. Verificar também a transição cinemático → dinâmico: a pose/giro da mão é preservada, sem remontar o corpo ou aplicar o lançamento duas vezes.
- d100 × 10: 20 corpos, 10 resultados entre 1 e 100, iguais aos lidos dos corpos.
- Espaço num botão dos controles não arremessa; perder o foco durante a carga cancela; novo gesto durante o recolhimento não arremessa; repetir um arremesso com a mesma seleção recebe novo `throwId` e descarta eventos antigos.

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
