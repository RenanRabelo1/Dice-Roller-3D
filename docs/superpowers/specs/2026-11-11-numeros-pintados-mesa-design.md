# Números pintados no dado importado, na mesa: design

Data: 2026-11-11 · Status: aprovado para implementar · Branch base: `dev-jg` · Depende de: caminho A (na `main`); implementar **depois** de `2026-11-11-dado-forma-livre-design.md` (mesmos arquivos)

## 1. Objetivo

Os números esculpidos de um dado importado ficam legíveis **durante o jogo**, não só na prévia do assistente. O jogador escolhe a cor da tinta (ou nenhuma) e, para STL, o acabamento (gema ou fosco).

## 2. Como está hoje

| Peça | Onde | Comportamento |
|---|---|---|
| Detecção da gravação | `src/dice/importer.ts` → `dentTester`, `inkOf`, `looksNumbered` | um ponto é "gravação" quando está afundado abaixo do plano de uma face, longe das arestas |
| Prévia do assistente | `src/ui/ImportDie.tsx` (linhas ~73–87) | STL clonado, cor por vértice (claro / tinta escura) com `meshStandardMaterial vertexColors`; GLB não é pintado |
| Dado na mesa | `src/scene/Die.tsx` → `useModel`, `GemMaterial` | STL com a gema translúcida (`opacity 0.88`, clearcoat) na cor `custom.color`; GLB com os materiais dele; com `printed`, nenhum numeral nosso |
| Registro | `src/dice/custom.ts` → `CustomDie` | sem campo de tinta nem de acabamento |

Resultado: num STL, o número é só relevo numa gema translúcida e some com a luz; num GLB sem textura de números, idem.

## 3. Decisões (respostas do backlog)

| Pergunta | Decisão |
|---|---|
| Cor da tinta | **Automática** por padrão (gema clara → tinta escura `#1B1A16`; gema escura → dourada `#D4A93F`, a mesma regra do `INK` dos dados de hoje), mais as opções **dourada, escura, branca (`#F2EEE4`) e sem tinta** |
| Acabamento fosco | Sim, para **STL**: "Gema" (como hoje) ou "Fosco" (`meshStandardMaterial`, opaco, roughness 0,8). Fosco deixa a gravação bem mais legível |
| GLB com textura própria | A tinta **multiplica** a cor do material: funciona bem com tinta escura; dourada e branca quase não aparecem sobre textura escura. O painel mostra só "escura" e "sem tinta" para GLB com textura |
| Dados que já foram importados | Recebem tinta automática na próxima carga se tiverem `printed: true`; o jogador muda depois |

## 4. Requisitos

| ID | Requisito |
|---|---|
| P1 | Dado importado com `printed: true` aparece na mesa com a gravação pintada na cor da tinta |
| P2 | Tinta: automática (padrão), dourada, escura, branca ou sem tinta; GLB com textura: só escura ou sem tinta |
| P3 | STL: acabamento gema (padrão) ou fosco |
| P4 | A pintura é por **triângulo** (borda do número nítida), não por vértice interpolado |
| P5 | A escolha fica no assistente (passo Salvar) e num botão **Tinta** ao lado do dado em "Meus dados", que muda na hora, sem reimportar |
| P6 | Registros antigos abrem sem migração: sem campo → tinta automática se `printed`, acabamento gema |
| P7 | Nenhuma travada visível ao trocar tinta/acabamento e nenhum custo por quadro: as cores são calculadas uma vez por dado |
| P8 | O resultado e a física não mudam (é só material e cor) |

## 5. Design técnico

### 5.1 Registro (`custom.ts`)

`CustomDie` ganha dois campos opcionais: `ink?: 'auto' | 'ouro' | 'escura' | 'branca' | 'nenhuma'` e `finish?: 'gema' | 'fosco'`. Ausentes = `'auto'` e `'gema'`. Versão continua 1.

