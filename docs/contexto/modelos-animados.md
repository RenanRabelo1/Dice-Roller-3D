# Modelos 3D animados: da IA ao site

Este guia leva um personagem gerado por IA até o site, animado e encostando direito no cenário. Ele vale para qualquer modelo e qualquer cena; os exemplos vêm do vampiro do par de críticos (OS-0101 e OS-0102). O caminho é:

**gerar → medir → esqueleto → pesos → animar (com contato) → prévia fiel → revisar → exportar → integrar.**

Tudo roda por script, no Blender sem interface (`blender --background --python`). Não há etapa manual além de gerar o modelo e aprovar a prévia. Os scripts do caso do vampiro estão em [`ferramentas/blender/`](../../ferramentas/blender/) e servem de exemplo completo:

| Script | Faz |
|---|---|
| `inspecionar.py` | Lê o GLB e imprime malhas, ossos, materiais, texturas, quads e dimensões. Renderiza frente, 3/4 e rosto |
| `esqueleto.py` | Escala, mede a malha, solda vértices, monta o esqueleto (dedos inclusos) e aplica os pesos automáticos |
| `animar.py` | Pesos rígidos, a coreografia inteira (curvas, IK, olhar, contato), o clipe, a exportação e a prévia na réplica da mesa |
| `close_mao.py`, `close_cabeca.py` | Closes de conferência (mão animada; cabeça e gola de lado, por trás e pela direção da câmera do jogo) |

