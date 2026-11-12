# Dados: tipos, geometria, numeração, leitura, notação

Cobre `src/dice/*`, `scene/Die.tsx` e `ui/Chat.tsx`/`ui/Controls.tsx`. Tudo em `dice/` é puro (sem React) e testado em Node.

## Tipos (`dice/polyhedra.ts`)

```ts
Shape       = 'd4'|'d6'|'d8'|'d10'|'d12'|'d20'|'d100'|'coin'|'livre'  // corpo físico ('livre' só existe em importados)
BuiltinKind = Shape | 'vtm' | 'hunger' | 'fire'
DieKind     = BuiltinKind | `custom:${string}`                 // o que o jogador escolhe
KINDS       = os embutidos em ordem canônica; allKinds() = KINDS + importados (ordem de criação)
BASE        = só os embutidos (vtm, hunger → d10; fire → d6); use baseOf(kind), que também cobre importados
```

Dado personalizado = mesmo corpo/numeração/leitura do `BASE`; muda só a aparência (cor, tinta, símbolos).

## Geometria

`polyhedron(kind)` (com cache) → `{ shape, radius, points, triangles, faces, tops, labelList }`.

| Shape | Origem | Observação |
|---|---|---|
| d4, d8, d12, d20 | `Tetrahedron/Octahedron/Dodecahedron/IcosahedronGeometry` | |
| d6 | `BoxGeometry` com aresta tal que circunraio = `RADIUS.d6` | |
| d10 | `trapezohedronTriangles` (trapezoedro pentagonal feito à mão) | faces 0–9 |
| d100 | `hundredTriangles`: 100 faces tangentes a pontos de Fibonacci, via `ConvexHull` | **um único sólido**, não 2×d10 |
| coin | `coin()`: prisma de 48 lados, fino; só as tampas são faces | anel decorativo só no desenho |

`fromTriangles(shape, tris, numbering?)` (a antiga `build`, extraída) agrupa triângulos por normal em faces lógicas e numera:
- Opostas somam `OPPOSITE_SUM` (d6 7, d8 9, d10 9, d12 13, d20 21), ordem por altura/ângulo da normal.
- d100: `((rank * 37) % 100) + 1` espalha 1–100 pela esfera.
- d4: numeração por **vértice** (`tops`); cada número aparece em 3 faces.
- 6 e 9 ganham ponto (`6.`, `9.`) em d10/d12/d20/d100.
- `numbering` opcional (`values` por face, d4: por vértice; `turns` em passos de 360°/lados) troca valores e gira o numeral: é assim que a calibração de dado importado entra. A oposta é a face mais oposta (exata nos dados embutidos, a mais próxima num modelo).

`RADIUS` (circunraio) por shape; `MAX_RADIUS` em `physics/world.ts` deve ser o máximo.

## Leitura (`dice/read.ts`)

- `readUp(poly, q)` → `{ value, tilt }`: maior produto escalar com +Y entre normais das faces (d4: direções dos vértices).
- `toResults(dice, raw)`: d10 (incluindo vtm/hunger) `0 → 10`; moeda 1 = Cara, 2 = Coroa; resto igual.

## Símbolos (`dice/symbols.ts`)

`SymbolName = ankh | crit | skull | fangs | heads | crown`. Desenhos originais em `Shape` do three, plano XY, 1 unidade de altura, geometria em cache e compartilhada (não dar `dispose`).

Mapa por face (`SYMBOL` em polyhedra.ts, por dígito do d10, 0 = 10):

| Kind | 1 | 2–5 | 6–9 | 10 |
|---|---|---|---|---|
| `vtm` (Vampiro, preto) | vazio | vazio | ankh | crit (ankh no anel) |
| `hunger` (Fome, vermelho) | skull | vazio | ankh | fangs |

Face vazia ainda tem um `Label` (texto `''`) para o showcase achar a face sorteada pelo valor. Moeda: `heads`/`crown` nas tampas.

## Renderização do dado (`scene/Die.tsx`)

- `<RigidBody type="kinematicPosition" ccd>` + `ConvexHullCollider` (a cena nunca simula dinâmica; ver arremesso.md).
- Nomes de objeto usados por outros módulos e testes: `die-${i}` (grupo), `gem-${i}` (malha; **grupo** num dado importado, então a sombra liga/desliga com `traverse`, ver `shade` em `Hand.tsx`).
- Aparência de gema sem passe de refração: `meshPhysicalMaterial` com clearcoat, `ior`, opacidade 0,88. Moeda: metal dourado opaco.
- Paletas: `GEM` (cor por kind), `INK` (cor do numeral; gemas claras usam tinta escura), `EMBER` (fogo brilha), `FONT` (tamanho do numeral por shape), `SYMBOL` (altura do símbolo em tamanhos de fonte).
- **Um objeto por dado para todos os numerais**: `BatchedText` (troika) ou, em dado com símbolos, uma malha com os símbolos mesclados. Os membros ficam em `userData.labels` (testes leem dali).