### 5.2 Cores por triângulo (`importer.ts`)

- Nova `inkTriangles(positions, solid): Uint8Array` — 1 por triângulo, quando o centro do triângulo é "gravação" pelo `dentTester` existente. `inkOf` (prévia) passa a usar a mesma função.
- Para GLB: `collect` já aplica a matriz de cada malha; a pintura percorre malha a malha (`toNonIndexed` quando indexada), com o mesmo teste.
- Calculado **uma vez** em `modelObject` (já é cacheado por dado) e guardado como atributo `color` na geometria.

### 5.3 Material (`Die.tsx`)

- STL: `vertexColors` ligado; cor do atributo = cor da gema fora da gravação, cor da tinta dentro; `material.color` branco. Acabamento gema = o `meshPhysicalMaterial` de hoje com `vertexColors`; fosco = `meshStandardMaterial` opaco, roughness 0,8, `vertexColors`.
- GLB: o atributo `color` multiplica a textura/cor do material: 1 fora da gravação, cor da tinta dentro; `material.vertexColors = true` nos clones.
- Trocar tinta só reescreve o atributo `color` (`needsUpdate`); trocar acabamento troca o material.
- **Shaders:** `vertexColors` e o material fosco são variantes novas. Compilar no momento do import e ao trocar acabamento (`gl.compile`), como a mesa importada já faz, para não travar o primeiro arremesso (ver `docs/contexto/armadilhas.md`).

### 5.4 Interface

- Assistente, passo Salvar: "Tinta dos números" (só quando `printed`) e, para STL, "Acabamento".
- "Meus dados": botão **Tinta** por dado importado com `printed`, abrindo as mesmas opções; aplica na hora e salva no IndexedDB.

## 6. O que acontece se der errado

| Situação | O app faz |
|---|---|
| Modelo sem gravação detectável (`printed` falso) | não mostra opção de tinta |
| Detecção pinta coisa que não é número (textura em relevo, rachaduras) | o jogador escolhe "sem tinta" |
| Tinta clara sobre GLB com textura escura | opção não oferecida (P2) |
| IndexedDB indisponível | a escolha vale só na sessão (regra que já existe) |

## 7. Testes

**Vitest:** `inkTriangles` em modelo sintético com gravação (helpers de `tests/helpers/models.ts`) marca só os triângulos da gravação; modelo liso e modelo só chanfrado → nenhum; registro antigo sem `ink`/`finish` resolve para auto/gema; regra automática de cor (gema clara → escura, escura → ouro).

**Playwright** (uma rodada no fim): importar o d20 gravado sintético → na mesa, pixel na região de um número tem a cor da tinta escolhida; trocar a tinta em "Meus dados" muda o pixel sem recarregar; fosco deixa o material opaco (`__dice` expõe o tipo de material do dado).

**Desempenho:** 10 dados importados de ~48 mil triângulos com tinta: p95 do arremesso igual ao sem tinta (±1 ms) na GPU de referência.

## 8. Riscos

- **Gravação rasa** (pouco abaixo do plano) não é detectada: limiar `DENT` já calibrado no caminho A; se um STL real falhar, ajustar e registrar.
- **Números em alto relevo** ficam acima do plano da face: o casco os engole e o `dentTester` não os vê. Fora de escopo; tinta não aparece neles.

## 9. Decisões em aberto (padrão adotado)

1. Tinta automática por padrão (padrão: sim).
2. Branca como opção (padrão: sim).

## 10. Ordem de construção

1. `inkTriangles` + testes; `inkOf` passa a usá-la.
2. Campos `ink`/`finish` + resolução de padrões.
3. Material e atributo de cor em `Die.tsx` (STL e GLB) + compilação antecipada.
4. Assistente e botão Tinta em "Meus dados".
5. Docs: `docs/contexto/dados.md`.
6. **E2E só no fim**, uma rodada, depois de pedir horário à sessão principal.

