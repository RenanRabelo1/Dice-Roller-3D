# Ordem de serviço: presságios, o par de críticos refeito (vampiro, revoada e sangue)

Ordem: OS-0099
Módulo: `pressagios`
Executor: Codex `gpt-6.2-sol`, esforço alto. O revisor é a sessão principal, que aprova ou devolve com um limite mínimo mais estrito, em ciclos, até aprovar.
Escopo de escrita:
- `src/modules/pressagios/**`
- `e2e/omen.spec.ts`: só se a linha "Par de críticos" precisar de ajuste. Nenhum spec novo.
- `src/modules/vitrine/tests/vampiro.test.ts`: só o caso do par, que exigia o arremesso perto da câmera. O código da vitrine não muda. O dev perguntou, e o orquestrador autorizou em 2026-11-18.

Objetivo:
- O presságio **par de críticos** (dois 10 no d10 Vampiro, de Vampiro: A Máscara) ganha uma animação nova e mais simples, inteira em 3D. Ela segue as mesmas especificações do d100 do kraken.
- A figura do vampiro, reaproveitada pelos três presságios, é remodelada para tirar as facetas visíveis.

Leia antes de começar:
- `src/modules/pressagios/CLAUDE.md` e `NOTAS.md` (seções Vampiro e Desempenho)
- `domain/krakenMotion.ts` e `scene/Kraken.ts`: **a especificação a copiar** (ver decisão 1)
- `domain/vampiroMotion.ts`, `scene/Vampiro.ts`, `scene/vampiroMao.ts`, `scene/PresagiosNaCena.tsx` (classe `Show`), `domain/percurso.ts`, `domain/luz.ts`
- `ui/OverlayDoPresagio.tsx` e `ui/presagios.css` (o tremor do par no impacto)
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md): desempenho, SwiftShader e luzes
- A referência do morcego: `screens/ref-morcego.png` (fora do git)

## Decisões do orquestrador

### 1. Especificações do kraken a copiar

O par passa a ter a mesma estrutura do d100 do kraken:

- **Um relógio, marcos nomeados.** Troque `VAMPIRO.par` por marcos novos, num objeto constante, como `KRAKEN`: `{ surge, revoada, cobre, descobre, sangue, revela, mostrado, sai, duration }`. Defina também uma função pura `parAt(t)` que dá os escalares da cena, como `krakenAt`: `aparece`, `revoada` (o progresso da passagem), `sangue` (o comprimento do escorrido) e `revela`. A cena e o percurso leem só esses valores.
- **Percurso do dado como o `stormDieAt`.** Os dois dados ficam parados na pose de pouso (`de`) enquanto os morcegos passam. Depois vão até a pose do resultado (`para`) e terminam exatamente nela. `vampiroDieAt('par-de-criticos', …)` devolve `{ pose, revela, sombra, fim }`, igual ao kraken e à tempestade. O contrato `MovimentoNoPresagio` não muda, e a vitrine não muda.
- **Número em destaque como no kraken.** `revela` sobe de 0 a 1 entre `revela` e `mostrado`, e o número aceso fica no dado (é o mesmo `revela` que a vitrine já desenha).
- **Geometria procedural de qualidade igual ou melhor que a do tentáculo.** Malha com anéis e lados suficientes, normais por vértice (`computeVertexNormals` sobre vértices compartilhados), `MeshPhysicalMaterial` onde a superfície for molhada ou brilhante (o sangue) e `InstancedMesh` para o que se repete (os morcegos, como as ventosas e as lascas).
- **Testes de domínio como `tests/kraken.test.ts`.** Marcos em ordem, valores nas bordas (`t = 0`, cada marco, `duration`) e a pose final igual a `para`.

### 2. A animação nova (substitui inteira a do par; nada das mãos pegando e arremessando os dados)

A duração continua em `VAMPIRO_MS['par-de-criticos'] = 5600` ms, para não mexer nos tempos do CSS e da E2E. Marcos sugeridos (ajuste fino é livre, desde que a ordem e o sentido fiquem):

