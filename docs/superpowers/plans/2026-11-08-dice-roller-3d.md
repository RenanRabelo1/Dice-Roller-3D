# DiceRoller 3D — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** rolador de dados de RPG em 3D (d4–d100, 1–10 por arremesso) em que o jogador mira, carrega a força e arremessa dados de gema numa bandeja, com o resultado lido da física real.

**Arquitetura:** toda decisão vive em módulos TypeScript puros (`dice/`, `throw/`, `physics/`) testados em Node, incluindo a física com o mesmo Rapier da tela. Os componentes React Three Fiber (`scene/`) e a UI (`ui/`) só ligam esses módulos ao Three, ao Rapier e ao DOM. Um gancho `window.__dice`, existente só em modo `test`, deixa o Playwright ler corpos, malhas e rótulos reais.

**Stack:** Vite 8.3 + React 19.3 + TypeScript ~7.0 (template `react-ts` do create-vite 9.3.0), three 0.187, @react-three/fiber 9.8, @react-three/drei 10.7, @react-three/rapier 2.2, @dimforge/rapier3d-compat 0.19.2, zustand 5.1, Vitest 4.1.12, Playwright 1.65, oxlint.

**Spec:** `docs/superpowers/specs/2026-11-08-dice-roller-3d-design.md` (aprovada; commit `077b1e2`). Leia a spec junto com este plano.

## Restrições globais

- Node 25.9.0 local; não alterar o Node. Scaffold com `create-vite@9.3.0`; Vitest **4.1.12** exato; `@dimforge/rapier3d-compat` **0.19.2** exato (igual ao usado por `@react-three/rapier` 2.2.0). Gerar e commitar `package-lock.json`.
- Git local, branch `feat/dice-3d`, sem remoto e sem push. Um commit por tarefa, com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textos da interface em português do Brasil. Mensagens de erro com o texto exato da spec, seção 5.
- Sem CDN em tempo de execução: fonte local em `public/fonts/` (+ licença), iluminação procedural.
- Um tipo de dado por arremesso; quantidade 1–10; o d100 usa 2 corpos d10 por dado (índice `2i` = dezenas, `2i+1` = unidades).
- Física: passo fixo `1/60`, gravidade `[0, -40, 0]`, CCD ligado, `interpolate={false}` no `<Physics>`, colisor explícito (`colliders={false}` + `ConvexHullCollider`).
- Protocolo: timeout em **480** passos, encostado se inclinação **> 15°**, no máximo **3** tentativas por corpo.
- Carga: onda triangular 0 → 1 → 0 com ciclo de **1400 ms**. Recolher: **400 ms** (imediato com `prefers-reduced-motion`, seguido de fade de 150 ms).
- Tipo do corpo (cinemático/dinâmico/fixo) muda só por `src/physics/apply.ts`; a prop `type` do `<RigidBody>` fica fixa em `"kinematicPosition"` e nunca é ligada à fase.
- `window.__dice` e o `?fail=` existem só com `import.meta.env.MODE === 'test'`.
- ponytail: nada além do que a spec pede; atalhos conhecidos levam o comentário `// shortcut: <limite>, <quando evoluir>`.

## Foco da revisão

Situações que a spec implica, ainda não cobertas pelos testes que ela lista. Cada uma ganhou um teste na tarefa dona do código:

1. **Redimensionar a janela entre arremessos:** a mira continua no lugar certo, porque o raycast usa o retângulo atual do canvas no momento do evento (Tarefa 11, `aim follows the pointer after a resize`).
2. **Trocar tipo/quantidade durante `rolling` com 20 corpos:** nenhum erro no console, a mão é refeita com os novos corpos e o arremesso antigo nunca publica (Tarefa 11, `selection during rolling resets cleanly`).
3. **Soltar o botão fora da área de jogo (sobre os controles):** exatamente um arremesso, graças à captura do ponteiro (Tarefa 11, `release over the controls still throws once`).
4. **Mira no canto da bandeja com força máxima:** os dados ainda param dentro, sem recuperação (Tarefa 7, `corner throw at max force stays inside`).
5. **Fluxo só com teclado:** Tab até a área, setas miram, Espaço joga, o resultado é anunciado na região `aria-live`, Espaço recolhe (Tarefa 11, `keyboard-only flow announces the result`).

---

## Estrutura de arquivos

```
index.html                  substitui o protótipo 2D (que fica no commit b335fc9)
package.json, package-lock.json, vite.config.ts, playwright.config.ts
tsconfig.json, tsconfig.app.json, tsconfig.node.json, tsconfig.test.json, .oxlintrc.json, .gitignore
public/fonts/bricolage-grotesque-400.woff, bricolage-grotesque-800.woff, OFL.txt
src/
  main.tsx, App.tsx, index.css
  physics/world.ts      constantes e geometria da bandeja, posições da mão e de recuperação
  physics/apply.ts      aplica lançamento, poses e ações do protocolo aos corpos Rapier
  dice/polyhedra.ts     poliedros, numeração, rótulos
  dice/read.ts          leitura da face/vértice de cima, resultados
  throw/aim.ts          alvo, carga, velocidade, giro, rng
  throw/gesture.ts      máquina de fases da entrada
  throw/settle.ts       protocolo de conclusão
  store.ts              estado (zustand)
  testHook.ts           window.__dice (modo test)
  scene/Stage.tsx, scene/Tray.tsx, scene/Die.tsx, scene/Hand.tsx
  ui/Controls.tsx
tests/                  *.test.ts (Vitest, Node) + helpers/sim.ts
e2e/                    *.spec.ts (Playwright) + global.d.ts
```

---

### Task 1: Scaffold e mundo físico (`physics/world.ts`)

**Arquivos:**
- Criar: arquivos do template copiados para a raiz, `tsconfig.test.json`, `playwright.config.ts`, `public/fonts/*`, `src/physics/world.ts`
- Modificar: `package.json` (scripts), `vite.config.ts` (bloco `test`), `tsconfig.json` (referência ao projeto de testes), `.gitignore`
- Teste: `tests/world.test.ts`

**Interfaces:**
- Produz (`src/physics/world.ts`):
  - `type Vec3 = [number, number, number]`, `type Quat = [number, number, number, number]` (x, y, z, w)
  - `STEP = 1/60`, `GRAVITY: Vec3 = [0, -40, 0]`
  - `TRAY = { halfWidth: 7, halfDepth: 4.5, wallHeight: 1.5, wallThickness: 0.5, lidY: 7 }`. Interior x ∈ [−7, 7], z ∈ [−4.5, 4.5]; chão em y = 0; a borda próxima do jogador é +z.
  - `MATERIAL = { die: { friction: 0.5, restitution: 0.3, density: 1.2 }, velvet: { friction: 0.8, restitution: 0.15 }, wall: { friction: 0.3, restitution: 0.45 } }`
  - `LAUNCH = { minSpeed: 6, maxSpeed: 22, lift: 0.35 }`, `SPIN = { min: 10, max: 25 }`, `NUDGE = { up: 3, torque: 0.6 }`
  - `SETTLE = { timeoutSteps: 480, maxAttempts: 3, cockedDeg: 15 }`
  - `HAND = { y: 3, z: 3, spacing: 1.9, cols: 5, pull: 0.6 }`, `MAX_RADIUS = 0.9`
  - `interface Box { kind: 'floor' | 'wall' | 'lid'; center: Vec3; half: Vec3 }`
  - `trayColliders(): Box[]`: chão (topo em y = 0), 4 paredes de y = 0 até `lidY` (visíveis só até `wallHeight`; o resto é invisível) e tampa com a face de baixo em `lidY`.
  - `clampHandX(x: number, bodies: number): number`
  - `handPositions(bodies: number, handX: number): Vec3[]` (até 20 corpos). Índice `i`: coluna `i % 5`, fileira `⌊i/5⌋ % 2`, camada `⌊i/10⌋`; `x = handX + (col − (min(bodies,5) − 1)/2) × spacing`, `y = HAND.y + camada × spacing`, `z = HAND.z − fileira × spacing`.
  - `recoveryPoint(index: number, bodies: number): Vec3`: grade de 5 colunas centrada em (0, 1.2, 0), espaçamento 1.9.
  - `isOutside(p: Vec3, radius: number): boolean`: verdadeiro se `|x| > halfWidth + radius`, `|z| > halfDepth + radius` ou `y < −radius`.

- [ ] **Passo 1: Gerar o template fora da raiz e copiar.** `--overwrite` apagaria `docs/` e `references/`, então gere em pasta temporária:

```bash
SCR="$TMP/dice-scaffold"; rm -rf "$SCR"
npx -y create-vite@9.3.0 "$SCR" --template react-ts --no-interactive --no-immediate
cp "$SCR"/{package.json,tsconfig.json,tsconfig.app.json,tsconfig.node.json,vite.config.ts,index.html,.gitignore} .
cp "$SCR"/.oxlintrc.json . 2>/dev/null || true
mkdir -p src && cp "$SCR/src/main.tsx" src/
```

Esperado: `package.json` com `"build": "tsc -b && vite build"` e `"lint": "oxlint"`. Não copie `src/App.css`, `src/assets/` nem `public/vite.svg`.

- [ ] **Passo 2: Instalar as dependências fixas**

```bash
npm install
npm install three@0.187.0 @react-three/fiber@9.8.2 @react-three/drei@10.7.9 @react-three/rapier@2.2.0 zustand@5.1.0
npm install -D --save-exact vitest@4.1.12 @dimforge/rapier3d-compat@0.19.2 @playwright/test@1.65.0 @types/three@0.187.0
npm ls @dimforge/rapier3d-compat
```

Esperado: uma única `@dimforge/rapier3d-compat@0.19.2` (deduplicada sob `@react-three/rapier`).

- [ ] **Passo 3: Fonte local com licença**

