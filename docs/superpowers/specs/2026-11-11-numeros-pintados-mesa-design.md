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