O caso inteiro, com cada dificuldade e como foi contornada, está no [apêndice](#apêndice-o-caso-do-vampiro-19112026).

---

## 1. O que o modelo decide e o que a animação corrige

A animação só move o que a malha já tem. Antes de animar, veja o que o modelo fixou:

| O modelo decide | A animação corrige? | Exemplo (vampiro H2.5) |
|---|---|---|
| Rosto e textura | Não | O rosto veio derretido. Não há pose que conserte isso |
| Dedos separados ou fundidos | Não | Os dedos vieram fundidos. Articulados, a pele entre eles esticou e embolou |
| Proporções (braço, mão, cabeça) | Pouco | Os braços longos continuam longos |
| Forma em repouso (a curva da garra, as dobras da roupa) | Só disfarça | A curva da garra da malha furava a madeira até a mão ser reposicionada |
| Topologia (malha conexa ou com pedaços soltos) | Sim, com solda | Vértices duplicados nas costuras faziam os pesos automáticos falharem |
| Postura de repouso (T-pose) | Sim | A T-pose deixa o esqueleto alinhado aos membros |
| Movimento, ritmo, olhar, contato | Sim, é o trabalho da animação | — |

**Regra prática:** o que aparece de perto na tela (rosto, mãos) precisa vir bom do gerador. Se a malha não tem a parte (dedos separados), não a articule. Deixe-a rígida e troque o modelo.

---

## 2. Gerar (exemplo: Tripo AI)

- **Modo:** texto para 3D. Escreva o prompt em inglês, com a figura inteira e **T-pose** pedida explicitamente (no Tripo, o botão "Pose em T").
- **Modelo de IA:** o mais novo que você puder exportar. No plano grátis, o Tripo só exporta o H2.5 (15 por mês); H3.x pede assinatura. A diferença de qualidade no rosto e nas mãos é grande.
- **Configurações:**
  - textura de 2K no máximo (o site usa 1K);
  - "Remover iluminação" ligado, porque a luz é a da cena;
  - topologia Quad;
  - 40 mil polígonos.
- **Antes de pagar ou exportar, confira na própria visualização do gerador:** o rosto está coerente? Os dedos estão separados?
- **Exporte em GLB.** No navegador do app, o download pode chegar como `.tmp`. Confira o cabeçalho `glTF` e o tamanho antes de renomear.

Exemplo de prompt:
> Full body gothic vampire lord, gaunt pale adult man, slicked-back black hair with widow's peak, high rigid collar, long black cape, wine-red vest, long thin clawed fingers, realistic dark fantasy style, standing in T-pose, arms straight out horizontally, symmetrical

---

## 3. Medir antes de montar o esqueleto

Não suponha onde ficam os membros: meça na malha com `numpy`, a partir de `foreach_get('co')`.
- **Escala:** leve a altura a um valor conhecido (1,8) e os pés a z = 0.
- **Ombro:** a altura é a mediana de z dos vértices do braço estendido.
- **Eixo de cada membro:** o centro (y, z) de uma fatia fina em x. **Ponha as juntas nesse eixo, não no eixo do tronco.** No vampiro, o braço real ficava 10 cm atrás do tronco. Com os ossos fora do eixo, o cotovelo dobrava torto.
- **Dedos:** faça um histograma das fatias da mão. Se não houver vales entre os dedos, eles estão fundidos, e não vale articular.
- **Orientação de repouso:** para onde aponta a palma (as pontas dos dedos caem para -Z quer dizer palma para baixo) e para que lado dobra o cotovelo.

---

## 4. Esqueleto e pesos

1. **Solde os vértices duplicados** (`remove_doubles`, limite 0,0005 × altura). O UV não se perde, porque fica nos cantos das faces. Sem isso, os pesos automáticos (`ARMATURE_AUTO`) falham com "failed to find solution".
2. **Esqueleto mínimo:** quadril, coluna, peito, pescoço, cabeça, clavícula, braço, antebraço, mão, coxa, canela e pé. Crie dedos só se a malha os tiver separados.
3. **Pesos automáticos primeiro.** Depois, nos membros que dobram muito (braços, dedos), troque por **pesos rígidos com faixa curta na junta**:
   - cada vértice vai para o osso mais próximo;
   - só a faixa de ~3% da altura em volta da junta mistura com o osso vizinho, de 50% a 0%;
   - pesos por distância (1/d^n) espalham a dobra pela grossura da manga, e o braço curva como espaguete.
4. Preserve o peso total que o vértice tinha nesses grupos, para não mexer na mistura com o tronco.

---

## 5. Animar por script

### Roteiro antes de código (motion-design)
- Escreva a história em fases, presas aos marcos de tempo que a cena já tem.

  Exemplo, preso aos marcos do par: mãos agarram a borda (0–330 ms) → força e sobe (450–950) → encara o jogador (1000–1300) → tenta pegar o dado (2900–3600) → desiste (3600–4250) → afunda e as mãos soltam por último (4800–5600).
- **Três camadas:**
  - **principal:** tronco e braços;
  - **secundária:** follow-through, com o antebraço chegando 60 ms depois do braço e a mão 110 ms depois;
  - **ambiente:** respiração com período de ~1,4 s e balanço lento.
- **Preparação antes de todo esforço:** um encolher de ombros, um recuo.
- **Assimetria:** um lado atrasa uns 60 ms.
- **Nada linear:** use curvas por chave (`ease-in`, `ease-out`, `ease-in-out`, `back`).

### Ferramentas que funcionaram
- **Curvas por chave:** `curva(t, [(ms, valor, easing), ...])` serve para escalares e vetores, e o easing vale para o trecho até a chave.
- **Um osso por vez, em espaço de mundo:**
  - `girar(osso, eixo, graus)`;
  - `apontar(osso, direção)` (rotação mínima);
  - `aplicar_q(osso, quat)`, sempre com `view_layer.update()` depois.
- **IK de dois ossos (braço):**
  - você dá o ponto do **pulso** e a direção do **polo** (para onde aponta o cotovelo);
  - a lei dos cossenos dá o cotovelo;
  - em seguida, **controle a torção**: gire o osso no próprio eixo até a dobradiça de repouso coincidir com a do IK. Em T-pose com a palma para baixo, a dobradiça é -Z no braço esquerdo e +Z no direito.
  - Sem controlar a torção, a manga gira à toa e o cotovelo "quebra".
- **Faixa saudável do cotovelo: 90° a 150°.** Abaixo de ~80°, a malha embola. Meça o ângulo em todo quadro.
- **Alcance:** meça quanto o pulso não alcança o alvo. Se faltar alcance com a mão "presa" em algo, ela é arrastada para dentro da superfície. A correção é o corpo nunca descer além do alcance enquanto a mão está apoiada.
- **Olhar para a câmera:** calcule a posição da câmera do jogo no espaço do modelo, quadro a quadro. Divida a rotação: 35% no pescoço e o resto na cabeça.
- **Palma:** depois de apontar a mão, gire-a no próprio eixo para a palma encarar a superfície.
- **Grave quadro a quadro:**
  - todos os ossos, em 25 fps, em `keyframe_insert`;
  - use `scene.frame_start = 0`, porque o exportador glTF usa tempo = quadro / fps;
  - **tempo do clipe = relógio do efeito no site.**

---

## 6. Contato com o cenário

1. **Replique as superfícies da cena como caixas** (SDF de caixa) em unidades do site. Exemplo: o topo e a face interna da parede, o feltro, o dado.
2. **Mão rígida, que pousa e não atravessa:** depois de posar a mão, meça a pior penetração dos ossos dela. Se algum entrar, suba o alvo do pulso exatamente esse tanto e refaça o IK (até 4 vezes).
3. **Dedos com contato** (só com dedos separados): cada falange varre o ângulo até o desejado e para no primeiro contato, com a espessura do dedo de folga. A seguinte continua a partir dali, e é isso que faz o dedo contornar a quina. Se uma falange já começa dentro da superfície, a anterior dobra 10° a menos e o cálculo se refaz.
4. **Raiz fixa quando há contato:** se a mão precisa ficar presa no mundo, a raiz do modelo fica numa âncora fixa, e toda a subida e descida vai para o clipe. No site, o código só põe a raiz na âncora. **Mudar a âncora ou a escala no site quebra o contato**, então qualquer ajuste de enquadramento é feito no Blender.
5. **Meça a penetração em todo quadro** e imprima o pior osso. A meta é zero além de 1 cm, fora quadros de passagem.

---

## 7. Prévia fiel

- **Monte a réplica:** a mesa (caixas com as medidas do site), a câmera com a mesma posição, o mesmo alvo e o mesmo FOV vertical, e o chão.
- **Renderize** no Workbench, com cor da textura, a cada 2 quadros (`frame_step = 2`). Os arquivos saem numerados de 2 em 2: renumere antes do `ffmpeg`.
- **Folhas de contato:** `ffmpeg … select='eq(n\,k)+…',tile=2x4`, para comparar as fases lado a lado.
- **Closes de cada fase** (mão na borda, bote, recuo), de frente e de lado, numa câmera auxiliar.
- **GIF:** `palettegen` + `paletteuse`. **MP4:** `libx264 -crf 20`.
- A réplica não reproduz a luz do jogo e pode diferir alguns por cento no enquadramento. A palavra final é a captura no site.

---

## 8. Revisar antes de entregar

Não entregue nada sem passar por esta lista, em tamanho cheio:

- [ ] Cada fase do roteiro aparece e lê bem na câmera do jogo.
- [ ] Os closes de cada contato (mão, pé, objeto) não mostram nada atravessando.
- [ ] Os cotovelos e joelhos ficam na faixa saudável e não há membro "espaguete".
- [ ] A cabeça e as mãos ficam fora de barras e bordas da interface.
- [ ] Nada aparece antes da hora (por exemplo, a cabeça antes das mãos).
- [ ] Os números do log batem com o que se vê: alcance, penetração e ângulos.

O defeito que sobrar vai para a lista como defeito, nunca como "aceitável". **Número bom não substitui o olho:** penetração zero não quer dizer que a mão ficou bonita.

---

## 9. Exportar e integrar (three.js / R3F)

- **Exporte só o personagem** (`use_selection`): esqueleto e malha, com `export_animation_mode='ACTIONS'` e `export_image_format='WEBP'`. Antes, reduza as imagens a 1024 com `img.scale`. Exemplo: o vampiro foi de 7,8 MB para 3,5 MB.
- **Carregue com o leitor que o projeto já tem**, aqui o `parseGlb` de `shared/modelos3d`, que preserva `object.animations`. Não use loader novo.
- **`AnimationMixer` + `clipAction(par)`**, com `LoopOnce` e `clampWhenFinished`, e `mixer.setTime(t / 1000)` a cada quadro. É determinístico e segue o relógio do efeito.
- `frustumCulled = false` nos meshes com pele: os ossos levam a malha para fora da caixa de repouso.
- **Aqueça os shaders** no compile compartilhado quando o modelo chegar.
- **Tenha uma reserva** caso o arquivo não carregue (a figura antiga) e mostre só um `console.warn`.
- **`LoopOnce` + `clampWhenFinished` pausa a ação no fim.** Na segunda vez que o efeito toca, o `setTime` zera o tempo, mas a ação pausada não avança e a figura congela. Antes de cada `setTime`, faça `action.paused = false; action.enabled = true`. Teste com **duas rodadas seguidas no mesmo objeto**.
- **O `GLTFLoader` tira os pontos dos nomes** (`PropertyBinding.sanitizeNodeName`): o osso `braco.L` do Blender vira `bracoL` no three. Procure os ossos pelo nome sanitizado, ou dê nomes sem ponto já no Blender.
- **Raiz numa âncora fixa** quando o clipe tem contato com o cenário (seção 6): o código só faz `root.position.set(...ANCORA)` e `root.scale.setScalar(ESCALA)`, e a visibilidade vale para toda a duração do efeito.

---

## 10. Alvos que mudam a cada vez: IK em tempo real por cima do clipe

O clipe é fixo, mas alguns alvos mudam a cada jogada (o dado cai num lugar diferente). Esse caso não se resolve no Blender. Faça assim no site:

1. **O clipe continua mandando.** A cada quadro, depois do `mixer.setTime`, calcule um IK de dois ossos até o alvo real e misture com a rotação do clipe por `slerp(clipe, ik, peso)`.
2. **Peso numa função pura** de `t`, que sobe e desce com `smoothstep` só na janela do gesto. Fora dela, a figura é idêntica ao clipe que foi aprovado.
3. **Só rotação, nunca esticar.**
   - Os comprimentos dos ossos vêm do repouso e não mudam.
   - Fora do alcance, o punho para em `0,999 × (l1 + l2)` na direção do alvo. O braço estica até o limite e fica ali, e lê como tentativa.
   - Teste que a posição local e a escala dos filhos não mudam.
4. **A mesma torção anatômica do Blender:** gire cada osso no próprio eixo até a dobradiça de repouso coincidir com a do IK.
5. **A cabeça acompanha o alvo** com o mesmo peso, limitada a uns 40° de diferença do clipe.
6. **Alvos de apoio desviam do que está no caminho.** Exemplo: a mão no feltro procura o ponto livre mais próximo, a 1,3 unidade de qualquer dado.
7. **Um alvo que se move durante o gesto vira história.** No vampiro, o dado já está voando para a revelação quando a mão chega onde ele pousou. A mão chega tarde, e isso vira "tenta pegar e desiste".

---

## 11. Processo e papéis (como o caso foi conduzido)

- **Usuário:** escolhe e gera o modelo, define a coreografia em frases curtas ("as mãos aparecem primeiro, ele faz força e sobe…") e aprova a prévia e o resultado no site.
- **Orquestrador (sessão principal):** faz tudo do Blender (medir, esqueleto, pesos, clipe, prévia), revisa cada prévia antes de entregar, escreve as ordens de serviço e revisa e integra a entrega do dev.
- **Dev (Sonnet, esforço médio, worktree própria):** só o código do site, uma ordem por vez (OS-0101: carregar o GLB; OS-0102: âncora fixa; OS-0103: IK em tempo real), com testes de unidade e capturas. Sem E2E no meio do trabalho.
- **O ciclo que funcionou:** coreografia em palavras → clipe no Blender → prévia fiel → **revisão do orquestrador em tamanho cheio** → aprovação do usuário → GLB no branch → o dev puxa e ajusta o código → captura no jogo → o usuário confere no `dev:test`.
- **Para o usuário conferir rápido:** o dev deixa o `dev:test` no ar na worktree dele, e a cada GLB novo basta ele fazer `git merge` do branch base (o Vite serve o arquivo novo sem reiniciar).

---

## 12. Armadilhas que já morderam

| Armadilha | Sintoma | Correção |
|---|---|---|
| Ossos fora do eixo do membro | Cotovelo "quebrado" | Juntas no eixo medido da fatia |
| Pesos por distância | Braço espaguete | Pesos rígidos com faixa curta na junta |
| Dobra acima de ~100° | Manga embolada | Alvos mais longe; cotovelo entre 90° e 150° |
| Torção livre no IK | Manga girando, dobra para o lado errado | Alinhar a dobradiça de repouso à do IK |
| Dedos fundidos articulados | Dedos emaranhados, pele esticada | Mão rígida; trocar o modelo |
| Corpo abaixo do alcance com a mão apoiada | A mão afunda na superfície | O corpo só desce depois que a mão solta |
| A mão sai pela frente ao soltar | Atravessa a parede | Recuar para trás da parede antes de descer |
| Câmera alta vendo por cima da parede | A cabeça aparece antes da hora | Queixo no peito e ombros encolhidos; inclinar para trás tira o alcance das mãos |
| Comentário no meio de uma lista de chaves | Chaves somem e o movimento se arrasta | Comentário em linha própria, acima da lista |
| Recalibrar a âncora no site | As mãos saem do lugar | Enquadramento se ajusta no Blender |
| Download do navegador como `.tmp` | "Não baixou" | Conferir o cabeçalho `glTF` e o tamanho |
| Quadros com `frame_step = 2` | O `ffmpeg` só lê o primeiro | Renumerar a sequência |
| Olhar todo no pescoço e na cabeça com o tronco inclinado | A gola alta corta o rosto | O peito faz ~40% do olhar (menos durante um alcance, senão o braço perde o alcance) |
| `LoopOnce` + `clampWhenFinished` | A figura congela na segunda rodada | `paused = false; enabled = true` antes de cada `setTime` |
| Ossos procurados com o nome do Blender | `getObjectByName('braco.L')` não acha | O `GLTFLoader` tira os pontos: `bracoL` |
| Alvo fixo no clipe para um objeto que muda de lugar | A mão vai para o feltro vazio | IK em tempo real por cima do clipe (seção 10) |
| Réplica da prévia com enquadramento um pouco diferente do jogo | Margem do topo diferente no site | Confirmar na captura do jogo; ajustar no Blender, não na âncora |
| Exportar do gerador no plano grátis | O botão Exportar pede assinatura | No Tripo, o grátis exporta só o H2.5 (15 por mês) |
| Mão rígida com garra curva na malha | As pontas furam a superfície | Alvo do pulso empurrado para cima até não penetrar; nós dos dedos na quina |
| Entregar sem revisar em tamanho cheio | O usuário acha o defeito antes de você | Lista de defeitos da seção 8 antes de toda entrega |

---

## Referência de comandos

```powershell
# Blender sem interface, com argumentos para o script depois de --
& "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" --background modelo.blend --python animar.py -- saida.glb pasta_quadros
# Folha de contato de quadros escolhidos
ffmpeg -i s_%04d.png -vf "select='eq(n\,5)+eq(n\,25)',tile=1x2" -frames:v 1 folha.png
# GIF com paleta
ffmpeg -framerate 12.5 -i s_%04d.png -vf "scale=800:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" -loop 0 previa.gif
```

```powershell
# O pipeline do vampiro, na ordem (os arquivos de trabalho ficam em temp/modelos/, fora do git)
$b = "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe"
& $b --background --factory-startup --python ferramentas\blender\esqueleto.py -- temp\modelos\vampiro-h25.glb temp\modelos\vampiro-h25-rig.glb temp\modelos\prev
& $b --background temp\modelos\vampiro-h25-rig.blend --python ferramentas\blender\animar.py -- temp\modelos\vampiro-anim.glb temp\modelos\prev\anim
Copy-Item temp\modelos\vampiro-anim.glb public\modelos\vampiro.glb
```

---

## Apêndice: o caso do vampiro (19/11/2026)

A sequência real, com cada dificuldade e como foi contornada. Os números de ordem estão em `docs/ordens/`.

1. **Ponto de partida.** O vampiro do par era procedural (OS-0099 e OS-0100): esferas e cilindros esculpidos por código. O usuário achou que quebrava a imersão. **Decisão:** modelo do Tripo AI, animação no Blender por script, e o código do site só carrega e posiciona.
2. **Gerar.**
   - O H3.1 saiu bom (rosto coerente, gola, colete, garras), mas o plano grátis não exporta H3.x.
   - O H2.5, que o grátis exporta, saiu com o rosto derretido e os dedos fundidos.
   - **Contorno:** usar o H2.5 como modelo de teste para provar o caminho inteiro antes de pagar o Pro.
   - O download chegou como `.tmp`. Conferido pelo cabeçalho `glTF` e pelo tamanho declarado.
3. **Esqueleto.**
   - Os pesos automáticos falharam ("failed to find solution"). **Contorno:** soldar os vértices duplicados das costuras de UV (de 52.725 para 39.219 vértices).
4. **Primeira integração (OS-0101).**
   - GLB parado, posicionado por código, com reserva procedural. Funcionou, mas com o tronco a 32° só o busto passava da parede (11% da tela).
   - Debruçado a 60°, ficou maior, mas "deitado sobre a mesa" e sem animação nenhuma. **O usuário rejeitou:** "é só um modelo que sobe e desce".
5. **Primeira animação (motion-design).**
   - Roteiro, camadas, follow-through, olhar calculado para a câmera.
   - **Rejeitada:** braços abertos em crucifixo, braços espaguete, a mão atravessando a mesa na entrada.
6. **Coreografia do usuário:** as mãos agarram a borda, ele faz força e sobe, encara, tenta pegar o dado, desiste e sai, e as mãos soltam por último.
   - Exigiu **IK** (mão presa na borda) e **raiz fixa**: a subida passou a ser do clipe (OS-0102).
   - A cabeça atravessava a parede ao subir. **Contorno:** subir reto e só depois avançar sobre a borda.
   - **Bug meu:** um comentário engoliu as chaves da subida, que passou a se arrastar de 380 a 3.900 ms. Achado ao medir.
7. **"O braço continua quebrado no cotovelo, a mão não agarra".**
   - **Medido:** cotovelo entre 55° e 65° e até 16° no bote. **Contorno:** pegada aberta e alvos mais longe (cotovelo entre 90° e 132°).
   - **Medido:** os ossos do braço estavam 10 cm fora do eixo da manga. **Contorno:** juntas no eixo medido e controle da torção (dobradiça anatômica).
   - A mão pendia na vertical, no ar. **Contorno:** o alvo passou a ser o pulso, com a mão deitada no topo da parede e a palma virada para a superfície.
   - Pesos por distância faziam o braço curvar como banana. **Contorno:** pesos rígidos com faixa curta na junta.
8. **Dedos.**
   - "Parece um macarrão." Foram criadas 3 falanges por dedo, com as faixas medidas na largura da mão.
   - Os dedos entravam na madeira e no dado. Foi feito o contato por falange (SDF), com recuo da falange anterior.
   - **O usuário mandou o close:** dedos emaranhados. **Causa:** os dedos fundidos do H2.5 impõem um teto que a animação não passa. **Contorno:** mão rígida, com a curva da própria malha, e o pulso empurrado para fora até não penetrar. Os dedos articulados ficam para um modelo com dedos separados.
   - **Lição de processo:** o close emaranhado tinha sido entregue como "aceitável". Daí a regra da seção 8 e uma memória do agente: revisar em tamanho cheio e nunca chamar defeito visível de aceitável.
9. **A cabeça aparecia antes das mãos.** A câmera do jogo vê de cima por trás da parede.
   - Inclinar o tronco para trás tirava o alcance das mãos.
   - **Contorno:** tronco quase reto, queixo no peito e ombros encolhidos. Sobra o topo da cabeça, abaixada e sem rosto, junto com as mãos. Foi aceito e declarado como limite.
   - A cabeça encostava no topo da tela no auge. **Contorno:** baixar o auge no Blender, não na âncora do site.
10. **No site.**
    - **Congelava na segunda rodada:** `LoopOnce` + `clampWhenFinished`. Corrigido, com um teste de duas rodadas.
    - **A gola cortava o rosto ao encarar o jogador:** o peito passou a fazer 40% do olhar.
    - **O bote ia para o feltro vazio:** o alvo era fixo. **Contorno:** IK em tempo real por cima do clipe, só com rotação e sem esticar o braço (OS-0103). A mão de apoio desvia dos dados.
11. **Limites que ficaram, à espera do modelo final (H3.1):**
    - o rosto;
    - dedos articulados (só com dedos separados);
    - os braços compridos;
    - a capa sem ossos;
    - o topo da cabeça visível na chegada.
