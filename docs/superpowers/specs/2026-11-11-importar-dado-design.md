# Importar um dado 3D: design (caminho A)

Data: 2026-11-11 · Status: aprovada e implementada (MVP) · Branch: `dev-jg`

## 1. Objetivo

O jogador importa um modelo 3D de dado (arquivo `.stl` ou `.glb`), informa os números das faces se o modelo tiver números próprios e passa a rolar esse dado como qualquer outro. O dado importado fica salvo no navegador (sem banco), aparece na seleção e no chat e funciona com a física, o resultado, o showcase e os presságios.

**Caminho A (este documento):** o modelo precisa ter a forma de um dado conhecido (d4, d6, d8, d10, d12 ou d20). Formas livres (d3, d7, d30, dado-caveira) ficam para o caminho B, que reaproveita tudo daqui.

## 2. Pesquisa: como os dados 3D circulam na web

Não existe um formato padrão de "modelo de dado". Há três práticas de fato:

| Onde | Formato | Como sabe o número de cada face |
|---|---|---|
| Impressão 3D (Thingiverse, Printables, MakerWorld, MyMiniFactory) | **STL** em mm; tamanhos variam (d6 de 16 mm é comum; d20 medido entre faces, arestas ou vértices) | Números esculpidos (em baixo ou alto relevo). Opostas somam N+1 no layout padrão, mas há layouts "balanceados" e spindown |
| Mesas virtuais na web (Dice So Nice/Foundry, dice-box) | **glTF/GLB** + um JSON de configuração do conjunto; dice-box usa malhas próprias e `theme.config.json` | A geometria e a numeração são da ferramenta; o modelo veste o dado. Importar um conjunto próprio é descrito como "um processo difícil" |
| Tabletop Simulator | **OBJ** + textura; colisor simples (< 255 triângulos) | **Rotation values**: para cada face, o criador grava a orientação em que ela fica para cima e o valor que ela mostra |