## Notação e painel (`dice/notation.ts`)

`parseDice(text, customs = customList())` → `{ dice }` ou `{ error }` (mensagens em pt-BR):
- Ignora espaços, `+` e caixa. Aceita `2d10 + d100` e compacto `2d10d100d4`.
- Sufixos depois do `d`, do mais longo ao mais curto: `10vampiro`, `10fome`, `6fogo`, `10v`, `100`, `20`, `12`, `10`, `8`, `6`, `4` e, para cada dado importado, `<faces><apelido>` (`20caveira`). `slugProblem` valida o apelido (letra + letras/números, até 16, único, fora das palavras do chat); `slugOf(nome)` sugere um.
- `boladefogo` = 8×`fire`. `moeda` / `2 moedas`.
- Ambiguidade (`2d102d4`) resolvida com backtracking (prefere a leitura em que todos os dados existem).
- Mais de `MAX_DICE` → erro.

`formatDice(dice)` → `"2d10 + 1d10 Vampiro + 2 moedas"`. `dieName(kind)` → nome de exibição. `resultText(dice, results)` → `{ total, detail }`: total soma dados (moedas nunca somam; só moedas → "Cara", "2 caras, 1 coroa").

UI: `Controls.tsx` (um botão por kind + "−"; grupo "Meus dados" com os importados, 🗑 e **Importar dado**; painel `data-testid="result"`, dicas por fase) e `Chat.tsx` (tecla `C` abre, `Esc` fecha, Enter/Aplicar → `setDice`).

## Dados importados (`dice/custom.ts`, `importer.ts`, `customStore.ts`, `ui/ImportDie.tsx`)

O jogador importa um modelo `.stl` ou `.glb` de d4/d6/d8/d10/d12/d20 (spec: `docs/superpowers/specs/2026-11-11-importar-dado-design.md`). d100 e moeda **não** entram; qualquer outro sólido convexo entra como **dado de forma livre** (seção abaixo).

Pipeline (`importModel`, puro, testado em Node):
1. `readModel`: limites **10 MB / 50 mil triângulos / textura 2048 px**; STL via `STLLoader` (normais recalculadas), GLB via `GLTFLoader` com `LoadingManager.setURLModifier` que só aceita `data:`/`blob:` (nada de rede).
2. `detectPlanes`: casco convexo dos vértices; triângulos do casco agrupados por normal (3°); forma = o menor N em {4,6,8,10,12,20} cujas N maiores faces cobrem ≥ 60% da área, a seguinte tem < 25% da menor delas, as N são parecidas (menor ≥ 50% da maior: uma caixa achatada não é dado) e, exceto d4, cada normal tem oposta (dot < −0,995). Senão: "Não reconheci um d4–d20 nesse modelo". Testado com chanfros de até ~12%.
3. `idealSolid`: planos opostos viram pares exatos e simétricos (e dão o centro do modelo, por mínimos quadrados); cantos = interseção de 3 planos que cabem em todos; o sólido é escalado para `RADIUS[base]`. `poly` (colisor, faces, leitura) é esse sólido, **não** a malha; `fit = { center, scale }` põe a malha do arquivo no mesmo lugar: `(p − center) · scale`. O poliedro fica no referencial do modelo (eixos não são girados).
4. Numeração: `fromTriangles` dá o padrão (opostas somam N+1). Modelo com números próprios (`printed`) é calibrado face a face (`askOrder` põe opostas lado a lado, `suggestOpposite` sugere, `checkValues` exige cada valor uma vez; d10 aceita 10 no lugar de 0) e `renumbered(poly, { values, turns })` refaz o poliedro.

5. `looksNumbered` (heurística pura): conta vértices da malha afundados (> 1% do raio) abaixo do plano da própria face e longe das arestas (folga > 8% do raio para os outros planos, então chanfro de aresta não conta); ≥ 8 vértices e ≥ 1% do total = "parece que já tem números" (`Imported.hasNumbers`). Só sugere: o assistente destaca "Sim, calibrar" e deixa a escolha ao jogador. Validada num d20 real numerado (tedivm/dice_models).

Assistente (`ImportDie.tsx`): na pergunta de numeração a prévia fica fosca e clara, com luz rasante, câmera mais perto e `OrbitControls` (arrastar gira, sem zoom/pan). Na calibração a câmera enquadra a face perguntada (de frente, numeral em pé, ~75% da prévia; "Voltar à face" reenquadra depois de arrastar) e a face ganha contorno âmbar (no d4, uma esfera no vértice). O STL é "pintado": `inkOf` marca os vértices afundados (mesma regra de `looksNumbered`) e a prévia os mostra em tinta escura sobre um tom claro fosco. Só na prévia; a mesa não usa isso.