## 11. Tarefas (guia de implementação)

Cada tarefa é um commit. Faça na ordem e não pule a verificação. Comece **depois** que a spec de forma livre estiver commitada: o `dentTester` usa `RADIUS[poly.shape]`, e a forma `'livre'` precisa existir.

### T1 · Máscara de tinta por triângulo
**Arquivo:** `src/dice/importer.ts`; teste em `tests/importer.test.ts`.
1. `export function inkTriangles(positions: ArrayLike<number>, solid: Solid): Uint8Array` — 9 números por triângulo em `positions`; para cada triângulo, teste o **centro** dele (média dos 3 vértices) com o `dentTester(solid)` que já existe; `1` se for gravação, `0` se não.
2. Reescreva `inkOf` em cima dela: para cada triângulo marcado, preencha `1` nos 9 valores dele (a prévia do assistente continua igual).

**Verificar:** helper em `tests/helpers/models.ts` que grava um "número" (afunda um quadradinho no meio de uma face do d20 sintético) → `inkTriangles` marca só os triângulos do quadradinho; d20 liso → nenhum; d20 só chanfrado → nenhum.

### T2 · Campos de tinta e acabamento
**Arquivos:** `src/dice/custom.ts`; teste em `tests/custom.test.ts`.
1. `CustomDie` ganha `ink?: 'auto' | 'ouro' | 'escura' | 'branca' | 'nenhuma'` e `finish?: 'gema' | 'fosco'`. Sem mudar `version`.
2. `export const INK_COLORS = { ouro: '#D4A93F', escura: '#1B1A16', branca: '#F2EEE4' } as const;`
3. `export function inkColorOf(die: CustomDie, gem: string): string | null` — `null` se `!die.printed` ou `ink === 'nenhuma'`; `'auto'` ou ausente → luminância relativa da cor da gema (`new Color(gem).getHSL` ou a fórmula `0.2126 r + 0.7152 g + 0.0722 b` em linear) > 0,5 → escura, senão ouro; os demais → `INK_COLORS[ink]`.
4. `export const finishOf = (die: CustomDie) => die.finish ?? 'gema';`

**Verificar:** registro sem os campos → tinta automática quando `printed`, nada quando não; gema clara (`#E8F1F8`) → escura; gema escura (`#231C20`) → ouro.

### T3 · Máscara calculada uma vez por dado
**Arquivo:** `src/dice/importer.ts` → `modelObject(die)`.
1. Depois do `readModel`, percorra as malhas do objeto (`traverse`); se a geometria for indexada, troque por `geometry.toNonIndexed()`; monte as posições **no espaço do modelo** aplicando `mesh.matrixWorld` (como `collect` faz) e guarde `mesh.userData.ink = inkTriangles(posições, { poly: die.poly, fit: die.fit })`.
2. Isso fica no cache que `modelObject` já tem (uma vez por dado).

**Verificar:** `npm test` verde (sem teste novo: coberto por T1 e pelo E2E).

### T4 · Material e cores na mesa
**Arquivo:** `src/scene/Die.tsx` → `useModel`, `GemMaterial`.
1. Leia `tinta = inkColorOf(custom, color)` e `acabamento = finishOf(custom)`.
2. **STL:** clone a geometria do modelo por dado (hoje ela é compartilhada) e crie o atributo `color` (3 floats por vértice): cor da gema fora da gravação, cor da tinta dentro (use `mesh.userData.ink` da T3). Material: `color` branco + `vertexColors`. `acabamento === 'gema'` → o `meshPhysicalMaterial` de hoje com `vertexColors`; `'fosco'` → `meshStandardMaterial` com `vertexColors`, `roughness 0.8`, `metalness 0`, `transparent` ligado e `opacity 1` (o retorno à mão mexe na opacidade). Sem tinta: sem atributo `color` e o material de hoje.
3. **GLB:** nos clones que já existem, crie `color` = branco fora da gravação e cor da tinta dentro; `material.vertexColors = true; material.needsUpdate = true`. Acabamento não se aplica.
4. Trocar só a tinta → reescreva o array do atributo e `needsUpdate = true` (sem recriar material). Trocar acabamento → troca o material.
5. **Shaders:** sempre que criar material novo ou ligar `vertexColors`, compile antes de mostrar: `const { gl, camera, scene } = useThree(); await gl.compileAsync(objeto, camera, scene);` e só então torne visível (veja como `src/scene/Tray.tsx` faz com a mesa importada).

