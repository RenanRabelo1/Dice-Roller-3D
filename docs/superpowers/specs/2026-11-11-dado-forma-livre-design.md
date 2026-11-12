# Dado importado de forma livre: design (caminho B)

Data: 2026-11-11 · Status: aprovado para implementar · Branch base: `dev-jg` · Depende de: `2026-11-11-importar-dado-design.md` (caminho A, na `main`)

## 1. Objetivo

Importar dados que **não** são d4–d20: d3, d5, d7, d30, dado-caveira, cristal, dado de média (2-3-3-4-4-5), dado Fate (−, 0, +). Qualquer sólido convexo com faces planas onde ele consiga parar. O dado rola com a física real, o resultado é o valor que o jogador calibrou para a face em que ele parou, e ele fica salvo junto com os outros importados.

**Fora:** dados que se leem por aresta ou vértice de cima (d4 de leitura pelo topo, d3 "lápis"); d100 de bolinhas (Zocchihedron); moeda importada; formas côncavas (a física usa o casco convexo).

## 2. Como está hoje

| Peça | Onde | Comportamento |
|---|---|---|
| Detecção | `src/dice/importer.ts` → `flatFaces`, `detectPlanes` | agrupa os triângulos do casco por normal (3°), exige 4/6/8/10/12/20 faces, opostas e de tamanho parecido; senão, erro "Não reconheci um d4–d20" |
| Sólido ideal | `idealSolid` → `symmetrise`, `corners`, `fromTriangles(base, …)` | intersecta os planos; **só funciona com faces em pares opostos** (exceto d4); escala pelo `RADIUS[base]` |
| Registro | `src/dice/custom.ts` | `CustomDie.base: CustomBase` (`'d4'…'d20'`), `poly.shape` é a forma base |
| Tabelas por forma | `polyhedra.ts` (`RADIUS`, `OPPOSITE_SUM`), `Die.tsx` (`FONT`), `world.ts` (`DAMPING`) | indexadas por `Shape` fechado |
| Leitura | `src/dice/read.ts` → `readUp` | face de cima (d4: vértice de cima) |
| Showcase | `src/scene/Hand.tsx` | o dado voa até a câmera com a face sorteada de frente; **a moeda não voa**, só o texto sobe |
| Notação | `src/dice/notation.ts` | importado = `2d20caveira` (faces + apelido) |
| Presságios | `src/dice/omen.ts` → `isD20` | só d20 e d100 contam |

## 3. Decisões (respostas do backlog)

| Pergunta | Decisão |
|---|---|
| Quantas faces? | **3 a 60 faces de apoio** (faces onde o dado consegue parar). Abaixo de 3 não é dado; acima de 60 a calibração fica impraticável |
| Como se lê? | **Pela face de baixo**: o jogador calibra "o número que você lê quando ele está apoiado nesta face". Funciona para qualquer forma, com ou sem face oposta (prisma de 5, de 7, d30). É o mesmo modelo dos *rotation values* do Tabletop Simulator |
| Valores | Inteiros de −99 a 999, **repetição permitida** (dado de média, d6 marcado 1-1-2-2-3-3, Fate com −1/0/+1) |
| Dado justo? | Não é exigido. Forma irregular cai mais em umas faces, e isso é física real. O assistente **avisa** quando as faces de apoio têm áreas muito diferentes |
| Presságios | Dado de forma livre **nunca** dispara presságio |
| Chat | Pelo apelido, como a moeda: `caveira`, `2caveira` ou `2 caveira` (sem plural automático) |
| Showcase | O dado **não voa** (como a moeda): fica onde parou e só o número sobe para a fila de resultados. A face de baixo não dá para mostrar à câmera |

## 4. Requisitos

