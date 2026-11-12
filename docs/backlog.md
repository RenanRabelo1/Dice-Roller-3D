# Próximas features

Combinado com o usuário em 2026-11-11. As três foram especificadas pela sessão principal e **implementadas** (2026-11-12, branch `dev-jg`):

| Item | Spec |
|---|---|
| Dado de forma livre (caminho B) | [2026-11-11-dado-forma-livre-design.md](superpowers/specs/2026-11-11-dado-forma-livre-design.md) + adendo dos shards [2026-11-11-dado-forma-livre-shards.md](superpowers/specs/2026-11-11-dado-forma-livre-shards.md) |
| Fundo 360° (fase 3 da mesa) | [2026-11-11-fundo-360-design.md](superpowers/specs/2026-11-11-fundo-360-design.md) |
| Números pintados na mesa | [2026-11-11-numeros-pintados-mesa-design.md](superpowers/specs/2026-11-11-numeros-pintados-mesa-design.md) |

Implementado (2026-11-12): **dado de forma livre voa até a frente no resultado** — [2026-11-12-forma-livre-voa-design.md](superpowers/specs/2026-11-12-forma-livre-voa-design.md).

A ideia do "abraço de tentáculos no 100 do d100" foi coberta pelo PR #4 do Renan: o 100 agora é a tempestade, com tentáculos saindo do mar em volta da bandeja (ver apresentacao.md).

Pedido em 2026-11-12, ainda sem spec: **refatoração visual do site** (seção 4) e **duas correções** (seção 5, não fazem parte da refatoração visual).

As notas abaixo são o contexto original que gerou as specs; valem as specs.

## 1. Dado importado de forma livre (caminho B)

- **O quê:** importar dados que não são d4–d20: d3, d7, d30, dado-caveira, cristal, qualquer forma convexa com faces planas.
- **De onde parte:** o caminho A (`docs/superpowers/specs/2026-11-11-importar-dado-design.md`, `src/dice/importer.ts`) já detecta faces planas pelo casco e reconstrói o poliedro pelos planos. O B tira a exigência de bater com 4/6/8/10/12/20 faces.
- **O que muda:**
  - a física e a leitura usam o poliedro do próprio modelo; o worker já recebe os poliedros importados no `RollRequest`;
  - numeração sempre calibrada (não existe layout padrão), sem sugestão de face oposta quando não houver oposta;
  - presságios: decidir se um dado de forma livre pode contar como crítico/falha.
- **Perguntas para a spec:** quantas faces no mínimo e no máximo? Dado justo importa (formas irregulares caem mais numa face)? Como o chat chama esses dados (`2d7caveira`)?

## 2. Fundo 360° (fase 3 da mesa)

- **O quê:** foto panorâmica (2:1, equirretangular) como ambiente: aparece em volta da mesa e **reflete nos dados de gema**.
- **De onde parte:** fases 1 e 2 em `docs/superpowers/specs/2026-11-11-mesa-e-fundo-design.md` e `docs/contexto/mesa.md`. Hoje o fundo de foto é CSS atrás do canvas e os reflexos vêm de `Lightformer`s.
- **Cuidados:** trocar o mapa de ambiente pode recompilar shaders (ver `docs/contexto/armadilhas.md`); custo de PMREM ao trocar; tamanho da imagem; medir o crítico do d100 com o fundo 360° ligado.
- **Perguntas para a spec:** substitui os `Lightformer`s ou soma? Aceita `.hdr`/`.exr` ou só JPG/PNG? Vai dentro do `.glb` da mesa?

## 3. Números pintados no dado importado, também na mesa

- **O quê:** hoje a gravação do dado importado é pintada de escuro só na prévia do assistente (`inkOf` em `src/dice/importer.ts`). Levar isso para o dado na mesa, para os números esculpidos ficarem legíveis durante o jogo.
- **Por que ficou de fora:** o material de gema é translúcido (`meshPhysicalMaterial` com clearcoat); pintar por cor de vértice muda o visual da gema e precisa de cuidado com desempenho (10 dados de até 50 mil triângulos).
- **Perguntas para a spec:** cor da tinta escolhida pelo jogador (dourado, preto, branco)? Opção de acabamento fosco para dados importados? Vale para GLB que já tem textura própria?

## 4. Refatoração visual do site

- **O quê:** o João acha a interface pouco agradável. Quer uma passada visual no site todo: barra de seleção de dados, painel de resultado, chat, painel da mesa ("Mesa") e assistente de importação ("Importar dado").
- **Exemplo citado (assistente de importação, ao recusar um modelo):**
  - o botão nativo "Escolher Arquivo" aparece com a fonte do sistema, e o nome do arquivo sai cortado ("Nenhum a... escolhido");
  - a ação ("Importar como dado de forma livre") vem **antes** da mensagem que explica por que ela apareceu ("Não reconheci um d4–d20…"); a mensagem chega em vermelho, como se fosse um erro, embora seja um caminho válido;
  - a área de soltar o arquivo (borda tracejada amarela), o botão amarelo cheio e o texto vermelho não parecem do mesmo sistema visual.
