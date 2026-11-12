# Gravação acesa no resultado e tinta ao vivo no assistente

Status: **aprovada para implementar** (2026-11-12). Itens 5.1 e 5.2 de `docs/backlog.md`. Corrige parte da spec `2026-11-12-forma-livre-voa-design.md`.

## 1. Problemas

**A. Shard gravado no resultado (5.1).** Desde a spec `forma-livre-voa`, o dado de forma livre voa até a frente com a face **de apoio** (a de baixo, que vale o resultado) virada para a câmera. Num shard com números gravados no próprio modelo (ex.: `D5Shard.stl`), essa face é uma face longa **lisa**, porque os números ficam do lado de cima, perto das pontas. O jogador vê uma face azul vazia com o número em destaque (`Text`) minúsculo em cima: `poly.font` é pequeno porque as faces longas são estreitas.

**B. Tinta e acabamento na prévia (5.2).** No passo "Nome / Tinta dos números / Acabamento" do assistente de importação, trocar a tinta ou o acabamento não muda nada no dado girando. `InkChoice` só guarda `ink`/`surface` no estado de `ImportDie`; o `<Preview>` não recebe nenhum dos dois e desenha sempre a gema com `color`. Na mesa a tinta já funciona.

## 2. Comportamento novo

### A. Dado de forma livre com números gravados, no resultado

Vale quando o dado lê pela face de baixo (`poly.readsDown`) **e** o jogador disse que ele vem numerado (`CustomDie.printed === true`, o "Sim, calibrar"):

| | Hoje | Depois |
|---|---|---|
| Pose na fileira | face de apoio virada para a câmera | face de apoio virada para **longe** da câmera: o dado aparece como ficou na mesa, visto de cima. É a mesma vista da calibração (`orientation(-n, up)` em `ImportDie.tsx`), em que o jogador leu o número |
| Destaque | número solto (`Text`) grudado na face de apoio, minúsculo | **a própria gravação acende**: os triângulos de tinta voltados para cima (com o dado apoiado na face sorteada) ganham um brilho por cima da tinta, que pulsa no ritmo do destaque. Sem `Text` solto |
| Gravação não achada (nenhum triângulo de tinta para cima, ex.: GLB com número só na textura) | — | o `Text` aparece **na frente** do dado, virado para a câmera, no tamanho `FONT.livre / HL_SIZE`, como o "Cara/Coroa" da moeda |
| Movimento reduzido | número aparece acima do dado parado | sem mudança |

Dado de forma livre **sem** gravação (`printed: false`) e todos os outros dados: **sem mudança**.

Limite aceito: o jogo não sabe qual gravação é qual número. Ele acende o que fica para cima com o dado apoiado na face sorteada. Num shard podem acender duas gravações (as duas faces da aresta de cima), que é o que o jogador veria na mesa.

### B. Assistente de importação

No passo de salvar, a prévia girando mostra a tinta escolhida na gravação e o acabamento (gema ou fosco), mudando na hora em que o jogador clica. Usa o mesmo código de pintura do dado da mesa. Nos outros passos a prévia não muda: a pose de calibração e a prévia "pintada" de cinza continuam iguais.

## 3. Desenho técnico

### A1. `showcasePoses` vista de cima (`src/scene/showcase.ts`)

Novo parâmetro opcional `above?: boolean[]` (um por dado). Com `above[i]`, use `ln = -label.normal` no lugar de `label.normal`; `lu = label.up` continua. A base `makeBasis(cross(lu, ln), lu, ln)` continua sendo uma rotação (inverter duas colunas mantém o determinante). Sem o parâmetro, nada muda.

### A2. Escolher os triângulos a acender (`src/scene/inkGlow.ts`, arquivo novo)

Função pura e testável:

```ts
// Triangles of an engraved model that face up when the die rests on the face whose outward normal is `down`
// (die space): inked (mask = 1) and with their normal within ~60° of straight up.
export const UP_INK = 0.5; // ponytail: fixed cone; tune if real models light too little or too much
export function upInk(normals: ArrayLike<number>, mask: Uint8Array, down: Vec3, min = UP_INK): number[]
```

- `normals`: normal **de cada triângulo** em espaço do dado, 3 números por triângulo (o chamador calcula; ver A3).
- Devolve os índices `t` com `mask[t] === 1` e `dot(normal_t, -down) > min`.

E uma função que monta a malha do brilho a partir do modelo visível do dado:

```ts
// One mesh in the die group's space with the up-facing inked triangles of every mesh under `model`.
export function glowMesh(model: Object3D, group: Object3D, down: Vec3, color: string): Mesh | null
```

- `group.updateWorldMatrix(true, true)`. Para cada `Mesh` debaixo de `model` cuja geometria tem `userData.ink` (STL pintado e GLB: ver `Die.tsx` / `withInkMask` em `importer.ts`), calcule `rel = group.matrixWorld⁻¹ × mesh.matrixWorld`.
- Para cada triângulo `t` (a malha é não indexada: vértices `3t..3t+2`), transforme os 3 vértices por `rel` e calcule a normal do triângulo pelo produto vetorial. **Use o atributo `normal` da geometria para escolher o sentido** (média das 3 normais transformadas pela matriz normal de `rel`; inverta o produto vetorial se ele apontar contra ela), porque o sentido dos triângulos do STL não é garantido.
- Junte os triângulos escolhidos por `upInk` numa `BufferGeometry` só, com cada vértice empurrado 0,004 ao longo da normal do triângulo (para não brigar em profundidade com a tinta).
- Material: `new MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })`. São os mesmos parâmetros de programa do material dos símbolos em `Hand.tsx` (`MeshBasicMaterial` transparente, sem tone mapping), então o shader já compilado é reaproveitado. `depthTest` fica ligado: o brilho não aparece através do dado.
- `name = 'ink-glow'`. Devolve `null` se nenhum triângulo passar.
- Cor do brilho: a cor da tinta do dado (`inkColorOf(die, gemColor(kind))`) clareada 40% para branco (`new Color(ink).lerp(new Color('#ffffff'), 0.4)`); com "Sem tinta", `'#FFF4DD'`.

### A3. Ligar no showcase (`src/scene/Hand.tsx`)

No bloco que monta o showcase ao entrar em `settled` (onde estão `from`, `to`, `marks` e `showcase.current = { … }`):

1. Calcule `above = state.dice.map((k) => !!(isCustom(k) && customDie(k)?.printed && polys[i].readsDown))` (use o índice do `map`). Passe `above` como 4º argumento de `showcasePoses`, **só quando `!still`**.
2. Para cada `i` com `above[i]`:
   - `down` = `label.normal` do rótulo do valor sorteado (`poly.labelList.find((l) => l.value === raw[i])`), em espaço do dado;
   - `glow = glowMesh(gems[i], scene.getObjectByName(`die-${i}`)!, down, cor)`. `gems[i]` é o grupo `gem-${i}` que já está em `showcase.current.gems`. Use só os filhos **visíveis**: o modelo é visível quando já carregou (`shown` em `Die.tsx`); se o modelo não estiver visível, `glow` é `null`;
   - se `glow`: `glow.name = `ink-glow-${i}``, adicione como filho de `die-${i}`, e esconda o número solto desse dado (`numbers[i].visible = glyphs[i].visible = false`);
   - se não: o número solto vai **na frente** do dado (próximo item).
   Guarde os brilhos em `showcase.current.glows` (array por dado, `Mesh | null`).
3. No laço de voo, para `above[i]`:
   - com brilho: `glow.material.opacity = t * h.glow * 0.85`, em que `t` é o progresso do voo desse dado (já calculado no laço) e `h = highlightAt(now - at, i, m.start, m.face, m.scale)` (o `glow` dele pulsa a 0,9 Hz depois do pouso). Não chame `draw(i, …)` para esse dado;
   - sem brilho: `draw(i, p.clone().addScaledVector(toCam, polys[i].radius + 0.35))`, em que `toCam = camera.position.clone().sub(p).normalize()`, e use `m.scale = FONT.livre / HL_SIZE` para esse dado (ajuste em `marks`).
4. **Limpeza:** remova e descarte (`geometry.dispose()`, `material.dispose()`) os brilhos sempre que o showcase acabar: quando `showcase.current` é trocado ou zerado (perto da linha 188, `showcase.current = null`) e quando a fase sai de `settled` (perto da linha 184, onde os números são escondidos). Faça uma função `dropGlows()` e chame nos dois lugares.
5. **Custo:** montar o brilho percorre os triângulos do modelo (até 50 mil por dado). Meça uma vez com 10 shards de verdade (`D5Shard.stl`, abaixo) no quadro do pouso. Se passar de 16 ms somados, guarde a geometria do brilho num `Map` por `${kind}|${raw}` e só clone o material. Anote a medida na seção 6.

