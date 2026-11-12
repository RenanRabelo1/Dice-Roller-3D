# Testes

## Unitários — Vitest (`npm test`)

- Só `tests/**/*.test.ts`, ambiente **Node**, timeout 10 s (`vite.config.ts`).
- Cobrem os módulos puros e a física real: `aim`, `gesture`, `settle`, `world`, `polyhedra`, `read`, `notation`, `omen`, `symbols`, `highlight`, `showcase`, `kraken`, `fire`, `vortex`, `history`, `store`, `physics`, `importer`, `custom`, `table`.
- A API tem sua própria suíte: `cd server && npm test` (Fastify de verdade num MongoDB em memória via `mongodb-memory-server`).
- `tests/helpers/sim.ts`:
  - `initRapier()` — inicializa `rapier3d-compat` uma vez e silencia o aviso de depreciação conhecido do wasm-bindgen.
  - `models.ts`: `modelTriangles` (sólido nosso, chanfrado, girado e deslocado como um export de fatiador), `stl`, `glb`, `subdivided`, `customDieOf` (dado importado registrado).
  - `simulate({ kind|dice, count, force, target, seed, perturb? })` — roda o **mesmo** `presimulate` do app a partir das poses da mão. Use para testes de física (determinismo, fuga, timeout, seleção mista).
- Teste novo de lógica pura: arquivo `tests/<modulo>.test.ts`, sem fixtures nem mocks de three.

## E2E — Playwright (`npm run e2e`)

- `playwright.config.ts`: Chrome instalado (`channel: 'chrome'`), WebGL por software (`--use-gl=angle --use-angle=swiftshader`), 1440×900, `workers: 1`, timeout 120 s.
- Sobe `npm run dev:test` (Vite em `--mode test`, 127.0.0.1:5179, porta fixa). Não reusa servidor existente.
- Em `mode === 'test'` o canvas usa `preserveDrawingBuffer` e o app expõe `window.__dice` (tipo em `src/testHook.ts`, instalado em `Stage.tsx`).

### `window.__dice` (DiceHook)

| Método | Para quê |
|---|---|
| `table()` | mesa ativa lida da cena: id, nome, fundo (incl. `panorama`), cores do feltro/madeira, textura, se há modelo, caixa da guia, nº de mesas salvas, `reflect` (fundo 360°) e `programs` (nº de programas de shader, para checar recompilação) |
| `shards()` | cores (feltro/madeira) do primeiro caco do kraken |
| `state()` | dice, phase, throwId, results, ready, error, aim, showcased, omen, omenDone, reducedMotion, omenTime, trayBroken, burning (fogo do d20 visível) |
| `select(dice)` | troca a seleção sem clicar |
| `rigOmen(omen \| null)` | força o presságio dos próximos arremessos (a física e o resultado continuam reais) |
| `bodies()` / `meshes()` | poses dos corpos Rapier / quaternions das malhas `gem-i` |
| `labels(i)` | numerais do dado i em coordenadas de mundo (texto, valor, posição, normal) |
| `numbersVisible(i)`, `highlights()` | visibilidade dos numerais e dos números em destaque (texto, visível, posição) |
| `inkGlow(i)` | brilho da gravação de um dado de forma livre gravado no showcase: visível, triângulos, opacidade (`null` sem brilho) |
| `gemLook(i)` | malhas visíveis do dado i: tipo de material, opaco, pintado por vértice e a cor da primeira tinta (números pintados) |
| `camera()`, `launches()` | posição da câmera; contagem e poses antes/depois do último lançamento |
| `customs()` | dados importados: kind, id, nome, apelido, base, `printed` |
| `previewSurface(i, p, q)` | posiciona um dado à mão; só com `?surface-preview` e fase `hand` |

Depois de `page.emulateMedia({ reducedMotion })` com relógio simulado, **espere** `state().reducedMotion` antes de avançar o relógio: o evento do `matchMedia` chega assíncrono (ver `docs/superpowers/specs/2026-11-11-correcao-falhas-e2e.md`).

Padrão dos specs: esperar `state().ready`, interagir pelo teclado/ponteiro na `.game-area`, esperar `phase === 'settled'` e `showcased === throwId`, comparar `results` com o que os corpos/labels mostram. Para testar um valor específico (ex.: d100 = 1) os specs **procuram uma semente** que tire o valor na física real; não fabricam resultado.

### Arquivos

| Spec | Foco |
|---|---|
| `smoke` | contexto WebGL, canvas pinta, toda seleção cria corpos e numerais |
| `roll` | face de cima = resultado publicado, Espaço, d100×10, seleção mista, captura de ponteiro, blur, reduced motion, moeda |
| `chat` | tecla C, notação, Vampiro, bola de fogo, erro, moedas |
| `failure` | sem WebGL, falha do renderer e física que não carrega (simuladas por `addInitScript`): mensagem em pt-BR, sem canvas |
| `table` | fundo (tema/foto/cor), cores no pixel, ida-e-volta exportar→importar (M13), arquivo com escala/Z para cima/moldura invadindo, recusas, upgrade do IndexedDB v1→v2 |
| `table-kraken` | cacos com a cor do feltro da mesa; modelo sem piso some inteiro na quebra |
| `omen` / `kraken` | presságios forçados (raio, kraken que arremessa e busca o d100, fogo do d20, tempestade do d100), reduced motion, recolher durante presságio, bandeja quebrada/restaurada |
| `import` | importar STL/GLB (gerados por `tests/helpers/models.ts` a partir dos nossos sólidos), calibrar, rolar, recarregar, excluir, recusas, 10 dados de ~48 mil triângulos |
| `coin` | repetição de jogadas da moeda, mobile; a moeda sobe e "Cara"/"Coroa" fica embaixo |
| `coin-performance` / `coin-software` | orçamento de quadros com 10 moedas, worker atrasado/falho, DPR no SwiftShader |

Os testes de desempenho têm orçamentos calibrados na máquina do autor (ver `docs/performance-coins.md`); falha só neles em outra máquina pode ser ambiente.

## Gate antes de entregar

```bash
npm run build
npm run lint
npm test
npm run e2e
```

## Rodar E2E sem atrapalhar outra rodada

O WebGL dos testes é por software (SwiftShader) e usa a CPU. Duas rodadas ao mesmo tempo dividem a máquina: os testes **funcionais** passam, só mais devagar; os de **desempenho** (`coin-performance`, `coin-software`) e qualquer medição de FPS falham ou distorcem. Rodadas completas e medições: uma por vez. Para rodar testes funcionais isolados em paralelo, use um config temporário em `temp/` (fora do git) que importa o `playwright.config.ts` e troca só a porta (`baseURL` e o `--port` do `webServer.command`), e rode com `-c temp/<arquivo>`. Com a máquina sobrecarregada aparecem falsos negativos típicos: timeout em `beforeEach` esperando `ready` e erro do `clock.pauseAt`.

Artefatos locais ignorados pelo Git: `test-results/`, `playwright-report/`, `screens/` (capturas e medições).

## `screens.spec.ts` (numerais na superfície)

Falhava em 7 casos por duas causas do teste, não do desenho: (1) contava pixels **dourados** em todos os dados, mas d10, d20 e d100 têm numeral **escuro** em gema clara (`INK` em `Die.tsx`); agora conta tinta escura entre pixels claros da mesma linha para esses três; (2) a página `?surface-preview` herdava o DPR 0,35 do SwiftShader e a queda adaptativa de DPR, deixando o dado com poucos pixels. A prévia (só em `mode=test`) agora mantém a resolução real (`isPreview` em `Stage.tsx`). As margens são conferidas em px CSS.