| ID | Requisito |
|---|---|
| L1 | Quando o modelo não é d4–d20, o assistente oferece "Importar como dado de forma livre" em vez de só dar erro |
| L2 | A detecção mantém as faces planas que são **de apoio**: área ≥ 10% da maior face e estável (a projeção do centro de massa cai dentro da face). Facetas de chanfro e faces instáveis ficam de fora |
| L3 | Entre 3 e 60 faces de apoio; fora disso, erro em pt-BR com o número encontrado |
| L4 | Sólido ideal pelos planos das faces de apoio, centro no **centroide do volume**, escala com circunraio 0,85 (abaixo de `MAX_RADIUS`) |
| L5 | Calibração face a face: o dado aparece **apoiado** na face, visto de cima, com a gravação pintada (`inkOf`); campo "Que número você lê com ele apoiado assim?"; sem sugestão de oposta |
| L6 | Valores inteiros de −99 a 999, repetição permitida; todas as faces precisam de valor |
| L7 | Aviso (não erro) quando a maior face de apoio tem mais que o dobro da área da menor: "Esse dado não é justo: algumas faces caem mais que outras" |
| L8 | Rolagem pela pré-simulação de sempre; resultado = valor da face de baixo no fim |
| L9 | Showcase: fica na mesa, só o número sobe (mesma regra da moeda) |
| L10 | Chat aceita `2caveira`; nome no painel "Caveira"; soma no total como os outros |
| L11 | Nunca dispara presságio |
| L12 | Salvo no IndexedDB com os outros importados; registros do caminho A continuam abrindo sem migração |

## 5. Design técnico

### 5.1 Forma `'livre'`

- `Shape` ganha `'livre'`. `RADIUS.livre = 0.85`. `DAMPING.livre`: o do d100 quando houver mais de 20 faces de apoio (rola demais), senão nenhum.
- `Polyhedron` ganha dois campos opcionais: `readsDown?: true` (lê pela face de baixo) e `font?: number` (tamanho do numeral, porque as faces variam). `FONT[poly.shape]` passa a ser `poly.font ?? FONT[poly.shape]` em `Die.tsx` e `Hand.tsx`.
- `CustomBase` vira `'d4' | … | 'd20' | 'livre'`. `CustomDie` não muda de versão: `base: 'livre'` só existe em registros novos.

### 5.2 Detecção (`importer.ts`)

1. `detectPlanes` continua igual para o caminho A e lança `ImportError` com `code: 'nao-padrao'` quando nada bate.
2. Nova `detectFree(positions)`: reaproveita `flatFaces`; mantém grupos com área ≥ 10% da maior; calcula o sólido ideal com esses planos; descarta faces **instáveis** (centroide do volume projetado no plano fora do polígono da face) e recalcula até estabilizar (no máximo 3 passadas); valida 3–60.
3. `idealSolid` ganha o ramo `'livre'`: sem `symmetrise`; centro = centroide do volume do sólido (decomposição em tetraedros a partir de um ponto interno); escala pelo circunraio.

### 5.3 Leitura (`read.ts`)

- `readUp(poly, q)`: se `poly.readsDown`, escolhe a face cuja normal girada tem o **menor** `y` (a que aponta para baixo); `tilt` mede contra −Y. O resto não muda.
- `toResults` devolve o valor como está (sem a regra do 0 → 10).

### 5.4 Numeração e rótulos

- Os valores ficam em `faces[i].value` como hoje. O rótulo de cada face (`labelList`) usa a normal e o `up` da própria face; ele serve para a calibração, para o test hook e para o número que sobe.
- `font` = 0,45 × o menor inraio entre as faces de apoio (cabe em todas).
- `Polyhedron` com `readsDown` não tem par de opostas; `askOrder` vira a ordem das faces por área (maiores primeiro).

### 5.5 Assistente (`ui/ImportDie.tsx`)

- Erro `nao-padrao` → tela "Esse modelo não é um d4–d20. Importar como dado de forma livre?" com o número de faces de apoio encontrado e, se houver, o aviso L7.
- Calibração: câmera de cima, dado girado para a face perguntada ficar **embaixo**; valida com `checkFreeValue` (inteiro, −99..999).
- Passo "Salvar" igual ao do caminho A, sem a opção de presságio.

### 5.6 Cena e regras que hoje comparam `'coin'`

- Nova função `staysOnTray(kind)` em `polyhedra.ts`: moeda **ou** forma livre. Substitui `state.dice[i] === 'coin'` em `Hand.tsx` (showcase). As outras comparações com `'coin'` (soma, colisor de cilindro, texto Cara/Coroa) continuam só para a moeda.
- `isD20` e as checagens de d100 não mudam: forma livre não é nenhum dos dois.

### 5.7 Notação (`notation.ts`)