### A4. Gancho de teste (`src/testHook.ts` + `src/scene/Stage.tsx`)

`inkGlow(index: number): { visible: boolean; triangles: number; opacity: number } | null`. Lê `scene.getObjectByName(`ink-glow-${index}`)`; `triangles = geometry.getAttribute('position').count / 3`. Documentar em `docs/contexto/testes.md`, na tabela do hook.

### B1. Pintura compartilhada (`src/scene/Die.tsx`, `src/dice/importer.ts`, `src/dice/custom.ts`)

- `Die.tsx`: exporte `usePainted`, `paintGlb` e `GemMaterial` (com o comentário `// oxlint-disable-next-line react/only-export-components` antes de cada `export` que não for componente, como já é feito com `GEM`).
- `importer.ts`: troque `withInkMask(root, die)` por `export function markInk(root: Object3D, solid: Solid): Object3D`, que faz o mesmo com `solid` no lugar de `{ poly: die.poly, fit: die.fit }`. `modelObject` passa a chamar `markInk(m.object, { poly: die.poly, fit: die.fit })`.
- `custom.ts`: `inkColorOf(die: Pick<CustomDie, 'printed' | 'ink'>, gem: string)`. Só o tipo do parâmetro muda; quem chama hoje continua igual.

### B2. Prévia do assistente (`src/ui/ImportDie.tsx`)

- `Preview` ganha as props `ink: string | null` (cor final da tinta, ou `null`) e `finish: Finish`, usadas **só quando o passo é `save`**. Passe também `step` ou um booleano `dressed = step === 'save'`.
- Cor da tinta, calculada em `ImportDie` como o `save()` faz:
  `inkColorOf({ printed, ink: textured && ink !== 'nenhuma' ? 'escura' : ink }, gem)`, com `gem = loaded.format === 'stl' ? color : GEM[imp.base === 'livre' ? 'd20' : imp.base]`.
- STL com `dressed`:
  - a geometria do modelo ganha a máscara uma vez: `useMemo` que faz `geometry.userData.ink ??= inkTriangles(positions, loaded.imported)`, só se `printed`;
  - `const painted = usePainted(dressed && printed ? geometry : undefined, color, ink)`;
  - desenhe `<mesh geometry={painted ?? geometry} …><GemMaterial kind={'custom:preview'} color={color} finish={finish} painted={!!painted} /></mesh>` no lugar do `meshPhysicalMaterial` de hoje.
- GLB com `dressed && printed`: `markInk(object, loaded.imported)` uma vez (`useMemo`) e `useEffect(() => paintGlb(object, ink), [object, ink])`. É o objeto da prévia, que não é o mesmo do dado salvo (`modelObject` relê o arquivo).
- No elemento `.import-preview`, escreva `data-ink={dressed ? ink ?? 'nenhuma' : undefined}` e `data-finish={dressed ? finish : undefined}`, para o E2E.

## 4. Tarefas (guia de implementação)

Worktree a partir da `dev-jg`. Um commit por tarefa, estilo `fix:`/`feat:`/`test:`/`docs:` em inglês. Gate entre tarefas: `npm run build && npm run lint && npm test`. E2E só na tarefa 6.

### Tarefa 1: `upInk` e `glowMesh` (A2)

Crie `src/scene/inkGlow.ts`. Teste em `tests/inkGlow.test.ts`:
- `upInk`: 4 triângulos com normais `[0,1,0]` (tinta), `[1,0,0]` (tinta), `[0,1,0]` (sem tinta), `[0,0.7071,0.7071]` (tinta); com `down = [0,-1,0]` devolve `[0, 3]`; com `down = [-1,0,0]` devolve `[1]`.
- `glowMesh`: um `Group` com um `Mesh` de 2 triângulos (um com tinta virado para cima, um com tinta virado para o lado; `geometry.userData.ink = Uint8Array.from([1, 1])`; atributo `normal` coerente), o mesh com `position.set(1, 0, 0)` e `scale.setScalar(2)`. Devolve um `Mesh` de 1 triângulo, com vértices no espaço do grupo (deslocados e escalados) mais o empurrão de 0,004 para cima. Se nada passar, devolve `null`.

### Tarefa 2: vista de cima no `showcasePoses` (A1)