| ms | O que acontece |
|---|---|
| 0–700 | O vampiro surge **atrás da parede de trás, no centro** da mesa (`x ≈ 0`, `z` além de `-TRAY.halfDepth - TRAY.wallThickness`). Sobe de trás da parede, sem tocar a mesa. Só o corpo dele está em cena, parado, imponente: capa aberta, braços junto ao corpo, cabeça visível com olhos acesos. Nenhuma mão alcança a mesa e nenhum dado se move. |
| 1000 | Um segundo depois do início, começa a revoada. |
| 1000–2900 | Uma nuvem de morcegos atravessa **a mesa inteira** num sentido só: de trás para a frente (de cima para baixo na tela) ou da esquerda para a direita. O sentido fica à escolha do dev, registrado no relatório. No pico (`cobre` → `descobre`), os morcegos ficam entre a câmera e o feltro, e o jogador **não consegue ver os dados**. Eles batem as asas, com a fase variando entre eles. |
| ~2900 | Os últimos morcegos saem da tela. Os dados estão no lugar onde caíram. |
| 2900–4800 | O sangue escorre das **laterais da mesa**, pelas faces de dentro e de fora das paredes esquerda e direita (pode incluir a de trás): fios que crescem de cima para baixo, com gota na ponta e espessura variada. |
| 3000–3800 | Os dois dados vão até a pose do resultado, e o número aparece em destaque (`revela`). |
| 4800–5600 | O vampiro afunda atrás da parede. O sangue some suavemente (encolhe ou escurece) e tudo termina invisível em `duration`. |

- **Os morcegos** seguem a silhueta da referência (`screens/ref-morcego.png`): asas largas com a borda de trás recortada em vieiras, pontas dos dedos marcadas, orelhas pontudas e corpo pequeno. Devem ser **3D**: membrana com curvatura e espessura visual (dupla face), corpo com volume e asas articuladas no ombro que batem. Não use sprite, plano chapado com textura nem imagem. Use `InstancedMesh` (por exemplo, corpo, asa esquerda e asa direita), sem shader customizado se não for preciso. A quantidade fica a cargo do dev, desde que a cobertura seja cumprida (ver critério 4).
- **A remodelagem do vampiro vale para a figura toda** (as três animações usam a mesma), mas só o par muda de comportamento. Crítico bestial e falha bestial mantêm as linhas do tempo e testes atuais. Só a malha deles fica mais lisa.
- **A pose do par:** a figura atual tem gestos de pegar. Para o par, basta uma pose de presença (corpo ereto atrás da parede, capa aberta, leve respiração e ondular da capa). `vampiroAt('par-de-criticos', …)` passa a devolver essa pose, e `fechamentoDaPegada` do par fica `[0, 0]`.
- **O overlay:** retire o tremor do canvas no impacto do par (`--vampiro-impacto`, `omen-shake` no par), porque não há mais impacto. O anúncio "Crítico em par!" e os atributos `data-vampiro` e `.omen-vampiro` continuam iguais, pois são contrato dos E2E (`tests/overlay.test.ts`).
- **A luz:** use a mesma `PointLight` compartilhada, com `COR_VAMPIRO`. Pode mudar `POS_VAMPIRO` e a curva do par em `domain/luz.ts`. **Nenhuma luz nova.**

### 3. Remodelagem da figura: o limite mínimo (o revisor confere item por item)

A figura atual tem facetas visíveis: `SphereGeometry(1, 12, 8)`, `CylinderGeometry(..., 8)`, `LatheGeometry(..., 18)`, capa em 16×14 e polígonos chapados nas golas. O alvo é o **mínimo de aspecto quadrado possível**:

1. **Segmentos.** Esferas com pelo menos 32×24. Cilindros e afunilados (`taper`) com pelo menos 24 lados radiais, e o membro inteiro (braço, antebraço, dedos) com anéis ao longo do comprimento (`heightSegments ≥ 6`) para curvar sem quebra. `LatheGeometry` com pelo menos 48 segmentos e perfis com pelo menos 12 pontos, suavizados por curva (`CatmullRomCurve3`/`SplineCurve` amostrada) em vez de poucos pontos retos. Capa e forro com malha de pelo menos 48 colunas × 32 linhas.
2. **Sombreamento liso.** Nada de `flatShading`. Depois de cada `mergeGeometries`, aplique `mergeVertices` e recalcule as normais, para não aparecer costura dura onde as peças se encontram. Arestas duras só onde são intencionais (unha, borda da gola, ponta da presa), e cada uma listada no relatório.
3. **Formas sem caixas.** Mãos, dedos, gola e ombros sem silhueta de caixa ou de prisma: dedos afunilados e arredondados na ponta (tampa esférica), gola alta curva (superfície varrida ou lathe parcial com espessura), ombros arredondados.
4. **Medida objetiva (teste do módulo).** Um teste percorre as malhas do corpo e da capa (morcegos e sangue também) e mede, nas superfícies curvas, o **ângulo máximo entre as normais de triângulos vizinhos** (depois de `mergeVertices`). O limite é **≤ 15°**. As arestas intencionais do item 2 ficam numa lista de exceções nomeada no próprio teste, com o motivo.
5. **Orçamento.** Figura (corpo + capa) com no máximo **60 mil vértices**, e cada parte articulada em no máximo **4 draw calls** por material. Os morcegos devem ser instanciados (no máximo 3 draw calls para a revoada toda). O sangue deve usar no máximo 2 draw calls. Tudo é aquecido no `compile()` do `Show`, como os outros efeitos.

Se a primeira entrega não cumprir algum item, o revisor devolve com o limite apertado (por exemplo, um ângulo menor ou mais segmentos onde a faceta apareceu nas capturas) e o ciclo se repete.

### 4. Regras que continuam

- Tudo dentro de `pressagios`. Nenhuma mudança de contrato (`contracts.ts`), da vitrine, de `regras` ou de `arremesso`. Se precisar de algo fora, pare e reporte.
- A busca dos botões de teste (`arremesso/domain/vies.ts`) não muda: o par continua sendo dois 10 no d10 Vampiro.
- Nada visível fora de um presságio. Recolher, trocar a mão ou ligar o movimento reduzido esconde a figura, os morcegos e o sangue na hora (estenda o teste `hides on finish, pickup, selection change and reduced motion`).
- O perfil leve segue o que os outros presságios fazem. Se o leve reduz o kraken, reduza os morcegos na mesma proporção, sem perder a cobertura.
- Sem asset externo, sem textura de imagem, sem dependência nova.
- Commits pequenos, no padrão `feat(pressagios): … [OS-0099]`.

## Entregáveis

1. `domain/vampiroMotion.ts`: marcos e `parAt` do par novo, `vampiroDieAt` do par no padrão do `stormDieAt`, e uma função pura da revoada (`revoadaAt(t)`, que dá a posição, o rumo e a fase de bater asa de cada morcego), para o teste de cobertura não depender de WebGL.
2. `scene/Vampiro.ts` remodelada. Morcegos e sangue podem ficar em arquivos próprios em `scene/` (`Morcegos.ts`, `Sangue.ts`), integrados ao `Show` (criar, `compile`, `hide`, `dispose`).
3. Testes do módulo:
   - par: marcos em ordem; dados parados até `descobre`; pose final igual a `para`; `revela` 0 antes de `revela` e 1 a partir de `mostrado`;
   - **cobertura:** com a câmera padrão `[0, 14, 10]` olhando a origem, numa grade de pelo menos 9×6 pontos sobre o feltro, **todo ponto** fica escondido por algum morcego (o raio câmera→ponto cruza a área de um morcego) em todo `t` entre `cobre` e `descobre`;
   - sangue: comprimento 0 antes de `sangue` e crescente depois; some até `duration`;
   - o ângulo de normais (decisão 3, item 4) e o orçamento de vértices e draw calls;
   - os testes de cena atuais (aquecer, liberar sem vazamento, esconder) estendidos para morcegos e sangue;
   - os testes de domínio do par antigo (arremesso perto da câmera, pegada, transferência) saem; os do crítico bestial e da falha bestial ficam intactos.
