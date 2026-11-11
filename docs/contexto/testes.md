# Testes

## Unitários — Vitest (`npm test`)

- Só `tests/**/*.test.ts`, ambiente **Node**, timeout 10 s (`vite.config.ts`).
- Cobrem os módulos puros e a física real: `aim`, `gesture`, `settle`, `world`, `polyhedra`, `read`, `notation`, `omen`, `symbols`, `highlight`, `showcase`, `kraken`, `store`, `physics`.
- `tests/helpers/sim.ts`:
  - `initRapier()` — inicializa `rapier3d-compat` uma vez e silencia o aviso de depreciação conhecido do wasm-bindgen.
  - `simulate({ kind|dice, count, force, target, seed, perturb? })` — roda o **mesmo** `presimulate` do app a partir das poses da mão. Use para testes de física (determinismo, fuga, timeout, seleção mista).
- Teste novo de lógica pura: arquivo `tests/<modulo>.test.ts`, sem fixtures nem mocks de three.

## E2E — Playwright (`npm run e2e`)

- `playwright.config.ts`: Chrome instalado (`channel: 'chrome'`), WebGL por software (`--use-gl=angle --use-angle=swiftshader`), 1440×900, `workers: 1`, timeout 120 s.
- Sobe `npm run dev:test` (Vite em `--mode test`, 127.0.0.1:5179, porta fixa). Não reusa servidor existente.
- Em `mode === 'test'` o canvas usa `preserveDrawingBuffer` e o app expõe `window.__dice` (tipo em `src/testHook.ts`, instalado em `Stage.tsx`).

### `window.__dice` (DiceHook)

| Método | Para quê |
|---|---|
| `state()` | dice, phase, throwId, results, ready, error, aim, showcased, omen, omenDone, omenTime, trayBroken |
| `select(dice)` | troca a seleção sem clicar |
| `rigOmen(omen \| null)` | força o presságio dos próximos arremessos (a física e o resultado continuam reais) |
| `bodies()` / `meshes()` | poses dos corpos Rapier / quaternions das malhas `gem-i` |
| `labels(i)` | numerais do dado i em coordenadas de mundo (texto, valor, posição, normal) |
| `numbersVisible(i)`, `highlights()` | visibilidade dos numerais e dos números em destaque |
| `camera()`, `launches()` | posição da câmera; contagem e poses antes/depois do último lançamento |
| `previewSurface(i, p, q)` | posiciona um dado à mão; só com `?surface-preview` e fase `hand` |

Padrão dos specs: esperar `state().ready`, interagir pelo teclado/ponteiro na `.game-area`, esperar `phase === 'settled'` e `showcased === throwId`, comparar `results` com o que os corpos/labels mostram. Para testar um valor específico (ex.: d100 = 1) os specs **procuram uma semente** que tire o valor na física real; não fabricam resultado.

### Arquivos

| Spec | Foco |
|---|---|
| `smoke` | contexto WebGL, canvas pinta, toda seleção cria corpos e numerais |
| `roll` | face de cima = resultado publicado, Espaço, d100×10, seleção mista, captura de ponteiro, blur, reduced motion, moeda |
| `chat` | tecla C, notação, Vampiro, bola de fogo, erro, moedas |
| `omen` / `kraken` | presságios forçados, reduced motion, recolher durante presságio, bandeja quebrada/restaurada |
| `coin` | repetição de jogadas da moeda, mobile |
| `coin-performance` / `coin-software` | orçamento de quadros com 10 moedas, worker atrasado/falho, DPR no SwiftShader |

Os testes de desempenho têm orçamentos calibrados na máquina do autor (ver `docs/performance-coins.md`); falha só neles em outra máquina pode ser ambiente.

## Gate antes de entregar

```bash
npm run build
npm run lint
npm test
npm run e2e
```

Artefatos locais ignorados pelo Git: `test-results/`, `playwright-report/`, `screens/` (capturas e medições).