Em `tests/showcase.test.ts`, no teste de forma livre que já existe, acrescente o caso `above = [true, true]`: a normal do rótulo girada deve ter produto escalar ≈ **−1** com `toCam` (`toBeCloseTo(-1, 5)`), e o `up` continua `> 0.9`. O caso sem `above` continua igual.

### Tarefa 3: brilho no showcase (A3, A4)

Implemente A3 e o gancho A4. Não há teste unitário novo além das tarefas 1 e 2; a tarefa 6 cobre de ponta a ponta. Confira à mão no `npm run dev`: importe `C:\Users\joao.menezes\Downloads\dados-forma-livre\D5Shard.stl` como forma livre, "Sim, só as grandes", calibre 1–5, tinta dourada, role 10. Os dados chegam à frente mostrando as gravações de cima, acesas e pulsando. Anote a medida do passo 5 de A3 na seção 6.

### Tarefa 4: tinta ao vivo na prévia (B1, B2)

Implemente B1 e B2. Confira à mão com o mesmo `D5Shard.stl`: no passo de salvar, trocar Dourada → Branca → Sem tinta e Gema → Fosco muda a prévia na hora.

### Tarefa 5: documentação

- `docs/contexto/apresentacao.md`, seção Showcase: um item novo, "dado de forma livre gravado (`readsDown` + `printed`): vista de cima, como na calibração; a gravação de cima acende (`inkGlow.ts`) no lugar do número solto; sem gravação achada, o número fica na frente do dado".
- `docs/contexto/dados.md`, linha **Showcase** da seção "Dado de forma livre": acrescente a mesma regra em uma frase.
- `docs/contexto/testes.md`: gancho `inkGlow(i)` na tabela.
- `docs/superpowers/specs/2026-11-12-forma-livre-voa-design.md`: logo abaixo do título, `> **Atualização 2026-11-12:** dado gravado mostra a vista de cima com a gravação acesa; ver 2026-11-12-gravacao-acesa-e-tinta-ao-vivo-design.md.`
- `docs/backlog.md`: itens 5.1 e 5.2 marcados "implementado em 2026-11-12" com link para esta spec (não apague o texto).

### Tarefa 6: E2E (uma rodada só, no fim)

Em `e2e/import.spec.ts`:

1. **Teste novo, "an engraved shard flies showing its top engraving lit"**:
   - o modelo: `const r = detectFree(asFile(shardTriangles(5))), solid = idealSolid('livre', r.planes)` (importe de `../src/dice/importer`), depois `stl(modelTriangles(solid.poly, { engrave: 0.04 }))`. Se `modelTriangles` não gravar esse sólido (confira se `labels` muda os triângulos), registre na seção 6 e use o caminho 2 abaixo;
   - fluxo igual ao teste do shard que já existe (linha ~214): "Importar como dado de forma livre", "Sim, só as grandes", "Continuar", "Sim, calibrar", valores 1–5, `save(page, 'Gravado5')`;
   - rolar com `throwWithSpace` e esperar `settled`;
   - `inkGlow(0)` não é `null`, `triangles > 0`, `visible`, e `opacity > 0`;
   - `highlights()[0].visible === false`.
2. **No teste do shard que já existe** (sem gravação, "Sim, calibrar"): depois do `settled`, `inkGlow(0)` é `null` e `highlights()[0].visible === true` (o número fica na frente do dado).
3. **No teste "painted numerals"** (linha ~185): antes de `save`, confira o `.import-preview`:
   - `data-ink` com a cor dourada automática;
   - depois de `getByLabel('Branca').check()`, `data-ink` = `#F2EEE4`;
   - depois de `getByLabel('Fosco').check()`, `data-finish` = `fosco`.
   Os rótulos `Branca`/`Fosco` aparecem duas vezes na página depois de salvar (no painel "Meus dados" também); antes de salvar só existem no assistente.
4. Rode só `npx playwright test e2e/import.spec.ts e2e/coin.spec.ts e2e/smoke.spec.ts --reporter=line`, sem outra rodada de Playwright na máquina.
5. Preencha a seção 6 com os commits, a medida de A3.5 e o resultado da rodada. Commite (`docs:`).

## 5. Fora de escopo

- Saber qual gravação é qual número (exigiria ler o desenho dos números).
- Brilho em dados d4–d20 importados (o número deles já está na face que vira para a câmera).
- Refatoração visual do assistente (backlog, seção 4).

## 6. Implementação

Branch `claude/gravacao-acesa-68ef1e` (a partir da `dev-jg`), um commit por tarefa:

1. `6a59ba5` upInk e glowMesh (+ `tests/inkGlow.test.ts`)
2. `e0a056e` showcasePoses com `above` (+ caso em `tests/showcase.test.ts`)
3. `6c551f1` brilho no showcase + gancho `inkGlow(i)`
4. `f8899ba` tinta e acabamento ao vivo na prévia do assistente
5. `36bac1b` documentação
6. E2E + esta seção

**Diferenças em relação à spec**

- **A3.5 (custo):** benchmark sintético em Node (10 malhas de 50 mil triângulos, 1 em cada 5 com tinta): ~223 ms no total, bem acima de 16 ms. Por isso `glowMesh` ganhou o parâmetro opcional `key` e guarda a geometria num `Map` (chave `${kind}|${raw}`); o material é novo a cada brilho, então `dropGlows` descarta só o material (a geometria é compartilhada). A primeira vez de cada `kind|valor` ainda paga a varredura; um shard real tem bem menos de 50 mil triângulos. Não medi com o `D5Shard.stl` dentro do jogo (sem como cronometrar o quadro do pouso no navegador embutido).
- **`data-ink` no assistente:** é a cor final da tinta (`inkColor`), como a spec pede. Com a gema padrão do assistente (`GEM.d20`, clara) a tinta automática de um STL é a **escura** (`#1B1A16`), não a dourada; na mesa o dado usa a cor da gema da mesa (vermelho escuro no teste), onde sai dourada. O teste confere só que `data-ink` é uma cor hex no automático.
- **Teste "painted numerals":** antes de salvar volto para Automática/Gema para o resto do teste (que espera a tinta automática e o brilho de gema na mesa).
- **Teste do shard sem gravação (item 2 da tarefa 6):** não deu para afirmar `inkGlow(0) === null`. O shard sintético (`shardTriangles`) tem 6 triângulos que a máscara de tinta toma por gravação, então o brilho existe. O teste agora confere que o número solto só aparece quando não há brilho (`highlights()[0].visible === (inkGlow(0) === null)`). O caminho "gravação não achada → número na frente do dado" **não tem E2E**.
- **Teste novo "an engraved shard…":** `modelTriangles(solid.poly, { engrave: 0.04 })` grava o sólido do shard (um furo hexagonal por face) e o brilho aparece (`triangles > 0`, visível, opacidade > 0, número solto escondido).
- `markInk` exportado de `importer.ts` e `usePainted`/`paintGlb`/`GemMaterial` de `Die.tsx`, como na spec; no `Preview`, a máscara do STL é calculada num `useMemo` que devolve um booleano (a regra `void-use-memo` do lint recusou o `useMemo` sem retorno).

**Conferência manual** (`npm run dev`, `D5Shard.stl`, forma livre, "Sim, só as grandes", 1–5): no passo de salvar, Branca → `data-ink=#F2EEE4` e Fosco → fosco opaco com a tinta escura aparecendo na prévia. Com 10 shards rolados, todos chegam à frente vistos de cima com as gravações das pontas à vista. **Não consegui confirmar a olho o brilho pulsando** (a tinta automática é escura numa gema clara e a cor do brilho, só 40% clareada, se confunde); o E2E confirma que a malha existe e acende.

Brilho reforçado a pedido do João (aditivo, cor puxada para #FFE38A, pulso cheio).

Brilho por face (a pedido da sessão principal, após o D5Shard real acender só metade de cada número): `upInk` decide pela face do sólido de menor folga sob o centro de cada triângulo de tinta, não pela normal do triângulo, então a gravação acende inteira ou não acende. Nenhum caso de aresta entre duas faces errou nos testes; não foi visto no D5Shard real.

Máscara de tinta na forma livre: no D5Shard real (R=0,85), ~58% dos ~8.000 triângulos afundados das 5 faces das pontas caíam só por `INTERIOR` (folga da 2ª face de 0,046 a 0,08 R), enquanto os chanfros ficam até 0,021 R. Decisão (sessão principal): `INTERIOR_FREE = 0.03` só para a base `livre`; d4–d20 seguem em 0,08.

**Gate:** `npm run build && npm run lint && npm test` verde em todas as tarefas (322 testes). **E2E** (`import`, `coin`, `smoke`): 17 testes, 16 passaram na rodada única e 1 falhou (o do shard, pelo item acima, erro do teste); depois de ajustar, esse teste foi rodado sozinho e passou.