4. `ui/OverlayDoPresagio.tsx` e `ui/presagios.css` sem o tremor do par.
5. `CLAUDE.md` e `NOTAS.md` do módulo atualizados (seção Vampiro: o par novo, os morcegos, o sangue e a malha lisa).
6. **Prova visual (obrigatória):**
   - capturas do par no Chrome com SwiftShader, nos tempos 400, 900, 1300, 1900, 2500, 3100, 3600, 4300 e 5200 ms, em `screens/os0099-par-<ms>.png`;
   - um close da figura (câmera aproximada no rosto e nos ombros, pela `__dice` ou por um script de captura descartável) em `screens/os0099-figura-close.png`, para conferir as facetas;
   - um quadro do crítico bestial (1900 ms) e um da falha bestial (3700 ms), para provar que as outras animações seguem iguais com a malha nova;
   - para pausar num marco, use o botão de teste "Par de críticos" e um `page.evaluate` que espera `state().omenTime >= ms`, como na OS-0097. O script de captura é descartável e não vai para o repositório.

## Critérios de aceite

- `npm run build && npm run lint && npm test && npm run test:server` passam.
- E2E **só o essencial**: `npx playwright test e2e/omen.spec.ts -g "Par de críticos|Crítico bestial|Falha bestial"`, rodado sozinho com a máquina livre. **Não rode** `npm run e2e` completo nem o `e2e:rapido`: o usuário faz os testes de usuário e a suíte completa fica para o marco.
- O teste de cobertura e o teste de ângulo de normais passam.
- As capturas mostram cada fase: o vampiro atrás do centro, a mesa tomada pelos morcegos (sem dado visível), o sangue escorrendo nas laterais, os números em destaque e o fim limpo.

## Relatório

Ao terminar, informe:
- o sentido da revoada e o número de morcegos;
- os vértices e draw calls da figura, dos morcegos e do sangue;
- o ângulo máximo medido e as arestas intencionais com o motivo;
- o resultado de cada comando;
- os caminhos das capturas;
- os commits.

## Fora do escopo

- Os outros presságios (raio, kraken, fogo, tempestade, dualidade) e o comportamento do crítico bestial e da falha bestial.
- O voo comum e os números da vitrine.
- O botão de teste e a regra do par.

Se precisar de algo fora disso, pare e reporte. Não implemente.

## Resultado

A animação foi aprovada no terceiro ciclo de revisão visual.

- **Revoada.** 395 morcegos cruzam da esquerda para a direita em três alturas, com 1.006 vértices por morcego e teto de 397.370. A captura de 1.900 ms tem 380 instâncias e 382.280 vértices. A grade do feltro ficou coberta durante todo o pico medido.
- **Malhas.** A figura e a capa somam até 59.831 vértices, contando o forro separadamente. Os maiores ângulos entre as normais de triângulos vizinhos foram 14,934° na figura, 13,961° no morcego detalhado e 11,250° no sangue, sem exceções para arestas.
- **Sangue.** Aos 3.600 ms, os filetes cobrem 33,27% da face interna visível esquerda e 36,96% da direita. Aos 5.200 ms, têm metade do comprimento.
- **Enquadramento.** Com a câmera padrão fixa, o vampiro ocupa de 94,49% a 97,06% da faixa livre acima do lábio traseiro, com a cabeça inteira na tela. A capa do crítico bestial tem sete dobras, barra ondulada e forro vermelho visível.
- **Verificação.** `npm run build`, `npm run lint` e `npm test` passaram na revisão final, com 672 testes no último comando. `npm run test:server` passou na validação inicial, com 25 testes. Após a aprovação visual, `npx playwright test e2e/omen.spec.ts -g 'Par de críticos|Crítico bestial|Falha bestial'` rodou sozinho uma vez, com três cenários aprovados.
