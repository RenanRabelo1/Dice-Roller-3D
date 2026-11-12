# Dado de forma livre voa até a frente no resultado

Status: **aprovada para implementar** (2026-11-12). Corrige uma decisão da spec `2026-11-11-dado-forma-livre-design.md` (linha "Showcase").

## 1. Problema

Depois do arremesso, todos os dados voam até a frente da câmera com a face sorteada virada para você (o *showcase*). Desde o PR #4 a moeda também voa. O dado de forma livre é o único que fica parado na bandeja; só o número dele sobe. Parece bug.

A regra veio da spec da forma livre: "a face de baixo não dá para mostrar à câmera". Isso está errado. `showcasePoses` (`src/scene/showcase.ts`) gira o dado até a normal do **rótulo** do valor sorteado apontar para a câmera, e o numeral do dado de forma livre é desenhado na própria face lida (a de baixo). Não importa que ela estivesse embaixo na bandeja: no voo ela vira para a câmera como qualquer outra.

## 2. Comportamento novo

| Situação | Hoje | Depois |
|---|---|---|
| Dado de forma livre no resultado | fica onde parou; o número sobe até a fileira | voa até a fileira como os outros, com a face sorteada (a que estava embaixo) virada para a câmera e o numeral em pé |
| Shard (só algumas faces valem) | idem | idem; a face sorteada é sempre uma das legíveis (`labelList` só tem as legíveis) |
| Valores repetidos (ex.: duas faces "1") | — | voa mostrando a **primeira** face com aquele valor (`labelList.find`). O número mostrado é o certo; a face pode não ser a mesma em que ele parou. Aceito: o jogador lê o valor, não a face |
| Movimento reduzido | número aparece em cima do dado | sem mudança (o showcase já não voa com `reducedMotion`) |
| Presságios | nunca disparam | sem mudança |

Nada muda na física, na leitura (`readsDown`) nem na pré-simulação.

## 3. Por que é seguro

- `showcasePoses` já trata qualquer `Polyhedron`: só precisa de `labelList` com `normal` e `up`. O dado de forma livre tem os dois (`fromTriangles('livre')`, `withReadable`).
- O espaço da fileira usa `MAX_RADIUS = 0.9` (`physics/world.ts`); `RADIUS.livre = 0.85` cabe.
- O número em destaque já usa a fonte do próprio dado: `scale: … (poly.font ?? FONT[poly.shape]) / HL_SIZE` em `Hand.tsx`.
- O caminho comum de voo em `Hand.tsx` (sombra que some, arco, número que gruda na face) já serve para os dados importados d4–d20.

## 4. Tarefas (guia de implementação)

Trabalhe na branch da sua worktree, criada a partir da `dev-jg` atual. Uma tarefa por commit, estilo `fix:`/`test:`/`docs:` com descrição curta em inglês. Não rode o E2E antes da tarefa 4.

### Tarefa 1: remover `staysOnTray`

1. `src/dice/polyhedra.ts`: apague a função `staysOnTray` e o comentário logo acima dela (perto da linha 253, `// A free-form die stays where it stopped…`).
2. `src/scene/Hand.tsx`:
   - na importação de `../dice/polyhedra` (linha 6), tire `staysOnTray`;
   - no laço `current.forEach((body, i) => {` da fase `settled`, apague o bloco inteiro `if (staysOnTray(state.dice[i])) { … return; }` (perto da linha 257, 7 linhas: calcula `t`, faz `pin(...)`, `draw(i, new Vector3(...to[i].p))` e `return`). O bloco seguinte (`const grabbed = kraken.includes(i)…`) passa a ser o primeiro do laço.
3. `tests/polyhedra.test.ts`: apague o `describe('staysOnTray', …)` (perto da linha 111) e tire `staysOnTray` da importação na linha 2.
4. Confira com Grep que não sobrou `staysOnTray` em `src/` nem em `tests/`.

**Verificar:** `npm run build && npm run lint && npm test` verdes.

### Tarefa 2: teste do showcase para forma livre

Em `tests/showcase.test.ts`, dentro do `describe('showcasePoses', …)`, acrescente um teste para dois dados de forma livre: um prisma e um shard. Use os helpers que já existem em `tests/helpers/models.ts`: `freeDieOf`, `prismTriangles`, `shardTriangles`. Imports novos: `customKind` de `../src/dice/custom`, e os três helpers de `./helpers/models`.

```ts
it('free-form dice (a prism and a shard) fly with the rolled face to the camera, upright', () => {
  const c = camera(1.6);
  const prism = freeDieOf(prismTriangles(5, 1.4), 'Prisma', 'prisma');
  const shard = freeDieOf(shardTriangles(5), 'Shard', 'shard');
  const polys = [prism, shard].map((d) => polyhedron(customKind(d.id)));
  const raw = polys.map((p) => p.labelList[p.labelList.length - 1].value); // the last readable face
  const poses = showcasePoses(polys, raw, view(c));
  const up = new Vector3(0, 1, 0).applyQuaternion(c.quaternion);
  poses.forEach(({ p, q }, i) => {
    const rot = new Quaternion(...q);
    const label = polys[i].labelList.find((l) => l.value === raw[i])!;
    const toCam = c.position.clone().sub(new Vector3(...p)).normalize();
    expect(new Vector3(...label.normal).applyQuaternion(rot).dot(toCam)).toBeCloseTo(1, 5);
    expect(new Vector3(...label.up).applyQuaternion(rot).dot(up)).toBeGreaterThan(0.9);
  });
});
```