`CustomDie` (`custom.ts`) guarda arquivo, `fit`, `poly` numerado, `printed`, `color` (STL), `omens`. O registro em memória (`registerCustom`, `customPoly`, `customDie`) é lido por `polyhedron(kind)`, `baseOf`, `isD20` e `parseDice`; o worker só recebe o sólido (`registerPoly`, vindo em `RollRequest.customs`, ver arremesso.md). Persistência: IndexedDB `dice-roller` v1, store `customDice`; sem IndexedDB o dado vive só na sessão (`store.sessionOnly`, o painel avisa). Store: `customs`, `addCustom`, `removeCustom`, `loadCustoms` (chamado em `App`).

Cena: `Die.tsx` mostra o sólido ideal até o arquivo ser lido (import dinâmico de `importer`, chunk separado) e então a malha: STL com o material de gema na `color`; GLB com os próprios materiais, clonados e `transparent` (o retorno anima a opacidade). `printed: true` não desenha numerais, só âncoras invisíveis em `userData.labels` (test hook e showcase acham a face pelo valor).

Presságios: `isD20(kind)` (`omen.ts`) = d20 embutido ou importado de base d20 com `omens: true` (padrão ligado). d100 e moeda continuam só embutidos.

## Dado de forma livre (`Shape 'livre'`, spec `2026-11-11-dado-forma-livre-design.md`)

Quando `detectPlanes` não reconhece d4–d20, ele lança `ImportError` com `code === 'nao-padrao'` e o assistente oferece "Importar como dado de forma livre" (`importModel(bytes, format, 'livre')`).

- **Detecção** (`detectFree`): faces planas do casco com área ≥ 10% da maior; recalcula o sólido e descarta faces **instáveis** (o centroide do volume, projetado no plano, cai fora do polígono da face), até 3 passadas. Precisa de 3 a 60 faces de apoio (erro em pt-BR com o número achado). `uneven` = maior face > 2× a menor (aviso "não é justo", não erro). `dropped` = quantas faces ficaram de fora.
- **Sólido** (`idealSolid('livre', …)`): centro no centroide do volume (não na média dos vértices), circunraio `RADIUS.livre` = 0,85; **sem `symmetrise`** (não exige faces opostas). `poly.readsDown = true` e `poly.font = 0,45 × menor inraio` (as faces variam, então `FONT[shape]` é só reserva: `poly.font ?? FONT[shape]` em `Die.tsx` e `Hand.tsx`).
- **Leitura**: `readUp` com `readsDown` escolhe a normal que aponta mais para **baixo**; o valor é o que o jogador calibrou para "ele apoiado nessa face". Valores inteiros de −99 a 999, repetição permitida (`checkFreeValue(s)`); `toResults` não mexe neles. Sem opostas, `fromTriangles('livre')` dá 1..N e `askOrder` ordena por área decrescente. `renumbered` preserva `readsDown`/`font`.
- **Showcase**: `staysOnTray(kind)` (moeda ou forma livre): o dado não voa até a câmera, só o número sobe. Nunca dispara presságio (`isD20` é falso).
- **Chat**: pelo apelido, como a moeda: `caveira`, `2caveira`, `2 caveira`; o nome do dado é só o `name` ("2 Caveira"). Em `parseDice` o ramo dos livres vem antes do `d`.
- **Física**: `presim.ts` usa o amortecimento do d100 quando há mais de 20 faces de apoio; senão nenhum.
- **Assistente**: calibração com a face perguntada voltada para baixo (orientação com a normal negada, contorno âmbar sem teste de profundidade); "Não, numerar para mim" dá 1..N pela ordem de área.

## Receita: adicionar um dado novo

1. `polyhedra.ts`: incluir em `DieKind` e `KINDS` (posição = ordem na UI); `BASE`; se for shape novo, `Shape`, `RADIUS`, `rawTriangles`/construtor e `OPPOSITE_SUM`. Símbolos → `SYMBOL` + `SymbolName` + desenho em `symbols.ts`.
2. `Die.tsx`: `GEM` (obrigatório, é `Record`), `FONT` se shape novo, `INK`/`EMBER` se preciso.
3. `notation.ts`: sufixo em `AFTER_D` (mantendo do mais longo ao mais curto) e nome em `CUSTOM`; atualizar a mensagem de erro e a dica do `Chat.tsx`.
4. `read.ts`: só se a regra de valor mudar.
5. `physics/world.ts`: `DAMPING` se o corpo rolar demais; `MAX_RADIUS` se o raio passar de 0,9.
6. `omen.ts`: só se o dado deve disparar presságio.
7. Testes: `tests/polyhedra.test.ts`, `tests/notation.test.ts`, `tests/read.test.ts`, e um caso em `e2e/smoke.spec.ts` ("every supported selection").