- `parseDice(text, customs)`: importados de forma livre entram como palavras, no mesmo ramo da moeda: `^(\d*)<apelido>`. Os de forma padrão seguem `2d20caveira`.
- O apelido não pode colidir com `moeda`, `boladefogo` nem com os sufixos existentes (regra que já existe).

## 6. O que acontece se der errado

| Situação | O app faz |
|---|---|
| Menos de 3 ou mais de 60 faces de apoio | erro: "Encontrei N faces de apoio; um dado de forma livre precisa de 3 a 60." |
| Esfera, cilindro ou forma sem faces planas | erro: "Esse modelo não tem faces planas para o dado parar." |
| Faces muito diferentes | aviso L7; importa se o jogador confirmar |
| Faces instáveis (o dado não para nelas) | ignoradas na calibração; o assistente mostra quantas ignorou |
| Valor fora de −99..999 ou vazio | não avança a calibração, com a mensagem |
| Forma côncava (estrela, caveira com cavidades) | física pelo casco convexo; a tela de forma livre sempre mostra a nota "A física usa o contorno externo do modelo." (sem tentar detectar concavidade) |
| Dado para numa face ignorada (raro, instável) | a física resolve: a face instável não é posição final de parada; se mesmo assim acontecer no timeout, vale a face mais próxima de baixo |

## 7. Testes

**Vitest** (`tests/importer.test.ts`, `tests/read.test.ts`, `tests/notation.test.ts`, `tests/helpers/models.ts`):
- Modelos sintéticos: prisma triangular (5 faces), prisma pentagonal (7), triacontaedro rômbico (30, a partir das normais do icosidodecaedro), um prisma alongado com tampa pequena instável.
- `detectFree`: número de faces de apoio certo; instáveis descartadas; 2 faces e 61 faces dão erro.
- Centro e escala: centroide do volume em 0; circunraio 0,85.
- `readUp` com `readsDown`: para cada face, a rotação que a põe embaixo lê o valor dela.
- Valores: repetição aceita; fora de faixa recusado.
- Notação: `2caveira`, conflito com `moeda` recusado.
- Física (`tests/physics.test.ts`): um d7 importado rola com `simulate`, fica dentro da bandeja e o resultado está entre os valores calibrados; determinístico.

**Playwright** (uma rodada no fim, ver seção 10): importar um prisma de 5 faces gerado por `tests/helpers/models.ts` → aviso de forma livre → calibrar → rolar → o valor publicado é o da face de baixo (via `__dice.bodies()` + `labels`) → o dado não voa → recarregar mantém.

## 8. Riscos

- **Faces de apoio erradas em modelos reais** (rebarbas, base de impressão): os limiares de 10% de área e de estabilidade precisam ser conferidos com 2–3 STLs reais de dados estranhos (d5, d7, d30). Pedir à sessão principal antes de baixar qualquer arquivo.
- **Dado que rola demais** (muitas faces): o timeout de 4 s revela a pose atual; `DAMPING.livre` reduz isso.
- **Leitura por baixo em dado translúcido**: o jogador vê o número de cima, não o de baixo. Por isso a calibração pergunta o que se **lê** com ele apoiado, não o que está na face de baixo.

## 9. Decisões em aberto (padrão adotado)

1. Limite de 60 faces (padrão: 60).
2. Faixa de valores −99 a 999 (padrão: essa).
3. Chat só pelo apelido, sem o número de faces (padrão: só apelido).

## 10. Ordem de construção

1. `Shape 'livre'`, `readsDown`, `font` e `staysOnTray`, sem mudar os dados de hoje (testes atuais verdes).
2. `detectFree` + `idealSolid` livre + testes com os modelos sintéticos.
3. `readUp` por baixo + teste de física.
4. Assistente (tela de forma livre, calibração por baixo, aviso de justiça).
5. Notação por apelido.
6. Docs: `docs/contexto/dados.md` (forma livre) e `arremesso.md` (leitura por baixo).
7. **E2E só no fim**, uma rodada, depois de pedir horário à sessão principal (a porta 5179 é única).

## 11. Tarefas (guia de implementação)

Cada tarefa é um commit. Faça na ordem e não pule a verificação. Nomes de função e de arquivo são os do código atual (`dev-jg`).

