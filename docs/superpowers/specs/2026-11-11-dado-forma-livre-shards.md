# Adendo à spec do dado de forma livre: faces de leitura (shards)

Data: 2026-11-11 · Status: aprovado para implementar · Complementa: `2026-11-11-dado-forma-livre-design.md` (já implementada na branch `claude/forma-livre-9c778e`)

## 1. O problema

Validado com STLs reais (sessão de dev, 2026-11-11):

| Arquivo | Faces de apoio detectadas | Faces numeradas de verdade |
|---|---|---|
| d30 (`sycarion/stldice`) | 30 | 30 ✅ |
| D5 Shard (`LazareLive/AutomatedDices`) | 15 (5 de ~9,5% da área, 5 de ~4,6%, 5 de ~1,4%) | 5 |
| D7 Shard (mesmo repositório) | 14 (7 de ~6,8%, 7 de ~3,9%) | 7 |

Dados "shard" (cristal) têm faces longas numeradas e pontas lapidadas em camadas de facetas. As facetas passam nas regras de área (≥ 10% da maior) e de estabilidade, então o assistente pede para calibrar 15 faces num d5, e o numeral fica minúsculo, porque `font` usa o menor inraio de todas as faces. Subir o limiar de área não resolve: as facetas têm 48–57% da área das faces de verdade, e um limiar assim cortaria faces legítimas de outros dados.

## 2. Decisão

Separar **faces de apoio** (onde o dado pode parar; formam o sólido) de **faces de leitura** (as que valem como resultado).

- A física continua usando o sólido inteiro, com as pontas. Nada muda no colisor nem na pré-simulação.
- Quando as faces de apoio formam **camadas** de tamanho, o assistente oferece usar só a camada maior como faces de leitura, com "Sim" como padrão.
- O resultado é sempre a face **de leitura** mais virada para baixo. Se o dado parar numa ponta (raro), vale a face de leitura mais virada para baixo naquele momento.
- O numeral é dimensionado pelas faces de leitura.
- Dados sem camadas (d30, prismas regulares) não mudam.

## 3. Requisitos

| ID | Requisito |
|---|---|
| S1 | `detectFree` informa `tier`: o número de faces grandes quando há camadas, ou `null` |
| S2 | Há camada quando, com as áreas das faces de apoio em ordem decrescente, existe o menor `k ≥ 3` com `area[k] < 0,70 × area[k−1]` (constante `TIER_DROP`), as `k` primeiras estão a no máximo 1,3× umas das outras (`area[0] ≤ 1,3 × area[k−1]`) e **sobram pelo menos `k` faces** depois delas (as pontas de um shard vêm em camadas de `k`; um prisma de 7 faces com tampas pequenas sobra só 2 e não é camada). Áreas medidas nos polígonos do sólido ideal. Revisado em 2026-11-12: 0,65 não pegava o D7Shard real (razão 0,657) |
| S3 | Com camada, o assistente mostra "Encontrei K faces grandes e M menores (pontas). Usar só as grandes como resultado?" com **Sim, só as grandes** (principal) e **Não, todas** |
| S4 | Só as faces de leitura entram na calibração, na numeração automática, nos rótulos (`labelList`) e no tamanho do numeral |
| S5 | `readUp` com `readsDown` escolhe entre as faces de leitura |
| S6 | O aviso de justiça (L7) compara só as faces de leitura |
| S7 | Registros já salvos (sem a marcação) continuam lendo todas as faces, como hoje |

## 4. Design

- `Face` (`src/dice/polyhedra.ts`) ganha `readable?: boolean`; ausente = `true` (S7).
- `detectFree` (`src/dice/importer.ts`) devolve também `tier: number | null` (regra S2) e `areas: number[]` na mesma ordem de `planes`.
- Nova função pura `export function withReadable(poly: Polyhedron, readable: Vec3[] | null): Polyhedron` em `importer.ts`: devolve uma cópia em que `faces[i].readable = false` para as faces cuja normal não casa (produto escalar > 0,9999) com nenhuma de `readable`; `labelList` sem os rótulos das faces não legíveis; `font = 0,45 × menor inraio entre as faces legíveis` (o cálculo de inraio que `idealSolid` já faz); valores das não legíveis = 0. `readable === null` devolve o poliedro sem mudança.
- `readUp` (`src/dice/read.ts`): no ramo `readsDown`, a função `marks(poly)` usa só `faces.filter(f => f.readable !== false)`.
- `askOrder` e `checkFreeValues`: contam só as faces legíveis (`count` = número delas).
- `renumbered` preserva `readable` (como já preserva `readsDown` e `font`).
- `dentTester`/`inkTriangles` continuam usando **todas** as faces (é geometria, não leitura).

