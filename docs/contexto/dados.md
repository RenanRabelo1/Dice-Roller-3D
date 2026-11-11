# Dados: tipos, geometria, numeração, leitura, notação

Cobre `src/dice/*`, `scene/Die.tsx` e `ui/Chat.tsx`/`ui/Controls.tsx`. Tudo em `dice/` é puro (sem React) e testado em Node.

## Tipos (`dice/polyhedra.ts`)

```ts
Shape   = 'd4'|'d6'|'d8'|'d10'|'d12'|'d20'|'d100'|'coin'      // corpo físico
DieKind = Shape | 'vtm' | 'hunger' | 'fire'                    // o que o jogador escolhe
KINDS   = ordem canônica (UI, sortDice, formatDice)
BASE    = kind → shape   (vtm, hunger → d10; fire → d6)
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

`build()` agrupa triângulos por normal em faces lógicas e numera:
- Opostas somam `OPPOSITE_SUM` (d6 7, d8 9, d10 9, d12 13, d20 21), ordem por altura/ângulo da normal.
- d100: `((rank * 37) % 100) + 1` espalha 1–100 pela esfera.
- d4: numeração por **vértice** (`tops`); cada número aparece em 3 faces.
- 6 e 9 ganham ponto (`6.`, `9.`) em d10/d12/d20/d100.

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
- Nomes de objeto usados por outros módulos e testes: `die-${i}` (grupo), `gem-${i}` (malha).
- Aparência de gema sem passe de refração: `meshPhysicalMaterial` com clearcoat, `ior`, opacidade 0,88. Moeda: metal dourado opaco.
- Paletas: `GEM` (cor por kind), `INK` (cor do numeral; gemas claras usam tinta escura), `EMBER` (fogo brilha), `FONT` (tamanho do numeral por shape), `SYMBOL` (altura do símbolo em tamanhos de fonte).
- **Um objeto por dado para todos os numerais**: `BatchedText` (troika) ou, em dado com símbolos, uma malha com os símbolos mesclados. Os membros ficam em `userData.labels` (testes leem dali).

## Notação e painel (`dice/notation.ts`)

`parseDice(text)` → `{ dice }` ou `{ error }` (mensagens em pt-BR):
- Ignora espaços, `+` e caixa. Aceita `2d10 + d100` e compacto `2d10d100d4`.
- Sufixos depois do `d`, do mais longo ao mais curto: `10vampiro`, `10fome`, `6fogo`, `10v`, `100`, `20`, `12`, `10`, `8`, `6`, `4`.
- `boladefogo` = 8×`fire`. `moeda` / `2 moedas`.
- Ambiguidade (`2d102d4`) resolvida com backtracking (prefere a leitura em que todos os dados existem).
- Mais de `MAX_DICE` → erro.

`formatDice(dice)` → `"2d10 + 1d10 Vampiro + 2 moedas"`. `dieName(kind)` → nome de exibição. `resultText(dice, results)` → `{ total, detail }`: total soma dados (moedas nunca somam; só moedas → "Cara", "2 caras, 1 coroa").

UI: `Controls.tsx` (um botão por kind + "−", painel `data-testid="result"`, dicas por fase) e `Chat.tsx` (tecla `C` abre, `Esc` fecha, Enter/Aplicar → `setDice`).

## Receita: adicionar um dado novo

1. `polyhedra.ts`: incluir em `DieKind` e `KINDS` (posição = ordem na UI); `BASE`; se for shape novo, `Shape`, `RADIUS`, `rawTriangles`/construtor e `OPPOSITE_SUM`. Símbolos → `SYMBOL` + `SymbolName` + desenho em `symbols.ts`.
2. `Die.tsx`: `GEM` (obrigatório, é `Record`), `FONT` se shape novo, `INK`/`EMBER` se preciso.
3. `notation.ts`: sufixo em `AFTER_D` (mantendo do mais longo ao mais curto) e nome em `CUSTOM`; atualizar a mensagem de erro e a dica do `Chat.tsx`.
4. `read.ts`: só se a regra de valor mudar.
5. `physics/world.ts`: `DAMPING` se o corpo rolar demais; `MAX_RADIUS` se o raio passar de 0,9.
6. `omen.ts`: só se o dado deve disparar presságio.
7. Testes: `tests/polyhedra.test.ts`, `tests/notation.test.ts`, `tests/read.test.ts`, e um caso em `e2e/smoke.spec.ts` ("every supported selection").