### T1 · Forma `'livre'` sem mudar nada do que existe
**Arquivos:** `src/dice/polyhedra.ts`, `src/dice/custom.ts`, `src/scene/Die.tsx`, `src/scene/Hand.tsx`, `src/physics/presim.ts`.
1. `polyhedra.ts`: `Shape` ganha `'livre'`; `RADIUS.livre = 0.85`. `interface Polyhedron` ganha `readsDown?: boolean` e `font?: number`.
2. `fromTriangles(shape, verts, numbering)`: quando `shape === 'livre'`, **não** rode o laço de opostas (hoje ele usa `OPPOSITE_SUM[shape] ?? 0` e daria valores negativos). Valores = `numbering?.values?.[i] ?? i + 1`. `marked` (ponto no 6/9) fica falso. Os rótulos seguem o ramo das faces (não o do d4).
3. Nova `export const staysOnTray = (kind: DieKind) => kind === 'coin' || baseOf(kind) === 'livre';` em `polyhedra.ts`. Em `Hand.tsx`, troque `if (state.dice[i] === 'coin')` (showcase, perto da linha 237) por `if (staysOnTray(state.dice[i]))`. As outras comparações com `'coin'` (símbolo perto da linha 198, colisor em `presim.ts`, soma em `notation.ts`) **não mudam**.
4. `custom.ts`: `CustomBase` ganha `'livre'`.
5. `Die.tsx`: `FONT` ganha `livre: 0.3` (só fallback). Onde usa `FONT[model.shape]`, use `model.font ?? FONT[model.shape]`. Em `Hand.tsx` (perto da linha 206), `FONT[poly.shape] / HL_SIZE` vira `(poly.font ?? FONT[poly.shape]) / HL_SIZE`.
6. `presim.ts`: `const damp = poly.shape === 'livre' ? (poly.faces.length > 20 ? DAMPING.d100 : undefined) : DAMPING[poly.shape];` e use `damp?.linear ?? 0` / `damp?.angular ?? 0`.

**Verificar:** `npm run build && npm run lint && npm test`; todos os testes atuais passam sem alteração. Acrescente em `tests/polyhedra.test.ts`: `staysOnTray('coin')` é `true` e `staysOnTray('d20')` é `false`.

### T2 · Detecção de forma livre e sólido ideal
**Arquivo:** `src/dice/importer.ts`; testes em `tests/importer.test.ts` e helpers em `tests/helpers/models.ts`.
1. `ImportError` ganha código opcional: `export class ImportError extends Error { constructor(message: string, readonly code?: 'nao-padrao') { super(message); } }`. `detectPlanes` lança com `code` `'nao-padrao'` (mesma mensagem de hoje).
2. Helpers internos novos:
   - `facePolygon(plane, pts): Vec3[]`: os cantos (`corners`) que estão no plano, ordenados por ângulo (mesmo código que `idealSolid` já usa para montar o anel).
   - `volumeCentroid(tris: Vec3[]): Vec3`: escolha `o` = média dos cantos; para cada triângulo `(a, b, c)`, volume `v = dot(a−o, cross(b−o, c−o)) / 6` e centroide `(o+a+b+c)/4`; resultado = `Σ v·centroide / Σ v`.
   - `insideConvex(p, ring, n): boolean`: `p` projetado no plano está dentro do polígono convexo `ring` se, para todas as arestas `(r_i, r_{i+1})`, `dot(n, cross(r_{i+1}−r_i, p−r_i)) >= −1e-9`.
3. `export function detectFree(positions: Float32Array): { planes: Plane[]; dropped: number; uneven: boolean }`:
   ```
   faces = flatFaces(positions)                     // já vêm ordenadas por área
   keep  = faces com area >= 0.10 * faces[0].area
   dropped = 0
   repetir até 3 vezes:
     pts = corners(keep); se pts.length < 4 → ImportError("Esse modelo não tem faces planas para o dado parar.")
     tris = anel de cada plano (facePolygon) triangulado em leque
     c = volumeCentroid(tris)
     instaveis = planos de keep em que insideConvex(c, facePolygon(plano, pts), plano.n) é falso
     se nenhum → parar; senão tirar de keep e somar em dropped
   se keep.length < 3 ou > 60 → ImportError("Encontrei N faces de apoio; um dado de forma livre precisa de 3 a 60.")
   areas = área de cada facePolygon; uneven = max(areas) > 2 * min(areas)
   ```