```bash
npm install --no-save @fontsource/bricolage-grotesque@5.3.0
mkdir -p public/fonts
cp node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-400-normal.woff public/fonts/bricolage-grotesque-400.woff
cp node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff public/fonts/bricolage-grotesque-800.woff
cp node_modules/@fontsource/bricolage-grotesque/LICENSE public/fonts/OFL.txt
```

- [ ] **Passo 4: Configurar scripts, Vitest, TypeScript e Playwright**
  - `package.json` scripts: acrescente `"dev:test": "vite --mode test --host 127.0.0.1 --port 5179 --strictPort"`, `"test": "vitest run"`, `"e2e": "playwright test"`.
  - `vite.config.ts`: `/// <reference types="vitest/config" />` e `test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 10_000 }`.
  - `tsconfig.test.json`: cópia de `tsconfig.node.json` com `include: ["tests", "e2e", "playwright.config.ts"]` e `types: ["node"]`; acrescente `{ "path": "./tsconfig.test.json" }` às `references` de `tsconfig.json`. Assim o `tsc -b` cobre `src/`, `tests/` e `e2e/`.
  - `playwright.config.ts`: `testDir: 'e2e'`, `workers: 1`, `timeout: 120_000`, `expect: { timeout: 30_000 }`, `use: { baseURL: 'http://127.0.0.1:5179', channel: 'chrome', viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader'] } }`, `webServer: { command: 'npm run dev:test', url: 'http://127.0.0.1:5179', reuseExistingServer: false, timeout: 60_000 }`.
  - `.gitignore`: acrescente `test-results/`, `playwright-report/`, `screens/`.
  - `.oxlintrc.json`: `"ignorePatterns": ["references/**", "dist/**"]`.

- [ ] **Passo 5: Escrever o teste que falha** (`tests/world.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { TRAY, MAX_RADIUS, trayColliders, handPositions, clampHandX, recoveryPoint, isOutside, type Vec3 } from '../src/physics/world';

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const within = (p: Vec3, r: number) =>
  Math.abs(p[0]) <= TRAY.halfWidth - r && Math.abs(p[2]) <= TRAY.halfDepth - r && p[1] - r >= 0 && p[1] + r <= TRAY.lidY;
const apart = (ps: Vec3[]) => ps.every((a, i) => ps.slice(i + 1).every((b) => dist(a, b) >= 2 * MAX_RADIUS));

describe('world', () => {
  it('hand positions stay inside the tray projection, above the walls, without overlap', () => {
    for (let n = 1; n <= 20; n++) for (const x of [-99, 0, 99]) {
      const ps = handPositions(n, clampHandX(x, n));
      expect(ps).toHaveLength(n);
      ps.forEach((p) => { expect(within(p, MAX_RADIUS)).toBe(true); expect(p[1] - MAX_RADIUS).toBeGreaterThan(TRAY.wallHeight); });
      expect(apart(ps)).toBe(true);
    }
  });
  it('recovery points are inside and do not overlap', () => {
    for (let n = 1; n <= 20; n++) {
      const ps = Array.from({ length: n }, (_, i) => recoveryPoint(i, n));
      ps.forEach((p) => expect(within(p, MAX_RADIUS)).toBe(true));
      expect(apart(ps)).toBe(true);
    }
  });
  it('isOutside uses the collider extent, not the centre', () => {
    expect(isOutside([TRAY.halfWidth + 0.5, 1, 0], 0.7)).toBe(false);
    expect(isOutside([TRAY.halfWidth + 0.8, 1, 0], 0.7)).toBe(true);
    expect(isOutside([0, 1, -(TRAY.halfDepth + 0.8)], 0.7)).toBe(true);
    expect(isOutside([0, -0.8, 0], 0.7)).toBe(true);
    expect(isOutside([0, 0.7, 0], 0.7)).toBe(false);
  });
  it('tray colliders close the box from the floor to the lid', () => {
    const boxes = trayColliders();
    const floor = boxes.find((b) => b.kind === 'floor')!;
    expect(floor.center[1] + floor.half[1]).toBeCloseTo(0);
    const walls = boxes.filter((b) => b.kind === 'wall');
    expect(walls).toHaveLength(4);
    walls.forEach((w) => { expect(w.center[1] - w.half[1]).toBeCloseTo(0); expect(w.center[1] + w.half[1]).toBeCloseTo(TRAY.lidY); });
    const lid = boxes.find((b) => b.kind === 'lid')!;
    expect(lid.center[1] - lid.half[1]).toBeCloseTo(TRAY.lidY);
  });
});
```

Referência (`CLAUDE.md`): `references/threejs/physics_rapier_basic.html`, para corpo fixo vs. dinâmico, restituição e gravidade.

- [ ] **Passo 6: Rodar e ver falhar.** `npm test -- tests/world.test.ts`. Esperado: FAIL (módulo `../src/physics/world` inexistente).
- [ ] **Passo 7: Implementar `src/physics/world.ts`** com as interfaces acima. `clampHandX` limita `x` a `±(TRAY.halfWidth − MAX_RADIUS − (min(bodies,5) − 1)/2 × HAND.spacing)`.
- [ ] **Passo 8: Rodar.** `npm test -- tests/world.test.ts` → PASS. `npm run lint` → sem erros.
- [ ] **Passo 9: Commit**

```bash
git add -A ':!node_modules'
git commit -m "chore: scaffold Vite React TS with pinned 3D/test deps; add tray world model"
```

---

### Task 2: Poliedros, numeração e rótulos (`dice/polyhedra.ts`)

**Arquivos:**
- Criar: `src/dice/polyhedra.ts`
- Teste: `tests/polyhedra.test.ts`

**Interfaces:**
- Consome: `Vec3` de `physics/world.ts`
- Produz:
  - `type Shape = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'`, `type DieKind = Shape | 'd100'`, `type LabelSet = 'plain' | 'tens'`
  - `KINDS: DieKind[] = ['d4','d6','d8','d10','d12','d20','d100']`
  - `RADIUS: Record<Shape, number> = { d4: 0.9, d6: 0.75, d8: 0.7, d10: 0.7, d12: 0.7, d20: 0.7 }` (raio circunscrito)
  - `interface Face { normal: Vec3; center: Vec3; value: number }`: dígito 0–9 no d10, 1..n nos outros, `0` no d4 (não usado na leitura)
  - `interface Top { dir: Vec3; value: number }` (só d4: direção unitária centro → vértice)
  - `interface Label { text: string; value: number; position: Vec3; normal: Vec3; up: Vec3 }`
  - `interface Polyhedron { shape: Shape; labels: LabelSet; radius: number; points: Vec3[]; triangles: number[]; faces: Face[]; tops: Top[]; labelList: Label[] }`
  - `polyhedron(shape: Shape, labels?: LabelSet): Polyhedron` (memoizado; `labels` padrão `'plain'`)
  - `bodiesFor(kind: DieKind, count: number): { shape: Shape; labels: LabelSet }[]` (d100 → `[{d10,'tens'},{d10,'plain'}]` por dado)

**Construção (decisões que a assinatura não define):**
- d4/d6/d8/d12/d20: `TetrahedronGeometry`, `BoxGeometry`, `OctahedronGeometry`, `DodecahedronGeometry`, `IcosahedronGeometry` do three (detail 0), como em `references/threejs/webgl_geometries.html`, escaladas até o raio de `RADIUS`. `triangles` = posições não indexadas; agrupe triângulos com normal igual (produto escalar > 0,9999) em faces lógicas; `points` = vértices únicos (ε 1e-6); `center` = média dos vértices únicos da face.
- d10, trapezoedro pentagonal montado à mão (raio de anel 1, depois escala para 0,7): ápices `T = (0, h, 0)` e `B = (0, −h, 0)`, com `h = 1.1`; anel superior `Uₖ = (cos 72k°, y₁, sin 72k°)`; anel inferior `Lₖ = (cos(72k° + 36°), −y₁, sin(72k° + 36°))`; `y₁ = h·(1 − cos 36°)/(1 + cos 36°)` (é o que torna cada pipa plana). Pipas de cima `T, Uₖ, Lₖ, Uₖ₊₁` e de baixo `B, Lₖ, Uₖ₊₁, Lₖ₊₁`, cada uma em 2 triângulos com a ordem dos vértices virada para fora.
- Numeração (`d6`/`d8`/`d10`/`d12`/`d20`): ordene as faces por `(−normal.y arredondado a 1e-6, atan2(normal.z, normal.x))`. Percorra em ordem: cada face ainda livre recebe o próximo valor baixo (1, 2, … ou 0, 1, … no d10) e a face oposta (normal ≈ −normal) recebe `soma − valor`, com somas d6 7, d8 9, d10 9, d12 13, d20 21. No d6 isso dá: +Y = 1, −Y = 6, −Z = 2, +Z = 5, +X = 3, −X = 4. Esses valores são usados como literais nos testes E2E.
- d4: os 4 vértices recebem 1–4 na ordem de `points`. Cada face tem 3 rótulos em `center + 0.55·(vértice − center)` com `up` = direção normalizada centro → vértice e o valor daquele vértice.
- Rótulos das outras faces: um por face, em `center`, `normal` = normal da face, `up` = projeção de +Y no plano da face (se for degenerada, +Z projetado). Texto: o valor; `'6.'`/`'9.'` só em formas que têm as faces 6 e 9 (d10 `plain`, d12, d20). `tens`: `'00'`, `'10'`, …, `'90'` para os dígitos 0–9.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/polyhedra.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { polyhedron, bodiesFor, RADIUS, type Shape } from '../src/dice/polyhedra';
import { MAX_RADIUS } from '../src/physics/world';

const SIDES: Record<Shape, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
const SUM: Partial<Record<Shape, number>> = { d6: 7, d8: 9, d10: 9, d12: 13, d20: 21 };
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i);

