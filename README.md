# Dice Roller 3D

Rolador de dados 3D no navegador. Você escolhe os dados pelos botões ou pelo chat, com notação como `2d10 + d100`. Depois mira com o mouse ou as setas, segura para carregar a força e solta. A física (Rapier) decide o resultado, e os dados voam até a câmera mostrando a face sorteada. Críticos e falhas de d20 e d100 disparam presságios: raio, kraken, fogo, tempestade e dualidade. Também dá para importar dados próprios (`.stl`/`.glb`) e personalizar a mesa. A interface é em pt-BR.

O jogo funciona sem rede. A API de histórico em [`server/`](server/README.md) é opcional: se o build tiver `VITE_API_URL`, cada resultado é enviado a ela.

**Stack:** React 19, three + React Three Fiber, Rapier, zustand, Vite e TypeScript. A API usa Fastify e MongoDB.

## Rodando

```bash
npm install
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run build` | `tsc -b` + build do Vite |
| `npm run lint` | oxlint |
| `npm test` | Vitest: unidades, física real em Node e testes de arquitetura |
| `npm run test:server` | typecheck e testes da API (MongoDB em memória) |
| `npm run e2e` | Playwright (sobe `npm run dev:test` em 127.0.0.1:5179) |

Gate de entrega: `npm run build && npm run lint && npm test && npm run test:server && npm run e2e`.

## Arquitetura: monólito modular

O código está dividido em 9 módulos de negócio em `src/modules/`: `regras`, `historico`, `dados`, `selecao`, `meus-dados`, `arremesso`, `mesa`, `pressagios` e `vitrine`. Eles são compostos pela casca (`src/main.tsx`, `src/App.tsx` e `src/app/`). A infraestrutura sem regra de negócio fica em `src/shared/`.

- Um módulo só é acessado de fora pelo `index.ts`, ou pelo `cena.ts` para componentes React. Os tipos ficam em `contracts.ts`.
- Cada dado tem um módulo dono. Ninguém lê o store de outro módulo.
- Não há ciclos entre módulos. Quando um precisa reagir ao outro, a comunicação passa pelos eventos de `src/shared/events.ts`.
- `tests/arquitetura/` verifica essas regras no `npm test`, sem exceções.

## Documentação

| Para | Ler |
|---|---|
| Visão geral, árvore e glossário | [docs/contexto/visao-geral.md](docs/contexto/visao-geral.md) |
| Módulos, donos dos dados e eventos | [docs/mapa-modulos.md](docs/mapa-modulos.md) |
| Como trabalhar e onde entra uma demanda nova | [docs/guia-orquestrador.md](docs/guia-orquestrador.md) |
| Decisões de arquitetura | [docs/adr/](docs/adr/) |
| Um módulo específico | `src/modules/<módulo>/CLAUDE.md` |
| Testes e armadilhas de física e cena | [docs/contexto/testes.md](docs/contexto/testes.md), [docs/contexto/armadilhas.md](docs/contexto/armadilhas.md) |
| Próximas features | [docs/backlog.md](docs/backlog.md) |
| Mapa para agentes de IA | [CLAUDE.md](CLAUDE.md) |