4. `idealSolid(base, found)`: ramo novo no início para `base === 'livre'`: `pts = corners(found)`; `center = volumeCentroid(tris)`; desloque os planos (`d − dot(n, center)`); recalcule `pts`; `scale = RADIUS.livre / max(|p|)`; triângulos em leque escalados; `poly = fromTriangles('livre', tris)`; depois `poly.readsDown = true` e `poly.font = 0.45 * menorInraio`, onde o inraio de uma face é a menor distância do centro da face (já escalada) às arestas dela. Retorne `{ poly, fit: { center, scale } }`. **Não** chame `symmetrise` nesse ramo. A checagem `faces !== FACES[base]` vira `poly.faces.length !== found.length` para `'livre'`.
5. `importModel(bytes, format, mode: 'padrao' | 'livre' = 'padrao')`: `'padrao'` faz como hoje; `'livre'` usa `detectFree` + `idealSolid('livre', planes)`; `Imported` ganha `dropped?: number` e `uneven?: boolean`. `looksNumbered` continua valendo (usa `RADIUS[poly.shape]`, que agora tem `livre`).
6. `tests/helpers/models.ts`: `prismTriangles(sides: number, height: number): Vec3[]` (prisma reto de base regular) e `planesSolid(normals: Vec3[]): Vec3[]` (sólido pelos planos `n·x = 1`, triangulado). Triacontaedro rômbico: as normais são as 30 direções dos vértices do icosidodecaedro (permutações cíclicas de `(0, 0, ±φ)` e de `(±1/2, ±φ/2, ±φ²/2)`, normalizadas).

**Verificar:** testes novos: prisma de 3 lados (5 faces), de 5 lados (7 faces), triacontaedro (30); prisma alto e fino com tampas pequenas → tampas descartadas por área ou estabilidade (`dropped > 0`); `planesSolid` com 2 e com 61 planos → erro; centroide em 0 (±1e-6) e circunraio 0,85 (±1e-6); `detectPlanes` num prisma de 5 faces lança com `code === 'nao-padrao'`. `npm test` verde.

### T3 · Leitura pela face de baixo e valores livres
**Arquivos:** `src/dice/read.ts`, `src/dice/importer.ts`, `tests/read.test.ts`, `tests/physics.test.ts`.
1. `readUp(poly, q)`: `const s = poly.readsDown ? -1 : 1;` e no laço `const y = s * new Vector3(...c.v).applyQuaternion(rot).dot(UP);`. O `tilt` continua `Math.acos(Math.min(1, best.y))`. Nada mais muda.
2. `importer.ts`: `export function checkFreeValue(v: number): string | null` → inteiro entre −99 e 999, senão "Use um número inteiro de -99 a 999."; `export function checkFreeValues(values: number[], count: number): string | null` → todos presentes e válidos, **repetição permitida**; faltando → "Faltam números.".
3. `askOrder(poly)`: se `poly.readsDown`, devolva os índices das faces ordenados por área decrescente (sem pares).
4. Teste de leitura: para cada face de um prisma de 5 faces, o quaternion que leva a normal da face para `(0, −1, 0)` lê o valor dela.
5. Teste de física: `customDieOf` (helper existente) com um prisma de 7 faces calibrado 1..7 → `simulate` com 3 sementes → dentro da bandeja, resultado entre 1 e 7, mesma semente dá o mesmo resultado.

**Verificar:** `npm test` verde.

### T4 · Assistente
**Arquivo:** `src/ui/ImportDie.tsx` (passos `'file' | 'shape' | 'numbers' | 'save'`).
1. No `catch` do import (perto da linha 153), se `e instanceof ImportError && e.code === 'nao-padrao'`, guarde os bytes e mostre no passo `'shape'`: "Esse modelo não é um d4–d20." + botão **Importar como dado de forma livre**, que chama `importModel(bytes, format, 'livre')`.
2. Tela de forma livre: "Encontrei N faces de apoio" (+ "Ignorei K faces onde o dado não para" se `dropped > 0`), o aviso L7 se `uneven`, e a nota fixa "A física usa o contorno externo do modelo.".
3. Numeração com `readsDown`: pergunta "Que número você lê com ele apoiado assim?"; sem sugestão de oposta (`suggested` falso); validação com `checkFreeValue`/`checkFreeValues`; a orientação da prévia usa a normal **negada** (`orientation(neg(normal), up)`), para a face perguntada ficar de costas para a câmera, como se o dado estivesse apoiado nela e você olhasse de cima. "Não, numerar para mim" continua (valores 1..N na ordem por área).
4. Passo Salvar: sem a opção de presságio; `base: 'livre'`, `omens: false`.