`freeDieOf` registra o dado no registro global (`registerCustom`). No fim do teste, desregistre os dois, como `tests/custom.test.ts` faz: `unregisterCustom(customKind(prism.id)); unregisterCustom(customKind(shard.id));` (importe `unregisterCustom` de `../src/dice/custom`). Para o valor sorteado use sempre `p.labelList`, que já só tem as faces legíveis (`withReadable`); não invente outro filtro.

**Verificar:** `npm test` verde, com o teste novo passando.

### Tarefa 3: documentação

- `docs/contexto/dados.md`, linha do **Showcase** na seção "Dado de forma livre": troque por
  `- **Showcase**: voa até a fileira como os outros dados, com a face sorteada (a de baixo) virada para a câmera; com valores repetidos, mostra a primeira face daquele valor. Nunca dispara presságio (`isD20` é falso).`
- `docs/contexto/apresentacao.md`, seção "Showcase": se houver menção a dado que fica na bandeja, tire. Hoje só a moeda é citada e ela já voa.
- `docs/superpowers/specs/2026-11-11-dado-forma-livre-design.md`: logo abaixo do título, acrescente
  `> **Atualização 2026-11-12:** o dado de forma livre agora voa no showcase; ver 2026-11-12-forma-livre-voa-design.md.`
  Não apague as linhas antigas (é histórico).
- `docs/backlog.md`: não muda.

### Tarefa 4: E2E (uma rodada só, no fim)

Em `e2e/import.spec.ts`, o teste `a free-form prism imports, rolls, reads from below, stays on the tray and survives a reload` (perto da linha 140):

1. Renomeie para `a free-form prism imports, rolls, reads from below, flies to the front and survives a reload`.
2. Troque o trecho que começa em `// it does not fly to the camera: it stays where it stopped` e vai até `expect(after[1]).toBeLessThan(1.5);` por:

```ts
// it flies to the front like any die, the rolled face (the one it rested on) towards the camera
const landed = (await page.evaluate(() => window.__dice.bodies()))[0].p;
const throwId = await page.evaluate(() => window.__dice.state().throwId);
await expect.poll(() => page.evaluate(() => window.__dice.state().showcased)).toBe(throwId);
const [{ p, q }] = await page.evaluate(() => window.__dice.bodies());
expect(Math.hypot(...p.map((v, k) => v - landed[k]))).toBeGreaterThan(2);
const camera = await page.evaluate(() => window.__dice.camera());
const face = labels.find((l) => l.value === result)!.normal;
// rotate the face normal by the body's quaternion (v' = v + 2w(u×v) + 2u×(u×v), u = q.xyz, w = q.w)
const [x, y, z, w] = q, cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const t = cross([x, y, z], face).map((v) => 2 * v), turned = face.map((v, k) => v + w * t[k] + cross([x, y, z], t)[k]);
const toCam = camera.map((v, k) => v - p[k]), length = Math.hypot(...toCam);
expect(turned.reduce((s, v, k) => s + v * toCam[k] / length, 0)).toBeGreaterThan(0.99);
```

`labels` e `result` já existem logo acima, no mesmo teste. `__dice.camera()` devolve a posição da câmera (ver `docs/contexto/testes.md`). Se o nome do hook for outro, use o que `src/testHook.ts` declara.

3. Rode só os arquivos afetados, com a máquina sem outra rodada de Playwright (ver testes.md, "Rodar E2E sem atrapalhar outra rodada"):
   `npx playwright test e2e/import.spec.ts e2e/coin.spec.ts e2e/smoke.spec.ts --reporter=line`
4. Se algo falhar, anote o teste e a mensagem na seção 6 e mande para a sessão principal. Não mexa em outros testes para fazer passar.
5. Preencha a seção 6 desta spec com os hashes dos commits e o resultado da rodada, e commite (`docs:`).

**Gate final:** `npm run build && npm run lint && npm test` mais a rodada do passo 3.

## 5. Fora de escopo

- Escolher a face exata em que o dado parou quando há valores repetidos (precisaria passar o índice da face, não o valor, da pré-simulação até o showcase).
- Gravar dados de forma livre na API de histórico (a API só aceita d4–d20 importados; decisão do João e do Renan).

## 6. Implementação

Branch `claude/livre-voa-d0c3fc` (base `dev-jg`). Commits:

- `946fc1d` fix: remove `staysOnTray` (tarefa 1)
- `4b7ab6f` test: showcase de forma livre (tarefa 2)
- `bbe8655` docs (tarefa 3; `apresentacao.md` não tinha nada a tirar)
- `8e79ebf` test: E2E da forma livre (tarefa 4)

Gate: `npm run build && npm run lint && npm test` verde (319 testes).

E2E (`import`, `coin`, `smoke`): 15 de 16 passaram na rodada única; o teste do prisma falhou por erro do **teste** da spec, não do app. Duas diferenças em relação ao trecho da spec:

1. `settled()` do `import.spec.ts` já espera `showcased === throwId`, então `landed` e `labels` seriam lidos depois do voo (distância 0). Troquei, nesse teste, por `waitForFunction(phase === 'settled')`, lendo `landed`/`labels` antes do voo (começa 1 s depois).
2. `__dice.labels()` devolve normais em **coordenadas de mundo**, mas o trecho as rotacionava como locais (resultado −0,015). Agora a normal volta ao referencial do dado com o inverso da pose de repouso (`landedQ`) e só então é girada pela pose final.

Com isso, `npx playwright test e2e/import.spec.ts -g "free-form prism"` passou (reexecutado sozinho; as outras 15 não foram repetidas).