Fontes: [Fantastic Dice: themes](https://fantasticdice.games/docs/themes), [3d-dice/dice-themes](https://github.com/3d-dice/dice-themes), [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice/), [Forge: pacote DSN = JSON + GLB](https://forums.forge-vtt.com/t/is-it-possible-for-me-to-use-my-own-custom-dice-as-a-player-in-a-friends-campaign/18110), [TTS: Custom Model](https://kb.tabletopsimulator.com/custom-content/custom-model/), [TTS: Gizmo/Rotation Value](https://kb.tabletopsimulator.com/game-tools/gizmo-tool/), [Printables: conjunto padronizado](https://www.printables.com/model/346350-dice-set), [all3dp: dados para imprimir](https://all3dp.com/2/3d-printed-dice-stl/).

O que seguimos:

- **Entrada:** STL (onde está a maioria dos dados prontos) e GLB (padrão da web, com cor e textura). O GLB é autocontido; `.gltf` com arquivos externos e OBJ ficam de fora.
- **Unidade e eixo são ignorados:** mm, escala e "Z para cima" variam entre arquivos, então o modelo é sempre recentrado e reescalado para o tamanho dos nossos dados.
- **Numeração por calibração**, como os rotation values do TTS: cada face fica associada ao valor que mostra e à direção "para cima" do numeral. A soma das opostas é só uma sugestão que o usuário pode corrigir (layouts balanceados e spindown não a seguem).
- **Colisor simplificado**, como o TTS recomenda: a física não usa a malha detalhada.

## 3. Escopo

**Dentro (MVP):** d4, d6, d8, d10, d12 e d20 importados de STL ou GLB; detecção da forma; numeração automática (modelo liso) ou calibrada (modelo com números); nome próprio; salvo no IndexedDB; botão na seleção; notação no chat; presságios para d20 importado; excluir dado importado.

**Fora (depois):** d100 importado (os d100 reais são bolas de 100 cavidades, sem relação com o nosso sólido); moeda importada (precisa de colisor próprio, ver `armadilhas.md`); formas livres (caminho B); exportar e compartilhar (proposta: GLB com a calibração em `extras`, campo previsto pelo glTF); renomear; texturas pintadas pelo usuário.

## 4. Requisitos

| ID | Requisito |
|---|---|
| R1 | Importar `.stl` (binário ou ASCII) ou `.glb` de até **10 MB** e até **50 mil triângulos**; outro formato ou limite estourado mostra erro em pt-BR e não salva nada |
| R2 | Detectar a forma pela contagem de faces planas: 4, 6, 8, 10, 12 ou 20. Sem forma reconhecida → erro "Não reconheci um d4–d20 nesse modelo" |
| R3 | A física e a leitura usam um poliedro **reconstruído dos planos das faces do modelo**, não a malha detalhada nem o nosso poliedro padrão |
| R4 | Modelo liso: o app numera no layout padrão (opostas somam N+1) e desenha os numerais |
| R5 | Modelo com números: o usuário informa o valor de cada face (d4: de cada vértice) com a face voltada para a câmera, pode girar o numeral até ficar em pé e recebe a oposta preenchida como sugestão editável |
| R6 | A calibração só termina quando cada valor esperado aparece uma única vez (1..N; no d10, 0..9, aceitando "10" como 0) |
| R7 | O dado ganha nome (1 a 24 caracteres) e um apelido para o chat sem acentos nem espaços, único e diferente dos sufixos existentes (`v`, `vampiro`, `fome`, `fogo`) |
| R8 | Fica salvo no IndexedDB deste navegador e volta depois de recarregar a página. Sem IndexedDB (aba anônima, bloqueio), o dado funciona só na sessão e o painel avisa isso |
| R9 | Aparece em "Meus dados" na seleção (botões + e −) e no chat como `2d20caveira`; respeita o limite de 10 dados por arremesso |
| R10 | Rola como os outros: pré-simulação (worker ou fallback), mesmo `throwId`, showcase, número em destaque e reduced motion |
| R11 | Um d20 importado entra nos críticos e nas falhas (raio, sangue, dualidade) se a opção "conta como d20 nos críticos" estiver ligada (padrão: ligada) |
| R12 | Excluir um dado importado pede confirmação, remove do IndexedDB e o tira da seleção atual |
| R13 | O resultado publicado é sempre a face que o modelo mostra para cima (mesma garantia dos dados de hoje) |

## 5. Fluxo do usuário

Botão **Importar dado** em "Meus dados" abre um painel lateral com quatro passos:

1. **Arquivo:** arrastar ou escolher `.stl` / `.glb`. Mostra nome, tamanho e triângulos.
2. **Forma:** "Reconheci um **d20**". Prévia 3D girando. Opção "conta como d20 nos críticos" (só no d20). Para STL, que não tem cor, escolha da cor da gema (padrão: a do dado base).
3. **Numeração:** "Esse modelo já tem números?"
   - **Não** → numeração automática, segue para o passo 4.
   - **Sim** → uma face por vez, voltada para a câmera: campo "Que número está nesta face?", botão ↻ (gira o numeral em passos de 360°/lados da face) e progresso ("7 de 20"). Ao confirmar uma face, a oposta recebe N+1−v como sugestão. No d4 a pergunta é "Que número você lê quando ele cai assim?", com um vértice para cima.
4. **Salvar:** nome, apelido para o chat (sugerido a partir do nome) e Salvar. O dado já entra na seleção.

## 6. Design técnico

### 6.1 Pipeline de importação (`dice/importer.ts`, puro, testado em Node)

1. **Ler:** `STLLoader.parse(bytes)` ou `GLTFLoader.parseAsync(bytes)`, ambos de `three/examples/jsm/loaders` (já instalados). No GLB, um `LoadingManager` com `setURLModifier` recusa qualquer URL que não seja `data:` ou `blob:` (nada de rede). Junta as malhas num só conjunto de posições, aplicando as transformações do grafo.
2. **Limites:** tamanho do arquivo, triângulos, texturas de até 2048 px.
3. **Casco:** `ConvexHull` (já usado em `polyhedra.ts`) sobre os vértices sem duplicatas.
4. **Faces planas:** agrupar os triângulos do casco por normal (tolerância ~3°), somando área. Quinas arredondadas e números em alto relevo viram grupos pequenos.
5. **Forma:** para N em {4, 6, 8, 10, 12, 20}, aceitar quando os N maiores grupos somam ≥ 60% da área do casco, o grupo seguinte tem menos de 25% da área do menor dos N e, exceto no d4, cada normal tem uma oposta. Nenhum N passa → erro R2.
6. **Poliedro ideal:** intersectar os N planos (cada trio de planos, mantendo os pontos que estão dentro de todos) → vértices nítidos. Esse sólido é colisor, faces e leitura (R3). Rapier recebe poucas dezenas de pontos, como hoje.
7. **Encaixe:** centro = centróide do volume do poliedro ideal; escala = `RADIUS[base] / circunraio`. `fit = { center, scale }` vale para o colisor e para a malha visual.
8. **Numeração:** o poliedro passa pelo mesmo código que monta os nossos (`build`, extraído para `fromTriangles(shape, tris)`), que já calcula faces, valores padrão e rótulos. A calibração (R5) só substitui `value` e `up` de cada face, casando pela normal.

### 6.2 Registro salvo (`dice/custom.ts`)

```ts
type CustomKind = `custom:${string}`;          // DieKind passa a ser BuiltinKind | CustomKind
interface CustomDie {
  version: 1;
  id: string;                                   // crypto.randomUUID()
  name: string; slug: string;                   // "Caveira", "caveira"
  base: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
  omens: boolean;                               // R11 (só tem efeito no d20)
  file: { format: 'stl' | 'glb'; name: string; bytes: ArrayBuffer };
  fit: { center: Vec3; scale: number };
  poly: Polyhedron;                             // poliedro ideal já numerado (faces, tops, labelList)
  printed: boolean;                             // modelo tem numerais próprios → não desenhar os nossos
  color: string | null;                         // cor da gema para STL
}
```

- O poliedro fica salvo pronto: recarregar a página não recalcula nem muda a calibração.
- `custom.ts` mantém em memória os dados carregados e expõe `customDie(kind)`, `baseOf(kind)`, `nameOf(kind)`. `polyhedron(kind)` consulta o registro para `custom:*`.
- Tabelas indexadas por kind (`GEM`, `BASE`) passam a ser lidas por essas funções; `KINDS` continua só com os dados embutidos, e os importados vêm depois na ordem de criação (`sortDice`).

### 6.3 Armazenamento (`dice/customStore.ts`)

- IndexedDB nativo, sem dependência: banco `dice-roller` v1, store `customDice` (`keyPath: 'id'`). O `ArrayBuffer` vai direto, sem base64.
- Ao montar o app: `listCustomDice()` → registro em memória + `useDice.customs`. Toda chamada em try/catch; falhar ao abrir o banco liga o modo "só nesta sessão" (R8). Cota estourada no salvar → erro em pt-BR, dado não salvo.
- Seleção com um kind que não existe mais é filtrada em `setDice`.

### 6.4 Física e worker

- `RollRequest` ganha `customs: Record<CustomKind, Polyhedron>` com os importados da seleção; o worker os registra antes de `presimulate`. O fallback síncrono já tem o registro.
- `presimulate` não muda: `convexHull(poly.points)`, materiais e `DAMPING` do dado base.
- `toResults`: d10 importado também converte 0 → 10 (via `baseOf`).

### 6.5 Cena

- `Die.tsx`: kind importado renderiza a malha do arquivo com `fit` aplicado, num grupo chamado `gem-${i}` dentro de `die-${i}` (mesmos nomes usados pelo resto). STL usa o material de gema com `color`; GLB mantém os materiais (clonados e com `transparent` ligado, para o fade de opacidade do retorno).
- **Sombras:** `Hand.tsx` liga/desliga `castShadow` em `gem-i`, que no GLB é um grupo. Trocar por um `traverse` nas malhas do grupo.
- **Numerais:** `printed: false` → `useNumbers` como hoje, a partir de `poly.labelList`. `printed: true` → só âncoras invisíveis em `userData.labels` (o test hook e o showcase continuam achando a face pelo valor).
- Showcase e número em destaque não mudam: usam `labelList` (normal e `up` calibrados) e `FONT[poly.shape]`, que é a forma base.

### 6.6 Presságios, notação e UI

- `omen.ts`: `isD20(kind)` = `'d20'` embutido ou importado com base d20 e `omens: true`. Substitui `dice[i] === 'd20'` em `omen.ts` e `Omens.tsx`. As checagens de d100 e de moeda continuam iguais (fora do escopo).
- `notation.ts`: `parseDice(text, customs)` acrescenta `${faces}${slug}` à lista de sufixos, mantendo do mais longo ao mais curto. `formatDice`/`dieName` mostram "d20 Caveira". A mensagem de erro e a dica do chat citam os importados.
- `Controls.tsx`: grupo "Meus dados" depois dos embutidos, com +/−, o botão de excluir (R12) e **Importar dado**.
- `ui/ImportDie.tsx`: painel do assistente no padrão do chat (`aside`, `inert` quando fechado, Esc fecha). A prévia usa um `<Canvas>` próprio, montado só com o painel aberto.

## 7. Segurança e limites

- Arquivo do usuário é dado não confiável: limite de tamanho antes de ler, `parse` dentro de try/catch, nenhuma URL externa no GLB, nada do arquivo vai para o DOM como HTML.
- Nome e apelido só como texto (React escapa); apelido restrito a `[a-z0-9]`.
- 50 mil triângulos × 10 dados pesa no SwiftShader: o teste de desempenho ganha um caso com 10 dados importados no limite.

## 8. Testes

**Vitest (Node):**
- `importer`: para cada base, gerar o modelo a partir do nosso próprio poliedro (sem e com quinas chanfradas) → forma certa, N faces, normais opostas; uma caixa achatada e uma esfera → erro de forma; limite de triângulos.
- Poliedro ideal: pontos dentro dos planos, circunraio = `RADIUS[base]` após o encaixe.
- Calibração: valores repetidos ou faltando são recusados; "10" no d10 vira 0; a sugestão da oposta pode ser sobrescrita (layout spindown).
- `notation`: `2d20caveira`, apelido mais longo vence, conflito com sufixos embutidos recusado.
- Física: um d20 importado chanfrado rola com `simulate`, termina dentro da bandeja, resultado de 1 a 20 e determinístico.
- `omen`: d20 importado com e sem `omens`.

**Playwright:** fixture pequena `e2e/fixtures/d20-liso.stl`, gerada por script a partir do nosso d20 → importar pelo painel, numeração automática, rolar, a face de cima é o resultado publicado; recarregar e o dado continua lá; excluir; um STL inválido mostra erro. O test hook ganha `customs()` para listar os importados.

## 9. Riscos

- **Faces planas falsas:** dados muito arredondados ou com números grandes em alto relevo podem falhar na detecção. Mitigação: as tolerâncias do passo 6.1.5 são calibradas com modelos reais baixados antes de fechar o MVP; o erro explica o motivo.
- **Contraste em STL:** numerais esculpidos num material de gema translúcido podem ficar pouco legíveis. Se acontecer, oferecer o acabamento "fosco" para STL.
- **d10 com proporções diferentes:** a reconstrução pelos planos do próprio modelo cobre isso (não comparamos com o nosso d10).
- **Tamanho do bundle:** `GLTFLoader` e `STLLoader` entram só no painel e no registro (import dinâmico), sem pesar no primeiro carregamento.

## 10. Decisões em aberto

1. Notação do chat no formato `2d20caveira`?
2. Limites de 10 MB e 50 mil triângulos?
3. "Conta como d20 nos críticos" ligado por padrão?

## 11. Ordem de construção

1. Extrair `fromTriangles` de `build` (sem mudar os dados de hoje; os testes atuais precisam continuar verdes).
2. `importer.ts` + testes (detecção, poliedro ideal, encaixe, calibração).
3. Tipo dinâmico + `custom.ts` + `baseOf`/`isD20` nos pontos que comparam kind.
4. IndexedDB + hidratação no store.
5. Worker com `customs`; teste de física.
6. Renderização em `Die.tsx` (STL e GLB) + sombras por `traverse`.
7. Painel do assistente + "Meus dados" + notação.
8. E2E, medição de desempenho, atualização de `docs/contexto/dados.md` e `arremesso.md`.

## 12. Notas da implementação

- **Tolerâncias (6.1.5).** Valem as da spec (3° para agrupar, ≥ 60% da área, próximo grupo < 25% da menor face) mais uma regra que faltava: as N faces precisam ser parecidas (a menor tem ≥ 50% da área da maior); sem ela uma caixa achatada passava por d6. Com sólidos nossos chanfrados (cada canto de cada face puxado para dentro), a detecção acerta d4–d20 até ~12% de chanfro.
- **Calibração por índice, não por normal.** `fromTriangles` é determinística: refazê-la sobre os mesmos triângulos mantém a ordem das faces, então a calibração é um vetor de valores/giros indexado pela face (d4: pelo vértice) em `renumbered`.
- **Opostas.** O sólido ideal torna cada par de planos opostos exato e simétrico (a numeração precisa de opostas); o centro do modelo sai de um ajuste por mínimos quadrados dos pares.
- **d4 na calibração.** A pergunta é "Que número você lê no vértice voltado para você?" (o vértice vem para a câmera, em vez de para cima).
- **Fixtures.** Em vez de um `.stl` binário versionado, o E2E gera os modelos a partir dos nossos sólidos (`tests/helpers/models.ts`): STL/GLB chanfrados, girados e deslocados como um export de fatiador, e um d20 de ~48 mil triângulos para o caso pesado (10 dados rolam e mostram em ~11 s no SwiftShader).
- **Validação com STL real.** `d20.stl` de [tedivm/dice_models](https://github.com/tedivm/dice_models/blob/HEAD/demo/demo_output/curve_low/d20.stl) (MIT, `demo/demo_output/curve_low/d20.stl`, 902 084 bytes, 18 040 triângulos, d20 numerado e arredondado para impressão): reconhecido como **d20** com 20 faces planas, sólido ideal com 20 faces, **sem ajuste** das tolerâncias da seção 6.1.5. Arquivo só lido como dado, fora do repositório e não versionado. Não testado: dados desse repositório com números mais fundos e mais triângulos (~3,7 MB ≈ 74 mil triângulos) passam do limite de 50 mil e seriam recusados pelo limite.
