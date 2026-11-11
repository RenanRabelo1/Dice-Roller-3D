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
| Forma côncava (estrela, caveira com cavidades) | física pelo casco convexo; aviso "a física usa o contorno externo do modelo" |
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