**Verificar:** `npm run build && npm run lint`; teste manual no `npm run dev` (sem Playwright) com um prisma gerado pelo helper salvo em `temp/`.

### T5 · Chat e nomes
**Arquivo:** `src/dice/notation.ts`, `tests/notation.test.ts`.
1. `parseDice`: a lista `words` hoje monta `${d.poly.shape.slice(1)}${d.slug}` para todo importado. Exclua dela os que têm `poly.shape === 'livre'` e trate-os como a moeda: antes do ramo `^(\d*)d`, teste `^(\d*)<apelido>` para cada livre (do apelido mais longo ao mais curto).
2. `dieName(kind)`: livre → só o `name` ("Caveira"), sem prefixo de forma.
3. `formatDice`: livre → `${n} ${name}` ("2 Caveira").
4. `resultText`: livre soma no total como dado normal.

**Verificar:** testes: `2caveira` e `2 caveira` dão dois dados; `caveira + d20` funciona; apelido `moeda` é recusado por `slugProblem` (inclua `moeda` e `boladefogo` na lista de reservados se faltar).

### T6 · Documentação
`docs/contexto/dados.md`: seção "Dado de forma livre" (detecção, leitura por baixo, valores livres, fica na mesa). `docs/contexto/arremesso.md`: uma linha sobre `readsDown` em `readUp`. Acrescente a seção "Implementação e medições" no fim desta spec.

### T7 · E2E (só no fim, depois de pedir horário à sessão principal)
Em `e2e/import.spec.ts`, um teste: gerar um prisma de 5 faces com o helper → importar → **Importar como dado de forma livre** → **Não, numerar para mim** → rolar com Espaço → o valor publicado é o da face cuja normal girada tem o menor `y` (via `__dice.bodies()` + `labels`) → `showcased` avança sem o dado sair do lugar → recarregar mantém. Depois, uma rodada da suíte inteira, coletando as falhas sem corrigir, e o relatório para a sessão principal.

## Implementação e medições

Feito nas tarefas T1–T6 (commits `feat:` na ordem). Medido só com modelos sintéticos (`tests/helpers/models.ts`); nenhum STL real foi baixado, então os limiares de 10% de área e de estabilidade (seção 8) seguem **sem conferência em modelos reais** (d5, d7, d30).

- Prismas de 3, 5 e 7 lados dão 5, 7 e 9 faces de apoio; o triacontaedro rômbico (normais do icosidodecaedro) dá 30; 2 planos e 61 planos dão erro (o de 61 diz "3 a 60").
- Um corte pequeno num canto de cubo (plano a 1/2,77) fica de fora por área (`dropped = 1`); cubo com ponto puxado para fora de uma aresta descarta faces (`dropped > 0`). O caso "instável" puro não tem um modelo simples que o isole da regra de área; o teste só garante `dropped > 0` e ≥ 3 faces.
- O centroide do volume do sólido reconstruído fica em 0 (5 casas) num sólido assimétrico; circunraio 0,85 (5 casas).
- Física: um prisma de 7 faces calibrado 1..7 rola com 3 sementes (2 dados), fica na bandeja, lê entre 1 e 7 e repete com a mesma semente.
- Ajustes sobre o guia: `StdBase` (`custom.ts`) separa os d4–d20 de `'livre'` onde só os primeiros cabem (`FACES`, `checkValue`…); `Imported<B>` é genérico e `importModel` tem sobrecarga por `mode`; `BuiltinKind` exclui `'livre'`; `renumbered` preserva `readsDown`/`font`; o contorno âmbar na calibração de baixo é desenhado sem teste de profundidade (a face fica atrás do dado). A oferta "Importar como dado de forma livre" aparece no passo do arquivo, junto da mensagem de erro de sempre.
- Fora desta rodada: E2E (T7) e conferência com STLs reais.