**Verificar:** `npm run build && npm run lint && npm test`; no `npm run dev`, importar um d20 com números gravados e conferir a tinta na mesa.

### T5 · Interface
**Arquivos:** `src/ui/ImportDie.tsx`, `src/ui/Controls.tsx`, `src/store.ts`.
1. Assistente, passo Salvar (`step === 'save'`), só quando `printed`: grupo "Tinta dos números" com Automática · Dourada · Escura · Branca · Sem tinta; para STL, grupo "Acabamento" com Gema · Fosco. Para GLB cujo material tem `map`, mostre só Escura e Sem tinta.
2. `store.ts`: `updateCustom: (die: CustomDie) => Promise<string | null>`, igual ao `addCustom` (salva com `saveCustomDie`, chama `registerCustom`, atualiza `customs`), sem mexer na seleção.
3. `Controls.tsx`, grupo "Meus dados": ao lado do botão de excluir de cada importado com `printed`, um botão **Tinta** que abre as mesmas opções (um `details`/`popover` simples) e chama `updateCustom({ ...die, ink, finish })`. O dado na mesa muda na hora (o `Die` relê `customDie(kind)`).

**Verificar:** `npm run build && npm run lint`; manual no `npm run dev`.

### T6 · Documentação
`docs/contexto/dados.md`: parágrafo "Tinta e acabamento do dado importado". Seção "Implementação e medições" no fim desta spec (inclua a medição de desempenho com 10 dados pintados, feita com o método rAF do `docs/performance-coins.md`, depois de pedir horário à sessão principal).

### T7 · E2E (só no fim, junto com a rodada da forma livre)
Em `e2e/import.spec.ts`: importar o d20 gravado sintético → na mesa, a cor de um pixel no centro de um número é a da tinta; trocar a tinta em "Meus dados" muda o pixel sem recarregar; fosco → `__dice` informa material opaco. Esses testes entram na rodada única do fim.

## Implementação e medições

Feito nas tarefas T1–T6. O que ficou **sem medir**: o desempenho com 10 dados pintados de ~48 mil triângulos (precisa de horário combinado com a sessão principal) e a conferência de pixel da tinta na mesa (E2E, T7). Num teste manual no `npm run dev` (porta própria, sem Playwright) um d20 sintético gravado foi importado, calibrado e salvo; o botão **Tinta** apareceu, trocar tinta e acabamento atualizou o dado sem erros no console. A pintura ficou pequena demais na prévia de baixa resolução para conferir a cor a olho.

- `inkTriangles`: nos 6 sólidos sintéticos gravados (`engrave: 0.04`) marca exatamente as paredes das cavidades (12 triângulos por face) e nada mais; d20 liso e só chanfrado: nenhum.
- A máscara fica em `geometry.userData.ink`, não em `mesh.userData.ink` como no guia: `Object3D.clone` copia `userData` como JSON e destruiria o `Uint8Array` nos clones do GLB.
- `inkOf` (prévia) agora usa o centro do triângulo, então a borda do número fica por triângulo, como na mesa.
- O acabamento fosco vale para qualquer STL (também sem gravação); a tinta só para `printed`. A tinta de GLB com textura é gravada como `escura` mesmo se a escolha era automática.
- Não foi preciso mexer na física nem na leitura (P8).