describe.each(Object.keys(SIDES) as Shape[])('%s', (shape) => {
  const p = polyhedron(shape);
  it('has one face per side and each logical value once', () => {
    expect(p.faces).toHaveLength(SIDES[shape]);
    const values = (shape === 'd4' ? p.tops.map((t) => t.value) : p.faces.map((f) => f.value)).sort((a, b) => a - b);
    expect(values).toEqual(shape === 'd10' ? range(0, 10) : range(1, SIDES[shape]));
  });
  it('has unit outward normals and the configured circumradius', () => {
    p.faces.forEach((f) => { expect(Math.hypot(...f.normal)).toBeCloseTo(1, 6); expect(dot(f.normal, f.center)).toBeGreaterThan(0); });
    expect(Math.max(...p.points.map((v) => Math.hypot(...v)))).toBeCloseTo(RADIUS[shape], 6);
  });
  it('places every label on the face whose number it shows', () => {
    p.labelList.forEach((l) => {
      const f = p.faces.find((g) => dot(g.normal, l.normal) > 0.9999)!;
      expect(Math.abs(dot([l.position[0] - f.center[0], l.position[1] - f.center[1], l.position[2] - f.center[2]], f.normal))).toBeLessThan(1e-6);
      if (shape !== 'd4') expect(l.value).toBe(f.value);
    });
  });
  if (SUM[shape]) it('opposite faces sum like a real die', () => {
    p.faces.forEach((f) => {
      const o = p.faces.find((g) => dot(g.normal, f.normal) < -0.9999)!;
      expect(f.value + o.value).toBe(SUM[shape]);
    });
  });
});