- **Manter:** a prévia 3D girando no assistente de importação (o João gosta; não trocar por imagem parada).
- **Esconder o número:** "Ignorei 725 faces onde o dado não para" (D5Shard) confunde. São as facetas minúsculas das quinas arredondadas e da gravação (o STL é uma malha de triângulos; cada pedacinho plano conta como face). Decisão do João: não mostrar a contagem (`imp.dropped`, `ImportDie.tsx` linha ~317).
- **Calibração da forma livre confunde:** o contorno laranja marca a face em que o dado **está apoiado**. A prévia vira essa face para **longe da câmera** (`orientation(-n)`, linha ~197), como se a câmera fosse o "de cima", e desenha o contorno através do modelo (`Marker through`). O número que o jogador lê é o que fica virado para a câmera, em outra face. Parece que o assistente pede para numerar a face marcada. Proposta (conversada com o João em 2026-11-12):
  1. **Mostrar como ele cai na mesa:** o dado pousado num chão (disco de feltro), com a face de apoio encostada nele, visto de cima e de frente como a câmera do jogo.
  2. **Destacar o que fica para cima**, não a face de apoio. "Face oposta" nem sempre existe: num shard de 5 ou 7 lados, oposta a uma face longa fica uma **aresta**, entre duas faces. Então destacar a face (ou as faces) cuja normal aponta mais para cima, e marcar a face de apoio só de leve, encostada no chão.
  3. **Pergunta:** "Com o dado caído assim, que número você lê em cima?".
  4. A prévia girando continua no passo de antes (escolher modelo e cor); a pose acima só no passo de numerar.
- **De onde parte:** estilos em `src/index.css` (sem biblioteca de componentes), UI em `src/ui/` (`Controls`, `Chat`, `ImportDie`, `TablePanel`, `OmenOverlay`, `Safeguard`). Mapa em `docs/contexto/visao-geral.md`.
- **Cuidados:** os E2E acham os controles por papel e nome acessível (`getByRole('button', { name: … })`, `getByLabel`); manter os textos e papéis ou atualizar os testes junto. Não mexer no canvas 3D nem no desempenho (`docs/contexto/armadilhas.md`).
- **Perguntas para a spec:** direção visual (referências, paleta, tipografia)? Tudo de uma vez ou por painel? Mobile primeiro? Vale um design system mínimo (tokens de cor, espaçamento, botões) antes das telas?

## 5. Correções (não são refatoração visual)

### 5.1 Shard no resultado: mostra a face lisa com um número minúsculo

**Implementado em 2026-11-12** (spec `superpowers/specs/2026-11-12-gravacao-acesa-e-tinta-ao-vivo-design.md`).

- **O que acontece:** desde 2026-11-12 o dado de forma livre voa até a frente (spec `2026-11-12-forma-livre-voa-design.md`). `showcasePoses` vira para a câmera a face **de apoio** (a de baixo, que vale o resultado). Num shard importado com números gravados (D5Shard), essa face é uma face longa **lisa**: os números do modelo ficam nas pontas, do lado de cima. O jogador vê uma face azul vazia com o número em destaque minúsculo em cima dela (`poly.font` é pequeno porque as faces longas são estreitas). Visto pelo João em 10 D5 com tinta dourada na mesa da floresta.
- **Proposta (revista com o João):** o número do resultado é o **próprio número gravado**, com a tinta preenchendo o afundado, e não um texto solto em cima da face lisa. Vale para dado de forma livre **com números gravados** (`printed: true`):
  - `showcasePoses`: com `poly.readsDown`, virar a face de apoio para **longe** da câmera (usar `-normal` do rótulo; o "para cima" continua `label.up`). É a mesma vista da prévia de calibração (`orientation(-n)` em `ImportDie.tsx`), em que o jogador leu o número.
  - **Acender a gravação certa:** não se sabe qual número gravado é qual. Mas, com o dado apoiado na face A, o número lido é a gravação que fica **para cima**. Então acender só os triângulos de tinta (`geometry.userData.ink`, um por triângulo) cuja normal aponta para cima com o dado nessa pose (normal · −n_A acima de um limiar). Acender = clarear e pulsar a cor de vértice desses triângulos (mesmo ritmo do destaque, 0,9 Hz) mexendo só no atributo `color`. Sem material novo nem luz (não recompila shader; ver armadilhas.md).
  - `Hand.tsx`: esse dado **não** ganha o número em destaque solto (o `Text`); a gravação acesa é o destaque.
  - Testes: `tests/showcase.test.ts` (forma livre gravada: normal do rótulo aponta para longe da câmera) e uma função pura testada que escolhe os triângulos a acender. E2E do prisma em `e2e/import.spec.ts` ajustado.
- **Dado de forma livre sem gravação** (`printed: false`): continua como está hoje. O número é pintado por nós na face de apoio, que vira para a câmera com o número grudado nela, no tamanho que cabe na face.
- **Limite:** num shard, de cima podem aparecer duas gravações (as duas faces da aresta de cima). As duas acendem; é o que o jogador veria na mesa.

### 5.2 Tinta e acabamento ao vivo no assistente de importação

**Implementado em 2026-11-12** (spec `superpowers/specs/2026-11-12-gravacao-acesa-e-tinta-ao-vivo-design.md`).

- **Pedido:** ver a tinta dos números e o acabamento mudarem na prévia girando enquanto configura o dado, antes de salvar. Na mesa a tinta já funciona.
- **Hoje:** no último passo do assistente, trocar "Tinta dos números" (Automática/Dourada/Escura/Branca/Sem tinta) ou "Acabamento" (Gema/Fosco) não muda nada no dado girando. Causa: `InkChoice` só guarda `ink`/`surface` no estado do `ImportDie` (linha ~370) e eles só vão para o dado salvo (linha ~263); o `<Preview>` (linha ~305) não recebe nenhum dos dois e desenha sempre a gema com `color`. Corrigir: passar `ink` e `surface` para o `Preview` e pintar a gravação do mesmo jeito que o `Die` da mesa faz (`inkTriangles` / `userData.ink`, cores de `INK_COLORS`), com material fosco quando `surface === 'fosco'`. Conferir no jogo que a tinta e o fosco chegam ao dado na mesa depois de salvar (é o que o jogador vê de verdade).