### Modelos reais (conferência dos limiares, seção 8)

Três STLs públicos do GitHub, baixados só para leitura numa pasta fora do repositório (nada versionado), rodando `readModel` + `detectFree` + `idealSolid('livre')` num script Vitest descartável:

| Arquivo | Origem | Tamanho | Triângulos | Faces de apoio | Ignoradas | Justiça | Fonte (`poly.font`) |
|---|---|---|---|---|---|---|---|
| `d30.stl` | sycarion/stldice, `d30s/d30.stl` (CC BY 4.0) | 671 884 B | 13 436 | **30** | 0 | justo | 0,106 |
| `D5Shard.stl` | LazareLive/AutomatedDices, `export/D5Shard.stl` (GPL-3.0) | 1 091 484 B | 21 828 | 15 | 725 | **aviso** | 0,019 |
| `D7Shard.stl` | LazareLive/AutomatedDices, `export/D7Shard.stl` (GPL-3.0) | 1 482 584 B | 29 650 | 14 | 868 | justo | 0,076 |

- O d30 rômbico real dá exatamente 30 faces, sem descarte: os limiares servem para o caso regular.
- Os "shards" têm 5 e 7 faces numeradas, mas o casco tem camadas de facetas: 5 faces grandes (~9,5% da área do casco cada), 5 de ~4,6% e 5 de ~1,4% no d5; 7 de ~6,8% e 7 de ~3,9% no d7. Todas passam nos 10% da maior e na estabilidade, então o assistente mostra 15 e 14 faces. As camadas de baixo têm 48–57% da área das principais, então nenhum limiar de área razoável as separa sem cortar faces legítimas; **não ajustei os limiares**.
- Consequências a conhecer: (1) num dado assim o jogador calibra todas as faces de apoio (repetição de valor é permitida, então 1-2-3-4-5 nas grandes e repetir nas outras serve); (2) o numeral dimensiona-se pela menor face de apoio, e fica minúsculo no d5 (0,019). Se isso incomodar, a saída é dimensionar `font` pela mediana (ou pelo menor inraio das faces ≥ 25% da maior) e não pela menor face: decisão de produto, não implementada.

### Adendo dos shards (T8–T10): resultado com os STLs reais

Depois da T9, no `npm run dev` (D5Shard e D7Shard importados pelo assistente, nada de Playwright) e num script Vitest descartável:

| Arquivo | Faces de apoio | `tier` | Faces de leitura | Fonte (todas → leitura) | Justiça (todas) |
|---|---|---|---|---|---|
| `D5Shard.stl` | 15 | 5 | 5 | 0,019 → 0,080 | aviso (só nas 15) |
| `D7Shard.stl` | 14 | 7 | 7 | 0,076 → 0,076 | justo |
| `d30.stl` | 30 | null | 30 | 0,106 → 0,106 | justo |

- A pergunta apareceu nos dois shards e a calibração pediu 5 e 7 faces ("1 de 5", "1 de 7"); um d5 calibrado 1–5 salvou sem erros. O d30 não muda.
- **Desvio do adendo:** `TIER_DROP` = **0,70**, não 0,65. Pelas áreas dos polígonos do sólido ideal, a razão entre as faces longas e as pontas do D7 é 0,657 (102,81 → 67,54), e com 0,65 ele não tinha camada; o D5 (100,28 / 50,66 / 19,17) dava 5 nos dois. A sessão principal foi avisada; testes com as áreas reais dos dois shards fixam os valores.
- A fonte só muda no d5 (0,019 → 0,080); no d7 o menor inraio das 14 faces já era o das faces grandes.
- **Condição extra da S2 (adendo `d8c2794`):** além do salto, `tierOf` exige que sobrem pelo menos `k` faces depois das `k` grandes. Com a contagem repetida nos três STLs reais: D5Shard 15 faces, `tier` 5 (sobram 10); D7Shard 14 faces, `tier` 7 (sobram 7); d30 30 faces, `tier` null. Testes: shards sintéticos de 5 e 7 lados → camada; prisma de 5 lados com tampas a ~0,69 da lateral (altura 2,93) e `[100×5, 69, 69]` → null; triacontaedro → null.