describe('labels', () => {
  it('d4 draws each number on three faces', () => {
    const count = (v: number) => polyhedron('d4').labelList.filter((l) => l.value === v).length;
    expect([1, 2, 3, 4].map(count)).toEqual([3, 3, 3, 3]);
  });
  it('marks 6 and 9 only where both exist', () => {
    const texts = (s: Shape) => polyhedron(s).labelList.map((l) => l.text);
    for (const s of ['d10', 'd12', 'd20'] as Shape[]) expect(texts(s)).toEqual(expect.arrayContaining(['6.', '9.']));
    expect(texts('d6')).toContain('6');
    expect(texts('d8')).toContain('6');
  });
  it('tens d10 shows 00–90 over digits 0–9', () => {
    const t = polyhedron('d10', 'tens');
    expect(t.labelList.map((l) => l.text).sort()).toEqual(['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']);
    expect(t.faces.map((f) => f.value).sort((a, b) => a - b)).toEqual(range(0, 10));
  });
  it('d6 numbering is the documented one', () => {
    const at = (n: number[]) => polyhedron('d6').faces.find((f) => dot(f.normal, n) > 0.9999)!.value;
    expect([at([0, 1, 0]), at([0, -1, 0]), at([0, 0, -1]), at([0, 0, 1]), at([1, 0, 0]), at([-1, 0, 0])]).toEqual([1, 6, 2, 5, 3, 4]);
  });
  it('RADIUS and MAX_RADIUS agree', () => expect(Math.max(...Object.values(RADIUS))).toBe(MAX_RADIUS));
  it('bodiesFor expands d100 into tens and units pairs', () => {
    expect(bodiesFor('d100', 3)).toEqual(Array(3).fill(null).flatMap(() => [{ shape: 'd10', labels: 'tens' }, { shape: 'd10', labels: 'plain' }]));
    expect(bodiesFor('d20', 4)).toHaveLength(4);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test -- tests/polyhedra.test.ts` → FAIL (módulo inexistente).
- [ ] **Passo 3: Implementar `src/dice/polyhedra.ts`** conforme a construção acima.
- [ ] **Passo 4: Rodar.** → PASS.
- [ ] **Passo 5: Commit.** `git add src/dice/polyhedra.ts tests/polyhedra.test.ts && git commit -m "feat: dice polyhedra with real-die numbering and surface labels"`

---

### Task 3: Leitura do resultado (`dice/read.ts`)

**Arquivos:**
- Criar: `src/dice/read.ts`
- Teste: `tests/read.test.ts`

**Interfaces:**
- Consome: `Polyhedron`, `DieKind` (Tarefa 2); `Quat` (Tarefa 1)
- Produz:
  - `readUp(poly: Polyhedron, q: Quat): { value: number; tilt: number }`: `tilt` em graus. Faces: maior `dot(rotate(normal, q), +Y)`. d4: vértice com maior Y girado; a inclinação é o ângulo de `rotate(top.dir, q)` com +Y (spec 4.4).
  - `combineD100(tens: number, units: number): number`: dígitos brutos; `(0, 0) → 100`, senão `tens × 10 + units`.
  - `toResults(kind: DieKind, raw: number[]): number[]`: d10 `0 → 10`; d100 combina os pares `(raw[2i], raw[2i+1])`; os outros, identidade.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/read.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { polyhedron, type Shape } from '../src/dice/polyhedra';
import { readUp, combineD100, toResults } from '../src/dice/read';
import type { Quat, Vec3 } from '../src/physics/world';

const toUp = (n: Vec3): Quat => new Quaternion().setFromUnitVectors(new Vector3(...n), new Vector3(0, 1, 0)).toArray() as Quat;
const tiltBy = (q: Quat, deg: number): Quat =>
  new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (deg * Math.PI) / 180).multiply(new Quaternion(...q)).toArray() as Quat;

describe('readUp', () => {
  it.each(['d6', 'd8', 'd10', 'd12', 'd20'] as Shape[])('%s reads every face turned up', (shape) => {
    const p = polyhedron(shape);
    p.faces.forEach((f) => { const r = readUp(p, toUp(f.normal)); expect(r.value).toBe(f.value); expect(r.tilt).toBeLessThan(1e-4); });
  });
  it('d4 reads the top vertex with zero tilt when resting on a face (not 70.53°)', () => {
    const p = polyhedron('d4');
    p.tops.forEach((t) => { const r = readUp(p, toUp(t.dir)); expect(r.value).toBe(t.value); expect(r.tilt).toBeLessThan(1e-4); });
  });
  it('reports the tilt of a cocked die', () => {
    const p = polyhedron('d20');
    expect(readUp(p, tiltBy(toUp(p.faces[0].normal), 20)).tilt).toBeCloseTo(20, 3);
    const d4 = polyhedron('d4');
    expect(readUp(d4, tiltBy(toUp(d4.tops[0].dir), 20)).tilt).toBeCloseTo(20, 3);
  });
});

describe('results', () => {
  it('combineD100 keeps raw digits', () => {
    expect([combineD100(0, 0), combineD100(9, 9), combineD100(0, 1), combineD100(5, 0)]).toEqual([100, 99, 1, 50]);
  });
  it('toResults maps per kind', () => {
    expect(toResults('d10', [0, 7])).toEqual([10, 7]);
    expect(toResults('d100', [0, 0, 9, 9])).toEqual([100, 99]);
    expect(toResults('d6', [3])).toEqual([3]);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test -- tests/read.test.ts` → FAIL.
- [ ] **Passo 3: Implementar `src/dice/read.ts`** usando `Quaternion`/`Vector3` do three.
- [ ] **Passo 4: Rodar.** → PASS.
- [ ] **Passo 5: Commit.** `git commit -m "feat: read the up face, d4 by vertex, d100 from raw digits"` (com os 2 arquivos)

---

### Task 4: Mira, carga e lançamento (`throw/aim.ts`)

**Arquivos:**
- Criar: `src/throw/aim.ts`
- Teste: `tests/aim.test.ts`

**Interfaces:**
- Consome: `TRAY`, `MAX_RADIUS`, `LAUNCH`, `SPIN`, `Vec3` (Tarefa 1)
- Produz:
  - `clampTarget(p: Vec3): Vec3`: y = 0; `|x| ≤ 7 − 0.9`, `|z| ≤ 4.5 − 0.9`
  - `charge(ms: number): number = 1 − |((ms / 700) mod 2) − 1|`
  - `launchVelocity(from: Vec3, target: Vec3, force: number): Vec3`: `s = 6 + force × (22 − 6)`; horizontal = direção unitária xz de `from` para `target` × s (se a distância for 0, a direção é −z); `vy = 0.35 × s`
  - `rng(seed: number): () => number` (mulberry32, valores em [0, 1))
  - Referência (`CLAUDE.md`): `initInput()` de `references/threejs/physics_ammo_break.html`, onde `setLinearVelocity(direção × 24)` vira direção mão → alvo × velocidade dependente da força.
  - `spin(seed: number, index: number): Vec3`: eixo aleatório × módulo em [10, 25] rad/s, usando `rng(seed ^ Math.imul(index + 1, 0x9e3779b1))`

- [ ] **Passo 1: Escrever o teste que falha** (`tests/aim.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { clampTarget, charge, launchVelocity, spin, rng } from '../src/throw/aim';

const len = (v: number[]) => Math.hypot(...v);

describe('aim', () => {
  it('charge is a 0→1→0 triangle wave with a 1400 ms cycle', () => {
    expect([0, 350, 700, 1050, 1400, 2100].map(charge)).toEqual([0, 0.5, 1, 0.5, 0, 1]);
    for (let t = 0; t < 5000; t += 37) { expect(charge(t)).toBeGreaterThanOrEqual(0); expect(charge(t)).toBeLessThanOrEqual(1); }
  });
  it('clampTarget keeps the target inside the tray at floor level', () => {
    expect(clampTarget([100, 5, -100]).map((v) => +v.toFixed(6))).toEqual([6.1, 0, -3.6]);
    expect(clampTarget([1, 2, 3])).toEqual([1, 0, 3]);
  });
  it('launchVelocity aims at the target, rises and grows with force', () => {
    const from: [number, number, number] = [0, 3, 3], to: [number, number, number] = [2, 0, -2];
    const v0 = launchVelocity(from, to, 0), v1 = launchVelocity(from, to, 1), vh = launchVelocity(from, to, 0.5);
    expect(len([v0[0], v0[2]])).toBeCloseTo(6); expect(len([v1[0], v1[2]])).toBeCloseTo(22);
    expect(len(v1)).toBeGreaterThan(len(vh)); expect(len(vh)).toBeGreaterThan(len(v0));
    expect(v1[0] / v1[2]).toBeCloseTo(2 / -5); expect(v1[2]).toBeLessThan(0);
    expect(v1[1]).toBeCloseTo(0.35 * 22);
    expect(launchVelocity([0, 3, 0], [0, 0, 0], 0)).toEqual([0, 0.35 * 6, -6]);
  });
  it('spin is deterministic per seed and index, distinct across indices, bounded', () => {
    expect(spin(42, 0)).toEqual(spin(42, 0));
    expect(spin(42, 0)).not.toEqual(spin(42, 1));
    for (let s = 0; s < 50; s++) for (let i = 0; i < 20; i++) { const m = len(spin(s, i)); expect(m).toBeGreaterThanOrEqual(10); expect(m).toBeLessThanOrEqual(25); }
  });
  it('rng is deterministic', () => expect(rng(1)()).toBe(rng(1)()));
});
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test -- tests/aim.test.ts` → FAIL.
- [ ] **Passo 3: Implementar `src/throw/aim.ts`.**
- [ ] **Passo 4: Rodar.** → PASS.
- [ ] **Passo 5: Commit.** `git commit -m "feat: aim clamp, charge wave, launch velocity and seeded spin"`

---

### Task 5: Máquina de fases da entrada (`throw/gesture.ts`)

**Arquivos:**
- Criar: `src/throw/gesture.ts`
- Teste: `tests/gesture.test.ts`

**Interfaces:**
- Consome: `charge` (Tarefa 4)
- Produz:
  - `type Phase = 'hand' | 'charging' | 'rolling' | 'settled' | 'returning'`
  - `type Source = { kind: 'pointer'; id: number } | { kind: 'key' }`
  - `type GestureEvent = { type: 'press'; source: Source; at: number; repeat: boolean } | { type: 'release'; source: Source; at: number } | { type: 'cancel' } | { type: 'published' } | { type: 'returned' } | { type: 'selection' }`
  - `interface GestureState { phase: Phase; source: Source | null; chargeStart: number }`, `initialGesture: GestureState = { phase: 'hand', source: null, chargeStart: 0 }`
  - `type Effect = { type: 'none' } | { type: 'throw'; force: number } | { type: 'return' }`
  - `reduce(s: GestureState, e: GestureEvent): { state: GestureState; effect: Effect }`
- Transições (todo o resto: estado igual, `none`): `hand + press(!repeat) → charging`; `charging + release(mesma origem) → rolling, throw(charge(at − chargeStart))`; `charging + cancel → hand`; `rolling + published → settled`; `settled + press(!repeat) → returning, return`; `returning + returned → hand`; `selection → initialGesture` em qualquer fase. A mesma origem quer dizer mesmo `kind` e, para ponteiro, mesmo `id`.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/gesture.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { reduce, initialGesture, type GestureState, type Phase } from '../src/throw/gesture';

const P1 = { kind: 'pointer', id: 1 } as const, P2 = { kind: 'pointer', id: 2 } as const, KEY = { kind: 'key' } as const;
const at = (phase: Phase): GestureState => ({ ...initialGesture, phase });
const press = (source = P1, t = 0, repeat = false) => ({ type: 'press', source, at: t, repeat }) as const;
const release = (source = P1, t = 700) => ({ type: 'release', source, at: t }) as const;

describe('gesture', () => {
  it('press in hand starts charging and remembers the source', () => {
    const r = reduce(initialGesture, press(P1, 100));
    expect(r.state).toEqual({ phase: 'charging', source: P1, chargeStart: 100 });
  });
  it('only the same source releases, throwing with the charge at that time', () => {
    const charging = reduce(initialGesture, press(P1, 0)).state;
    expect(reduce(charging, release(P2, 700))).toEqual({ state: charging, effect: { type: 'none' } });
    expect(reduce(charging, release(KEY, 700)).state.phase).toBe('charging');
    expect(reduce(charging, release(P1, 700))).toEqual({ state: { ...charging, phase: 'rolling' }, effect: { type: 'throw', force: 1 } });
  });
  it('ignores key repeat', () => expect(reduce(initialGesture, press(KEY, 0, true)).state.phase).toBe('hand'));
  it('cancel during charging returns to hand without throwing', () => {
    const charging = reduce(initialGesture, press(KEY, 0)).state;
    expect(reduce(charging, { type: 'cancel' })).toEqual({ state: initialGesture, effect: { type: 'none' } });
  });
  it('cancel after an accepted release does not undo the throw', () => {
    expect(reduce(at('rolling'), { type: 'cancel' }).state.phase).toBe('rolling');
  });
  it('press only starts a charge from hand; returning ignores gestures', () => {
    for (const ph of ['rolling', 'returning'] as Phase[]) expect(reduce(at(ph), press()).state.phase).toBe(ph);
  });
  it('published → settled; press in settled → returning with a return effect; returned → hand', () => {
    expect(reduce(at('rolling'), { type: 'published' }).state.phase).toBe('settled');
    expect(reduce(at('hand'), { type: 'published' }).state.phase).toBe('hand');
    expect(reduce(at('settled'), press())).toEqual({ state: { ...at('settled'), phase: 'returning' }, effect: { type: 'return' } });
    expect(reduce(at('returning'), { type: 'returned' }).state.phase).toBe('hand');
  });
  it('selection resets every phase to hand', () => {
    for (const ph of ['hand', 'charging', 'rolling', 'settled', 'returning'] as Phase[])
      expect(reduce(at(ph), { type: 'selection' }).state).toEqual(initialGesture);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test -- tests/gesture.test.ts` → FAIL.
- [ ] **Passo 3: Implementar `src/throw/gesture.ts`** com as transições acima.
- [ ] **Passo 4: Rodar.** → PASS.
- [ ] **Passo 5: Commit.** `git commit -m "feat: input phase machine with source-scoped release and cancel"`

---

### Task 6: Protocolo de conclusão (`throw/settle.ts`)

**Arquivos:**
- Criar: `src/throw/settle.ts`
- Teste: `tests/settle.test.ts`

**Interfaces:**
- Consome: `readUp` (Tarefa 3), `Phase` (Tarefa 5), `SETTLE`, `isOutside`, `recoveryPoint` (Tarefa 1), `Polyhedron` (Tarefa 2)
- Produz:
  - `interface BodyState { asleep: boolean; p: Vec3; q: Quat }`
  - `interface SettleState { throwId: number; expected: number; steps: number; attempts: number[]; done: boolean }`
  - `type SettleAction = { type: 'wait' } | { type: 'recover'; moves: { index: number; p: Vec3 }[] } | { type: 'nudge'; indices: number[] } | { type: 'publish'; raw: number[]; poses: { p: Vec3; q: Quat }[]; timedOut: boolean }`
  - `initSettle(throwId: number, expected: number): SettleState`
  - `stepSettle(s: SettleState, input: { throwId: number; phase: Phase; polys: Polyhedron[]; bodies: BodyState[] }): { state: SettleState; action: SettleAction }`
- Regras, nesta prioridade (spec 4.5):
  1. `throwId` diferente, fase diferente de `rolling` ou `done` → `wait`, estado inalterado.
  2. Senão `steps + 1`. Lista com tamanho diferente de `expected` → `wait`.
  3. `steps === 480` → `publish` com `timedOut: true`; um corpo de fora vai para `recoveryPoint(i, expected)` mantendo seu `q`; `raw` lido dessas poses; `done = true`.
  4. Algum `isOutside(p, poly.radius)` → `recover` desses índices para `recoveryPoint`; `attempts[i] + 1`.
  5. Algum acordado → `wait`.
  6. Todos dormindo: leia todos; os com `tilt > 15` e `attempts < 3` → `nudge` (`attempts + 1`).
  7. Senão `publish` com `timedOut: false`, `poses` atuais, `done = true`.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/settle.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { polyhedron } from '../src/dice/polyhedra';
import { initSettle, stepSettle, type BodyState } from '../src/throw/settle';
import { recoveryPoint, type Quat, type Vec3 } from '../src/physics/world';

const d6 = polyhedron('d6');
const flat = (v: number): Quat => {
  const f = d6.faces.find((x) => x.value === v)!;
  return new Quaternion().setFromUnitVectors(new Vector3(...f.normal), new Vector3(0, 1, 0)).toArray() as Quat;
};
const cocked = (v: number): Quat => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.44).multiply(new Quaternion(...flat(v))).toArray() as Quat;
const body = (asleep: boolean, v = 1, p: Vec3 = [0, 0.5, 0], q = flat(v)): BodyState => ({ asleep, p, q });
const step = (s: ReturnType<typeof initSettle>, bodies: BodyState[], over: object = {}) =>
  stepSettle(s, { throwId: 1, phase: 'rolling', polys: bodies.map(() => d6), bodies, ...over });

describe('settle', () => {
  it('A sleeps → A wakes → B sleeps does not publish', () => {
    let s = initSettle(1, 2);
    for (const bs of [[body(true), body(false)], [body(false), body(false)], [body(false), body(true)]]) {
      const r = step(s, bs); expect(r.action.type).toBe('wait'); s = r.state;
    }
  });
  it('publishes all values together once, when everyone is asleep now', () => {
    const r = step(initSettle(1, 2), [body(true, 3), body(true, 5)]);
    expect(r.action).toMatchObject({ type: 'publish', raw: [3, 5], timedOut: false });
    expect(step(r.state, [body(true, 3), body(true, 5)]).action.type).toBe('wait');
  });
  it('an empty or incomplete list never publishes', () => {
    expect(step(initSettle(1, 2), []).action.type).toBe('wait');
    expect(step(initSettle(1, 2), [body(true)]).action.type).toBe('wait');
  });
  it('ignores another throwId or a phase other than rolling', () => {
    expect(step(initSettle(1, 1), [body(true)], { throwId: 2 }).action.type).toBe('wait');
    expect(step(initSettle(1, 1), [body(true)], { phase: 'settled' }).state.steps).toBe(0);
  });
  it('nudges a cocked die up to three times, then accepts the closest face', () => {
    let s = initSettle(1, 1);
    for (let n = 1; n <= 3; n++) { const r = step(s, [body(true, 2, [0, 0.5, 0], cocked(2))]); expect(r.action).toEqual({ type: 'nudge', indices: [0] }); s = r.state; expect(s.attempts[0]).toBe(n); }
    expect(step(s, [body(true, 2, [0, 0.5, 0], cocked(2))]).action).toMatchObject({ type: 'publish', raw: [2] });
  });
  it('recovers a body that left the tray before waiting on others', () => {
    const r = step(initSettle(1, 2), [body(false, 1, [20, 1, 0]), body(false)]);
    expect(r.action).toEqual({ type: 'recover', moves: [{ index: 0, p: recoveryPoint(0, 2) }] });
    expect(r.state.attempts[0]).toBe(1);
  });
  it('times out at step 480 even with awake bodies, keeping orientation', () => {
    let s = initSettle(1, 2);
    for (let i = 1; i < 480; i++) s = step(s, [body(false, 4), body(false, 2)]).state;
    const r = step(s, [body(false, 4, [20, 1, 0]), body(false, 2)]);
    expect(r.action).toMatchObject({ type: 'publish', raw: [4, 2], timedOut: true });
    if (r.action.type === 'publish') { expect(r.action.poses[0].p).toEqual(recoveryPoint(0, 2)); expect(r.action.poses[0].q).toEqual(flat(4)); }
  });
  it('recovery does not reset the deadline', () => {
    let s = step(initSettle(1, 1), [body(false, 1, [20, 1, 0])]).state;
    for (let i = 2; i < 480; i++) s = step(s, [body(false)]).state;
    expect(step(s, [body(false)]).action.type).toBe('publish');
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test -- tests/settle.test.ts` → FAIL.
- [ ] **Passo 3: Implementar `src/throw/settle.ts`** com as regras acima.
- [ ] **Passo 4: Rodar.** → PASS.
- [ ] **Passo 5: Commit.** `git commit -m "feat: state-based settle protocol with recovery, nudge and sim-time timeout"`

---

### Task 7: Aplicação aos corpos + física em Node (`physics/apply.ts`)

**Arquivos:**
- Criar: `src/physics/apply.ts`, `tests/helpers/sim.ts`
- Teste: `tests/physics.test.ts`

**Interfaces:**
- Consome: `launchVelocity`, `spin` (T4); `SettleAction`, `BodyState` (T6); `NUDGE` (T1)
- Produz (`src/physics/apply.ts`, sem depender de React; tipos de `@dimforge/rapier3d-compat`, enum `RigidBodyType` em tempo de execução):
  - `interface Launch { throwId: number; seed: number; target: Vec3; force: number; handCenter: Vec3; handOmega: Vec3 }`
  - `bodyStates(bodies: RigidBody[]): BodyState[]`
  - `applyLaunch(bodies: RigidBody[], launch: Launch): void`: para cada `i`, `setBodyType(Dynamic, true)` mantendo a pose; `setLinvel(launchVelocity(handCenter, target, force))`; `setAngvel(handOmega + spin(seed, i))`
  - `applyPoses(bodies: RigidBody[], poses: { p: Vec3; q: Quat }[]): void`: dinâmico, pose, velocidades zeradas, `wakeUp()` (usado pela fixture)
  - `toKinematic(bodies: RigidBody[]): void`: velocidades zeradas, tipo `KinematicPositionBased`
  - `applySettle(bodies: RigidBody[], action: SettleAction): void`:
    - `recover`: pose `p`, velocidades zeradas, `wakeUp()`
    - `nudge`: `applyImpulse({0, NUDGE.up × massa, 0})` + `applyTorqueImpulse({NUDGE.torque × massa, 0, NUDGE.torque × massa})`, acordando o corpo
    - `publish`: em cada corpo, zera as velocidades, aplica `poses[i]` e depois `setBodyType(Fixed)`
- Produz (`tests/helpers/sim.ts`):
  - `simulate(o: { kind: DieKind; count: number; force: number; target: Vec3; seed: number; perturb?: (step: number, bodies: RigidBody[]) => void }): Promise<{ results: number[]; steps: number; escaped: boolean; recovered: boolean; bodies: number; final: Vec3[]; fixed: boolean }>`
  - Monta um `World` com `GRAVITY` e `timestep = STEP`; um corpo fixo com os cuboides de `trayColliders()` (material `velvet` no chão, `wall` em paredes e tampa); um corpo cinemático por `bodiesFor(kind, count)` em `handPositions(n, 0)` com `ColliderDesc.convexHull(points)`, `MATERIAL.die` e CCD; `applyLaunch` com `handCenter` = média das posições da mão e `handOmega = [0, 0, 0]`. Depois, em laço: `world.step()` → `perturb` → `stepSettle` → `applySettle`, até `publish` (com limite de segurança de 600 passos). `escaped` = algum `isOutside` em algum passo; `recovered` = houve ação `recover`.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/physics.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { RigidBodyType } from '@dimforge/rapier3d-compat';
import { KINDS, type DieKind } from '../src/dice/polyhedra';
import { clampTarget, rng } from '../src/throw/aim';
import { isOutside, MAX_RADIUS } from '../src/physics/world';
import { simulate } from './helpers/sim';

const MAX: Record<DieKind, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100 };
const T = { timeout: 180_000 };

describe.each(KINDS)('%s × 10', (kind) => {
  it.each([0, 1])('force %s: no escape, publishes by step 480, all inside', async (force) => {
    const r = await simulate({ kind, count: 10, force, target: [0, 0, -1], seed: 7 });
    expect(r.escaped).toBe(false); expect(r.recovered).toBe(false);
    expect(r.steps).toBeLessThanOrEqual(480);
    expect(r.bodies).toBe(kind === 'd100' ? 20 : 10);
    expect(r.results).toHaveLength(10);
    r.results.forEach((v) => { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(MAX[kind]); });
    r.final.forEach((p) => expect(isOutside(p, MAX_RADIUS)).toBe(false));
  }, T);
});

describe('edges', () => {
  it('corner throw at max force stays inside', async () => {
    const r = await simulate({ kind: 'd20', count: 10, force: 1, target: clampTarget([99, 0, -99]), seed: 3 });
    expect(r.escaped).toBe(false); expect(r.recovered).toBe(false);
  }, T);
  it('a forced escape is recovered and still publishes inside', async () => {
    const r = await simulate({ kind: 'd6', count: 2, force: 0.5, target: [0, 0, 0], seed: 1,
      perturb: (s, b) => { if (s === 30) b[0].setTranslation({ x: 20, y: 1, z: 0 }, true); } });
    expect(r.recovered).toBe(true); expect(r.results).toHaveLength(2);
    r.final.forEach((p) => expect(isOutside(p, MAX_RADIUS)).toBe(false));
  }, T);
  it('a body kept awake times out at step 480 and is frozen', async () => {
    const r = await simulate({ kind: 'd6', count: 2, force: 0.5, target: [0, 0, 0], seed: 1,
      perturb: (_s, b) => b[0].applyImpulse({ x: 0, y: 0.5, z: 0 }, true) });
    expect(r.steps).toBe(480); expect(r.fixed).toBe(true); expect(r.results).toHaveLength(2);
  }, T);
});

describe('distribution diagnostic (seeded, repeatable)', () => {
  const chi2 = async (kind: DieKind, sides: number, n: number) => {
    const counts = new Array(sides).fill(0);
    for (let seed = 1; seed <= n; seed++) {
      const r = rng(seed);
      const res = await simulate({ kind, count: 1, force: r(), target: clampTarget([(r() * 2 - 1) * 7, 0, (r() * 2 - 1) * 4.5]), seed });
      counts[res.results[0] - 1]++;
    }
    const e = n / sides;
    return counts.reduce((acc, c) => acc + (c - e) ** 2 / e, 0);
  };
  it('d6 over 600 throws: χ² < 20.515 (df 5, p 0.001)', async () => expect(await chi2('d6', 6, 600)).toBeLessThan(20.515), { timeout: 600_000 });
  it('d20 over 1000 throws: χ² < 43.820 (df 19, p 0.001)', async () => expect(await chi2('d20', 20, 1000)).toBeLessThan(43.82), { timeout: 600_000 });
});
```

Para `r.fixed`, use em `sim.ts` o resultado de `bodies.every((b) => b.bodyType() === RigidBodyType.Fixed)` depois do `publish`.

- [ ] **Passo 2: Rodar e ver falhar.** `npm test -- tests/physics.test.ts` → FAIL (módulos inexistentes).
- [ ] **Passo 3: Implementar `src/physics/apply.ts` e `tests/helpers/sim.ts`** (`await RAPIER.init()` uma vez por processo).
- [ ] **Passo 4: Rodar.** → PASS. Se o diagnóstico de distribuição falhar, ajuste só `SPIN` e `MATERIAL.die.friction` em `world.ts`, nunca o teste, e rode de novo a suíte inteira (`npm test`).
- [ ] **Passo 5: Commit.** `git commit -m "feat: apply launch and settle actions to Rapier bodies; Node physics suite"`

---

### Task 8: Estado (`store.ts`)

**Arquivos:**
- Criar: `src/store.ts`
- Teste: `tests/store.test.ts`

**Interfaces:**
- Consome: `reduce`, `initialGesture`, `GestureEvent`, `Phase` (T5); `Launch` (T7); `DieKind` (T2)
- Produz: `useDice` (zustand v5 `create`), com o estado:
  - `kind: DieKind` (padrão `'d20'`), `count: number` (padrão 1), `gesture: GestureState`, `throwId: number` (padrão 0)
  - `aim: Vec3` (padrão `[0, 0, -1]`), `force: number`, `launch: Launch | null`, `fixture: { p: Vec3; q: Quat }[] | null`, `results: number[] | null`
  - `error: 'graphics' | 'physics' | null`, `ready: boolean`, `reducedMotion: boolean`
- Ações:
  - `setKind(k)`, `setCount(n)` (limitado a 1–10): fazem `selection`, `throwId + 1`, `launch = fixture = results = null`, `force = 0`
  - `setAim(p)`, `setForce(f)`, `setReady()`, `setError(e)`, `setReducedMotion(b)`
  - `input(e: GestureEvent, hand?: { center: Vec3; omega: Vec3 }): Effect`: aplica `reduce`. No efeito `throw`: `throwId + 1`, `seed = crypto.getRandomValues(new Uint32Array(1))[0]`, `launch = { throwId, seed, target: aim, force, handCenter, handOmega }`, `results = null`. No efeito `return`: `results` se mantém. Devolve o efeito.
  - `publish(throwId, results)`: aceita só se `throwId` for o atual e a fase for `rolling`; faz `input({ type: 'published' })`.
  - `startFixture(poses)` (só para o gancho de teste): `throwId + 1`, fase `rolling`, `fixture = poses`, `launch = null`, `results = null`.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/store.test.ts`)

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDice } from '../src/store';

const s = () => useDice.getState();
const P = { kind: 'pointer', id: 1 } as const;
beforeEach(() => useDice.setState(useDice.getInitialState(), true));

describe('store', () => {
  it('a selection change resets phase, results and launch and bumps throwId', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().setKind('d6');
    expect(s().gesture.phase).toBe('hand'); expect(s().throwId).toBe(1);
    expect(s().launch).toBeNull(); expect(s().results).toBeNull();
  });
  it('setCount clamps to 1..10', () => { s().setCount(0); expect(s().count).toBe(1); s().setCount(42); expect(s().count).toBe(10); });
  it('a release throws with one snapshot of seed, target, force and hand motion', () => {
    s().setAim([2, 0, -2]);
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    const eff = s().input({ type: 'release', source: P, at: 700 }, { center: [0, 3, 3], omega: [1, 0, 0] });
    expect(eff).toEqual({ type: 'throw', force: 1 });
    expect(s().launch).toMatchObject({ throwId: 1, target: [2, 0, -2], force: 1, handCenter: [0, 3, 3], handOmega: [1, 0, 0] });
    expect(typeof s().launch!.seed).toBe('number'); expect(s().gesture.phase).toBe('rolling');
  });
  it('publish only lands for the current throw while rolling', () => {
    s().input({ type: 'press', source: P, at: 0, repeat: false });
    s().input({ type: 'release', source: P, at: 700 }, { center: [0, 3, 3], omega: [0, 0, 0] });
    s().publish(0, [5]); expect(s().results).toBeNull();
    s().publish(1, [5]); expect(s().results).toEqual([5]); expect(s().gesture.phase).toBe('settled');
    s().publish(1, [6]); expect(s().results).toEqual([5]);
  });
  it('startFixture enters rolling with a fresh throwId', () => {
    s().startFixture([{ p: [0, 1, 0], q: [0, 0, 0, 1] }]);
    expect(s().gesture.phase).toBe('rolling'); expect(s().throwId).toBe(1); expect(s().launch).toBeNull();
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test -- tests/store.test.ts` → FAIL.
- [ ] **Passo 3: Implementar `src/store.ts`.**
- [ ] **Passo 4: Rodar.** `npm test` → todas as suítes passam.
- [ ] **Passo 5: Commit.** `git commit -m "feat: zustand store wiring phases, throw snapshot and guarded publish"`

---

### Task 9: Cena com um dado validado (gema + números)

**Arquivos:**
- Criar: `src/App.tsx`, `src/index.css`, `src/scene/Stage.tsx`, `src/scene/Tray.tsx`, `src/scene/Die.tsx`, `src/testHook.ts`, `e2e/global.d.ts`
- Modificar: `index.html` (título "Rolador de dados", `lang="pt-BR"`), `src/main.tsx`
- Teste: `e2e/smoke.spec.ts`

**Interfaces:**
- Consome: `polyhedron`, `bodiesFor` (T2); `trayColliders`, `handPositions`, `MATERIAL`, `GRAVITY`, `STEP` (T1); `useDice` (T8)
- Produz:
  - `Stage({ gameArea }: { gameArea: RefObject<HTMLDivElement | null> })`:
    - câmera de perspectiva fixa em `[0, 14, 10]` olhando para `[0, 0, 0]`, `fov 40`;
    - `<Environment resolution={256}>` com 3 `Lightformer` (sem `preset`) e uma `directionalLight castShadow`;
    - `<Physics gravity={GRAVITY} timeStep={STEP} interpolate={false}>`;
    - um `useFBO` compartilhado: a cada quadro (`useFrame` com prioridade padrão), esconde o grupo dos dados, renderiza a cena no FBO e volta a mostrar;
    - `PerformanceMonitor`: `onDecline` divide a resolução do FBO por 2 (mínimo 256) e as `samples` por 2 (mínimo 2); `onIncline` volta até 1024 e 6;
    - mantém `bodies: RefObject<(RapierRigidBody | null)[]>` e chama `setReady()` ao montar.
  - `Tray()`: madeira `#3B2416`, veludo `#3A0F1A`; colisores de `trayColliders()`, só as partes visíveis com malha.
  - `Die({ index, shape, labels, color, buffer, register }: { index: number; shape: Shape; labels: LabelSet; color: string; buffer: Texture; register: (i: number, b: RapierRigidBody | null) => void })`:
    - `<RigidBody type="kinematicPosition" colliders={false} ccd position={handPositions(n, 0)[index]}>` + `<ConvexHullCollider args={[points.flat()]} {...MATERIAL.die} />`;
    - malha de `triangles` (normais planas) com `MeshTransmissionMaterial buffer={buffer} color thickness={0.6} ior={1.6} chromaticAberration={0.06} roughness={0.05} transparent`;
    - um `Text` do drei por `Label`: `font="/fonts/bricolage-grotesque-800.woff"`, cor `#D4A93F`, em `position + normal × 0.002`, orientado com +Z = `normal` e +Y = `up`, `depthOffset={-1}`, tamanho `FONT = { d4: 0.2, d6: 0.42, d8: 0.32, d10: 0.28, d12: 0.3, d20: 0.24 }` (no `tens`, 0.22).
  - `GEM: Record<DieKind, string> = { d4: '#1F9D63', d6: '#C0182E', d8: '#1F4FB8', d10: '#E0A21B', d12: '#8B4FC9', d20: '#E8F1F8', d100: '#E7B416' }` em `Die.tsx`.
  - Cada `Die` usa `key={`${kind}-${count}-${i}`}`: só a mudança de seleção remonta os corpos; um novo arremesso com a mesma seleção reaproveita os mesmos corpos (spec 4.3, passo 1).
  - `src/testHook.ts`: `installTestHook(api: DiceHook): void`, que só faz algo em `MODE === 'test'`. `DiceHook` nesta tarefa: `state(): { kind: DieKind; count: number; phase: Phase; throwId: number; results: number[] | null; ready: boolean; error: 'graphics' | 'physics' | null; aim: Vec3 }`, `select(kind, count)`, `bodies(): { handle: number; p: Vec3; q: Quat; type: number }[]`, `meshes(): { q: Quat }[]` (quaternion mundial), `labels(i): { text: string; position: Vec3; normal: Vec3 }[]` (espaço mundial), `pose(i, p, q)` (pose cinemática direta; será substituída na Tarefa 10).
  - `App`: `<div ref={gameArea} className="game-area" tabIndex={0} aria-label="Área de arremesso">` com o `<Canvas shadows gl={{ preserveDrawingBuffer: import.meta.env.MODE === 'test' }}>` e `<Suspense>` em volta do `Stage`.
  - `index.css`: `@font-face` Bricolage 400/800 de `/fonts/`; tokens `--chalk #E9E6DE`, `--ink #1B1A16`, `--brass #D4A93F`, `--wine #3A0F1A`, `--panel #140E10`; a `.game-area` ocupa a viewport inteira, com `touch-action: none` e foco visível (`outline: 3px solid var(--brass)` em `:focus-visible`).

- [ ] **Passo 1: Escrever o teste que falha** (`e2e/smoke.spec.ts`)

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__dice?.state().ready === true);
});

test('WebGL context exists and the renderer is reported', async ({ page }, info) => {
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : null;
  });
  expect(renderer).toBeTruthy();
  info.annotations.push({ type: 'renderer', description: renderer! });
});

test('canvas paints a non-uniform image without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.reload(); await page.waitForFunction(() => window.__dice?.state().ready === true);
  const colours = await page.evaluate(() => {
    const src = document.querySelector('canvas')!, c = document.createElement('canvas');
    c.width = 64; c.height = 64; const g = c.getContext('2d')!; g.drawImage(src, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data, set = new Set<number>();
    for (let i = 0; i < d.length; i += 4) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return set.size;
  });
  expect(colours).toBeGreaterThan(50);
  expect(errors).toEqual([]);
});

test('a d6 at identity shows 1 on top and 6 below; mesh and body agree', async ({ page }) => {
  await page.evaluate(() => { window.__dice.select('d6', 1); });
  await page.evaluate(() => window.__dice.pose(0, [0, 2, 0], [0, 0, 0, 1]));
  await page.waitForTimeout(300);
  const labels = await page.evaluate(() => window.__dice.labels(0));
  const byText = (t: string) => labels.find((l) => l.text === t)!.normal;
  expect(byText('1')[1]).toBeGreaterThan(0.999);
  expect(byText('6')[1]).toBeLessThan(-0.999);
  const [body] = await page.evaluate(() => window.__dice.bodies());
  const [mesh] = await page.evaluate(() => window.__dice.meshes());
  body.q.forEach((v, i) => expect(Math.abs(Math.abs(v) - Math.abs(mesh.q[i]))).toBeLessThan(1e-4));
});
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm run e2e -- e2e/smoke.spec.ts` → FAIL (sem gancho/cena). Se o primeiro teste falhar por falta de contexto WebGL **depois** de a cena existir, acrescente `'--enable-unsafe-swiftshader'` aos `args` (a spec permite, conforme a versão do Chrome instalado) e registre isso no commit.
- [ ] **Passo 3: Implementar** `App.tsx`, `index.css`, `Stage.tsx`, `Tray.tsx`, `Die.tsx`, `testHook.ts`, `e2e/global.d.ts` (`interface Window { __dice: import('../src/testHook').DiceHook }`). Nesta tarefa, o `Stage` renderiza os corpos de `bodiesFor(kind, count)` parados em `handPositions`.
- [ ] **Passo 4: Rodar.** `npm run e2e -- e2e/smoke.spec.ts` → PASS.
- [ ] **Passo 5: Validar um dado visualmente** (spec, seção 6, etapa 3). Crie `e2e/screens.spec.ts` (sem asserções; salva em `screens/`). Para cada forma (d4, d6, d10, d20, d10 `tens`), use `pose` em 3 orientações (identidade, 35° em X, 120° em Y), a 1440×900 e a 390×844, e salve `screens/one-<forma>-<orientação>-<largura>.png`. Abra as imagens e confira que os números são legíveis e ficam na superfície da gema. Se algum não for, ajuste só `FONT`, a cor ou o `depthOffset` e repita este passo antes de seguir.
- [ ] **Passo 6: Gate parcial.** `npm run build && npm run lint && npm test` → tudo verde.
- [ ] **Passo 7: Commit.** `git commit -m "feat: scene with tray, gem die with surface numerals and shared refraction buffer"`

---

### Task 10: Fluxo completo — mão, mira, arremesso, conclusão, controles

**Arquivos:**
- Criar: `src/scene/Hand.tsx`, `src/ui/Controls.tsx`, `e2e/roll.spec.ts`
- Modificar: `src/scene/Stage.tsx`, `src/App.tsx`, `src/testHook.ts`, `src/index.css`, `e2e/smoke.spec.ts` (troca `pose` por `fixture`)
- Teste: `e2e/roll.spec.ts`

**Interfaces:**
- Consome: tudo de T1–T9
- Produz:
  - `Hand({ gameArea, bodies }: { gameArea: RefObject<HTMLDivElement | null>; bodies: RefObject<(RapierRigidBody | null)[]> })`, com listeners nativos no elemento `gameArea`:
    - `pointerdown`: `setPointerCapture`, depois `input(press pointer)`.
    - `pointerup`: `input(release pointer, hand)`.
    - `pointercancel` e `lostpointercapture`: `input(cancel)`.
    - `blur` na área e na `window`: `input(cancel)`.
    - `keydown` de `Space` com `event.target === gameArea` e `!event.repeat`: `input(press key)`. `keyup` de `Space`: `input(release key, hand)`. Setas: mira ±0,5 (`clampTarget`).
    - `pointermove`: raycast com NDC calculado a partir de `canvas.getBoundingClientRect()` **no momento do evento**, plano y = 0 → `setAim(clampTarget(ponto))`.
    - Na fase `settled`, `press` vira `return`.
  - Referência (`CLAUDE.md`): o `transformGroup = true` de `references/threejs/misc_controls_drag.html` (o grupo inteiro segue o ponteiro). A classe `DragControls` não é usada (spec 4.8).
  - Movimento da mão, a cada quadro, nas fases `hand`/`charging`:
    - `x` segue `clampHandX(aim.x, n)` com `1 − e^(−12·dt)`.
    - `ω = [vz, 0, −vx] × 1.2 + [0.6, 0.4, 0]`, com `v` = velocidade da mira em unidades/s; cada corpo integra seu quaternion com `ω`.
    - Balanço `y += 0.08·sin(2πt/1.6)`; na carga, `z += HAND.pull × force`.
    - Com `reducedMotion`: `ω = 0` e sem balanço.
    - Aplica com `setNextKinematicTranslation`/`Rotation`. Na carga, `setForce(charge(now − chargeStart))` a cada quadro.
    - `hand.center` = média das posições; `hand.omega` = `ω` atual.
  - Seta de mira no veludo (y = 0.01), da projeção do centro da mão até a mira, com cor interpolada de `#D4A93F` a `#F25C3A` pela força; visível em `hand`/`charging`.
  - Laço físico no `Stage`:
    - `useBeforePhysicsStep`: aplica `launch` (`applyLaunch`) ou `fixture` (`applyPoses`) **uma vez** por `throwId` (ref com o último aplicado), registra no gancho as poses antes e depois e chama `initSettle(throwId, corpos)`.
    - `useAfterPhysicsStep`: só em `rolling`, roda `stepSettle` → `applySettle`; no `publish`, `publish(throwId, toResults(kind, raw))`.
    - Recolher: no efeito `return`, `toKinematic`, interpola as poses (lerp/slerp, `ease-out` cúbico) até as da mão em **400 ms** e então `input({ type: 'returned' })`. Com `reducedMotion`, pose imediata + fade de 150 ms na opacidade dos materiais.
  - `Controls()`:
    - `h1` "Rolador de dados".
    - Grupo "Tipo de dado": 7 botões com `aria-pressed`.
    - "Quantidade": botões − ("Diminuir quantidade") e + ("Aumentar quantidade") com o número no meio.
    - `<progress aria-label="Força">`, visível em `charging`.
    - `<output data-testid="result" aria-live="polite">`: total grande e, com mais de um dado, a soma detalhada `"4 + 17 + 9"`.
    - Dica: em `hand`, "Mire com o mouse e segure para carregar a força. Solte para jogar. No teclado: setas miram, Espaço carrega e solta."; em `settled`, "Clique na mesa para pegar os dados de novo."
    - Painéis sólidos `--panel`, sem sombra nem blur.
  - `App`: `matchMedia('(prefers-reduced-motion: reduce)')` → `setReducedMotion`.
  - Gancho (modo test): troca `pose` por `fixture(poses)` (`startFixture`) e acrescenta `launches(): { count: number; last: { before: { p: Vec3; q: Quat }[]; after: { p: Vec3; q: Quat }[] } | null }`.

- [ ] **Passo 1: Escrever o teste que falha** (`e2e/roll.spec.ts`). O helper `topValue` lê o número de cima a partir dos **rótulos renderizados**, sem usar `read.ts`.

```ts
import { test, expect, type Page } from '@playwright/test';

const ready = (p: Page) => p.waitForFunction(() => window.__dice?.state().ready === true);
const settled = (p: Page) => p.waitForFunction(() => window.__dice.state().phase === 'settled', null, { timeout: 90_000 });
const topValue = async (p: Page, i: number, d4 = false) => {
  const ls = await p.evaluate((k) => window.__dice.labels(k), i);
  const best = ls.reduce((a, b) => (d4 ? b.position[1] > a.position[1] : b.normal[1] > a.normal[1]) ? b : a);
  return best.text.replace('.', '');
};
const throwWithSpace = async (p: Page) => {
  await p.locator('.game-area').focus();
  await p.keyboard.down('Space'); await p.waitForTimeout(700); await p.keyboard.up('Space');
};

test.beforeEach(async ({ page }) => { await page.goto('/'); await ready(page); });

test('known pose fixture: d6 turned +90° about Z shows 3 in the panel and on top', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d6', 1));
  await page.evaluate(() => window.__dice.fixture([{ p: [0, 0.5, 0], q: [0, 0, Math.SQRT1_2, Math.SQRT1_2] }]));
  await settled(page);
  await expect(page.getByTestId('result')).toContainText('3');
  expect(await topValue(page, 0)).toBe('3');
  const [b] = await page.evaluate(() => window.__dice.bodies()), [m] = await page.evaluate(() => window.__dice.meshes());
  b.q.forEach((v, i) => expect(Math.abs(Math.abs(v) - Math.abs(m.q[i]))).toBeLessThan(1e-4));
});

test('d20 × 3 thrown with Space: panel matches the dice on screen', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d20', 3));
  const before = await page.evaluate(() => window.__dice.bodies().map((b) => b.handle));
  await throwWithSpace(page); await settled(page);
  const tops = await Promise.all([0, 1, 2].map((i) => topValue(page, i)));
  const results = await page.evaluate(() => window.__dice.state().results);
  expect(results!.map(String)).toEqual(tops);
  await expect(page.getByTestId('result')).toContainText(String(results!.reduce((a, b) => a + b, 0)));
  expect(await page.evaluate(() => window.__dice.bodies().map((b) => b.handle))).toEqual(before);
  const l = await page.evaluate(() => window.__dice.launches());
  expect(l.count).toBe(1);
  l.last!.before.forEach((pose, i) => {
    pose.p.forEach((v, k) => expect(l.last!.after[i].p[k]).toBeCloseTo(v, 5));
    pose.q.forEach((v, k) => expect(Math.abs(Math.abs(l.last!.after[i].q[k]) - Math.abs(v))).toBeLessThan(1e-5));
  });
});

test('d100 × 10 uses 20 bodies and 10 results that match the pairs on screen', async ({ page }) => {
  await page.evaluate(() => window.__dice.select('d100', 10));
  expect(await page.evaluate(() => window.__dice.bodies().length)).toBe(20);
  await throwWithSpace(page); await settled(page);
  const results = (await page.evaluate(() => window.__dice.state().results))!;
  expect(results).toHaveLength(10);
  for (let i = 0; i < 10; i++) {
    const tens = Number((await topValue(page, 2 * i))[0]), units = Number(await topValue(page, 2 * i + 1));
    expect(results[i]).toBe(tens === 0 && units === 0 ? 100 : tens * 10 + units);
  }
});

test('repeating a throw with the same selection gets a new throwId', async ({ page }) => {
  await throwWithSpace(page); await settled(page);
  const first = await page.evaluate(() => window.__dice.state().throwId);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'hand');
  await throwWithSpace(page); await settled(page);
  expect(await page.evaluate(() => window.__dice.state().throwId)).toBe(first + 1);
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(2);
});
```

Também atualize o terceiro teste de `e2e/smoke.spec.ts` para usar `fixture([{ p: [0, 0.5, 0], q: [0, 0, 0, 1] }])` e esperar `settled`.

- [ ] **Passo 2: Rodar e ver falhar.** `npm run e2e -- e2e/roll.spec.ts` → FAIL.
- [ ] **Passo 3: Implementar** `Hand.tsx`, `Controls.tsx` e as mudanças em `Stage.tsx`, `App.tsx`, `testHook.ts` e `index.css`.
- [ ] **Passo 4: Rodar.** `npm run e2e` → PASS (`smoke` + `roll`).
- [ ] **Passo 5: Gate parcial.** `npm run build && npm run lint && npm test` → verde.
- [ ] **Passo 6: Commit.** `git commit -m "feat: hand aim, charge and throw with physics-read results and controls"`

---

### Task 11: Robustez da entrada e falhas

**Arquivos:**
- Modificar: `src/App.tsx` (boundaries, `?fail=` em modo test), `src/scene/Hand.tsx` (se os testes acharem falhas)
- Criar: `e2e/input.spec.ts`, `e2e/errors.spec.ts`

**Interfaces:**
- Produz (em `App.tsx`):
  - `GraphicsBoundary`: classe externa ao `Canvas`, com fallback `<p role="alert">O 3D falhou neste navegador. Recarregue a página.</p>`.
  - `PhysicsBoundary`: classe dentro do `Canvas`, em volta de `<Physics>`, que chama `setError('physics')` e renderiza `null`; `Controls` mostra `<p role="alert">Não foi possível carregar a física. Recarregue a página.</p>`.
  - `<Canvas fallback={<p role="alert">Este navegador não tem WebGL ativo. Abra no Chrome, Edge ou Firefox atualizados.</p>}>`.
  - Só em modo test, `?fail=graphics` monta dentro do `Canvas` (fora do `PhysicsBoundary`) um componente que lança erro, e `?fail=physics` faz o mesmo dentro do `PhysicsBoundary`.

- [ ] **Passo 1: Escrever os testes que falham** (`e2e/input.spec.ts`)

```ts
import { test, expect, type Page } from '@playwright/test';

const phase = (p: Page) => p.evaluate(() => window.__dice.state().phase);
const ready = (p: Page) => p.waitForFunction(() => window.__dice?.state().ready === true);
test.beforeEach(async ({ page }) => { await page.goto('/'); await ready(page); });

test('Space on a focused control does not start a charge', async ({ page }) => {
  await page.getByRole('button', { name: 'd6' }).focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(300);
  expect(await phase(page)).toBe('hand'); // checked mid-hold: the button click on keyup would reset the phase anyway
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(0);
});

test('losing focus while charging cancels without throwing', async ({ page }) => {
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); expect(await phase(page)).toBe('charging');
  await page.getByRole('button', { name: 'd6' }).focus();
  expect(await phase(page)).toBe('hand'); // before keyup, so the button's own click cannot mask a stuck charge
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(0);
});

test('a gesture during returning does not throw', async ({ page }) => {
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(500); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'settled', null, { timeout: 90_000 });
  await page.keyboard.press('Space'); expect(await phase(page)).toBe('returning');
  await page.keyboard.down('Space'); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'hand');
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(1);
});

test('release over the controls still throws once (pointer capture)', async ({ page }) => {
  const area = await page.locator('.game-area').boundingBox();
  await page.mouse.move(area!.x + area!.width / 2, area!.y + area!.height / 2);
  await page.mouse.down(); await page.waitForTimeout(400);
  const ctl = await page.getByRole('button', { name: 'd6' }).boundingBox();
  await page.mouse.move(ctl!.x + 5, ctl!.y + 5); await page.mouse.up();
  await page.waitForFunction(() => window.__dice.state().phase === 'rolling' || window.__dice.state().phase === 'settled');
  expect(await page.evaluate(() => window.__dice.launches().count)).toBe(1);
});

test('aim follows the pointer after a resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const area = await page.locator('.game-area').boundingBox();
  const centre = await page.evaluate(() => {
    const v = window.__dice.project([0, 0, 0]); return v;
  });
  await page.mouse.move(area!.x + centre[0], area!.y + centre[1]);
  const aim = await page.evaluate(() => window.__dice.state().aim);
  expect(Math.abs(aim[0])).toBeLessThan(0.3); expect(Math.abs(aim[2])).toBeLessThan(0.3);
});

test('selection during rolling resets cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.evaluate(() => window.__dice.select('d100', 10));
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(300); await page.keyboard.up('Space');
  const old = await page.evaluate(() => window.__dice.state().throwId);
  await page.getByRole('button', { name: 'd6' }).click();
  expect(await phase(page)).toBe('hand');
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => window.__dice.state());
  expect(s.results).toBeNull(); expect(s.throwId).toBeGreaterThan(old);
  expect(await page.evaluate(() => window.__dice.bodies().length)).toBe(10);
  expect(errors).toEqual([]);
});

test('keyboard-only flow announces the result', async ({ page }) => {
  for (let i = 0; i < 20 && !(await page.evaluate(() => document.activeElement?.classList.contains('game-area'))); i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.classList.contains('game-area'))).toBe(true);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.down('Space'); await page.waitForTimeout(500); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'settled', null, { timeout: 90_000 });
  const total = await page.evaluate(() => window.__dice.state().results!.reduce((a, b) => a + b, 0));
  await expect(page.locator('output[aria-live="polite"]')).toContainText(String(total));
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'hand');
});

test('reduced motion returns the dice immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload(); await ready(page);
  await page.locator('.game-area').focus();
  await page.keyboard.down('Space'); await page.waitForTimeout(300); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'settled', null, { timeout: 90_000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dice.state().phase === 'hand', null, { timeout: 300 }); // < the 400 ms flight
});
```

Acrescente ao `DiceHook` `project(p: Vec3): [number, number]`, que projeta um ponto do mundo para pixels CSS relativos ao canvas.

`e2e/errors.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('graphics failure shows the graphics message', async ({ page }) => {
  await page.goto('/?fail=graphics');
  await expect(page.getByRole('alert')).toHaveText('O 3D falhou neste navegador. Recarregue a página.');
});
test('physics failure shows the physics message, not the graphics one', async ({ page }) => {
  await page.goto('/?fail=physics');
  await expect(page.getByRole('alert')).toHaveText('Não foi possível carregar a física. Recarregue a página.');
});
test.describe('without WebGL', () => {
  test.use({ launchOptions: { args: ['--disable-3d-apis'] } });
  test('shows the WebGL message', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('alert')).toHaveText('Este navegador não tem WebGL ativo. Abra no Chrome, Edge ou Firefox atualizados.');
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm run e2e -- e2e/input.spec.ts e2e/errors.spec.ts` → FAIL nos que dependem de código novo.
- [ ] **Passo 3: Implementar** as boundaries, o `?fail=` e `project`, e corrigir em `Hand.tsx` o que os testes mostrarem (causa raiz primeiro, com `superpowers:systematic-debugging`).
- [ ] **Passo 4: Rodar.** `npm run e2e` → todas as suítes PASS.
- [ ] **Passo 5: Commit.** `git commit -m "feat: scoped, cancellable input and graphics/physics error boundaries"`

---

### Task 12: Acabamento visual, revisão e gate do loop

**Arquivos:**
- Modificar: `src/index.css`, `src/ui/Controls.tsx`, `e2e/screens.spec.ts` (só o que a revisão apontar)

- [ ] **Passo 1: Capturas.** Estenda `e2e/screens.spec.ts` para salvar `screens/flow-<fase>-<largura>.png` nas fases `hand`, `charging` (Espaço segurado) e `settled` (d20 × 3 e d100 × 10), em 1440×900, 768×1024 e 390×844. Rode `npm run e2e -- e2e/screens.spec.ts`.
- [ ] **Passo 2: Revisar as imagens** (abrir cada uma) com as regras do `frontend-design` e do `design-taste-frontend`: título e controles legíveis, nada sobrepondo a bandeja em 390 px, sem sombra/blur/gradiente nos painéis, números legíveis. Rode também `node C:/Users/renpo/.claude/skills/design-taste-frontend/scripts/inspect.mjs http://127.0.0.1:5179 --app` com `npm run dev:test` no ar. Corrija os FAIL; defenda ou corrija os WARN.
- [ ] **Passo 3: Revisão de código.** Rode a skill `code-review` no diff `main..feat/dice-3d` e aplique os achados confirmados (`superpowers:receiving-code-review`).
- [ ] **Passo 4: Gate do cerebro-loop** (spec, seção 8): `npm run build && npm run lint && npm test && npm run e2e`. Cada falha passa por diagnóstico da causa raiz, correção mínima e o gate de novo, até 3 tentativas por falha; depois disso, parar e reportar.
- [ ] **Passo 5: Verificação final** (`superpowers:verification-before-completion`): rode o gate completo mais uma vez e guarde a saída para o relatório.
- [ ] **Passo 6: Commit.** `git commit -m "chore: visual pass and review fixes; all gates green"`