## 5. Tarefas (guia de implementação)

Branch: a sua (`claude/forma-livre-9c778e`). Antes: `git merge --no-edit refs/heads/dev-jg` para receber este arquivo (só documentação, sem conflito esperado).

### T8 · Camadas e faces de leitura (lógica pura)
**Arquivos:** `src/dice/polyhedra.ts`, `src/dice/importer.ts`, `src/dice/read.ts`; testes em `tests/importer.test.ts`, `tests/read.test.ts`, helper em `tests/helpers/models.ts`.
1. `Face.readable?: boolean`.
2. `detectFree` → `{ planes, dropped, uneven, tier, areas }` com a regra S2. `uneven` passa a ser calculado depois da escolha (S6): exporte `export const unevenOf = (areas: number[]) => Math.max(...areas) > 2 * Math.min(...areas);` e calcule no assistente sobre as áreas das faces de leitura.
3. `withReadable(poly, readable)` como na seção 4.
4. `readUp`, `askOrder`, `checkFreeValues`, `renumbered` como na seção 4.
5. Helper `shardTriangles(sides: number)`: prisma de `sides` lados, comprimento 3× o diâmetro, cada ponta lapidada em duas camadas de facetas (uma pirâmide truncada de `sides` facetas inclinadas a ~35° e outra de `sides` facetas a ~60°, mais estreitas).

**Verificar (Vitest):**
- shard sintético de 5 lados → `tier === 5`; de 7 → `tier === 7`; prisma regular de 7 faces e triacontaedro → `tier === null`;
- `withReadable` no shard de 5 → 5 faces legíveis, `labelList.length === 5`, `font` maior que o calculado com todas as faces;
- `readUp` com o shard apoiado numa faceta da ponta (normal da faceta virada para −Y) devolve o valor de uma face legível;
- registro sem `readable` lê como antes.

### T9 · Assistente
**Arquivo:** `src/ui/ImportDie.tsx` (tela de forma livre, perto da linha 306).
1. Com `imp.tier`, mostre a pergunta S3 antes da numeração. "Sim, só as grandes" → `withReadable(imp.poly, normais das imp.tier maiores faces)`; "Não, todas" → `withReadable(imp.poly, null)`.
2. O texto "encontrei N faces de apoio" passa a dizer, quando houver escolha, "N faces de apoio, K valem como resultado".
3. O aviso de justiça (`uneven`) usa `unevenOf` sobre as áreas das faces de leitura.

**Verificar:** `npm run build && npm run lint && npm test`; manual no `npm run dev` com o `D5Shard.stl` e o `D7Shard.stl` que você já baixou (estão no seu scratchpad): pergunta aparece, calibração pede 5 e 7 faces, o numeral fica do tamanho do d30.

### T10 · Documentação e E2E
- `docs/contexto/dados.md`: um parágrafo "Faces de apoio × faces de leitura (shards)".
- Fim da spec principal ("Implementação e medições"): resultado com os três STLs reais depois da T9.
- E2E: no teste de forma livre de `e2e/import.spec.ts`, acrescente o caso do shard sintético (a pergunta aparece; "Sim" → calibração com 5 faces). Entra na rodada única do fim, que continua esperando o "liberado".

## 6. Regras

As mesmas da spec principal: só implementar, sem reescrever spec; perguntas para a sessão principal via `SendMessage` (`to: "local_b87dd7e4-6ecc-471c-8358-f5cf71a0d2bc"`); no `wrap_up`, só `recap`; commits atômicos, sem push; nenhum Playwright até o "liberado".
