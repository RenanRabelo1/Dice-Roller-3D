# Dice Roller 3D: mapa para agentes

Rolador de dados 3D (React 19 + three/R3F + Rapier + zustand, Vite). A UI é em pt-BR. O resultado sai de uma pré-simulação física feita no arremesso e depois é reproduzido na tela. O jogo funciona sem rede; a API de histórico (`server/`, Fastify + MongoDB) é opcional.

**Em refatoração para monólito modular.** O método está em [docs/guia-orquestrador.md](docs/guia-orquestrador.md); as decisões, em [docs/adr/](docs/adr/); o andamento, em [docs/plano-refatoracao.md](docs/plano-refatoracao.md); as ordens de serviço, em [docs/ordens/](docs/ordens/). A fundação está pronta. Já foram extraídos `regras`, `historico` (cliente e servidor), `dados`, `selecao`, `meus-dados`, `arremesso`, `mesa` e `pressagios`; o resto do código de negócio ainda está nas pastas antigas (`src/dice`, `scene`, `ui`, `store.ts`).

## Regras (seção 2 do guia, com as adaptações dos ADRs)

1. **Porta única.** De fora, um módulo (`src/modules/<m>/`) só é acessado pelo `index.ts`. O `contracts.ts` pode ser importado só com `import type`. Um módulo com cena tem uma segunda porta, `cena.ts`, para componentes e hooks React. O `index.ts` continua puro, sem React, para o worker e os testes em Node (ADR 0010).
2. **Dono dos dados.** Cada dado tem um módulo dono, registrado no bloco `donos-dos-dados` do [mapa](docs/mapa-modulos.md). Isso vale para stores zustand, stores do IndexedDB, chaves do `localStorage` e a coleção `rolls`. Ninguém lê o store de outro módulo (ADR 0003).
3. **Contratos tipados.** Tudo o que entra e sai de um módulo está em `contracts.ts`. O frontend importa do servidor só os tipos (ADR 0004).
4. **Sem ciclos.** Quando dois módulos precisam reagir um ao outro, a comunicação passa pelo sinal síncrono de `src/shared/events.ts` (ADR 0005).
5. **`shared/` sem regra de negócio.** Só infraestrutura: `events`, `math`, `db`, `plataforma`, `modelos3d`. Item novo exige ADR (ADR 0008).
6. **Um módulo por ordem de serviço.** A casca e o legado entram na ordem quando ela os lista.
7. **Testes dentro do módulo,** em `src/**/tests/`. A pasta `tests/` da raiz fica para o que atravessa módulos (ADR 0007).
8. **Contexto atualizado.** Quem muda comportamento atualiza a doc do módulo no mesmo commit.

As regras 1, 2 e 4 são verificadas por `tests/arquitetura/`, que roda no `npm test` (ADRs 0006 e 0009). Exceções só existem nomeadas em `tests/arquitetura/config.ts`, cada uma com o ADR ou o plano que a justifica.

## Onde ficam as coisas

| Pasta | O que é |
|---|---|
| `src/main.tsx`, `src/App.tsx`, `src/app/` | A casca, raiz de composição. Não é módulo e nenhum módulo a importa. `app/Cena.tsx` monta a cena; `app/testHook.ts` monta o `window.__dice` (ADR 0008) |
| `src/shared/` | Infraestrutura: `events.ts`, `math.ts`, `db.ts` (`defineStore`), `plataforma/` (falha, Guard, WebGL, software, movimento reduzido), `modelos3d/` (GLB/STL com limites por parâmetro) |
| `src/modules/<m>/` | Os módulos, criados a cada extração: `CLAUDE.md`, `index.ts`, `contracts.ts`, `tests/` |
| `src/dice`, `scene`, `ui`, `store.ts` | O legado, que sai módulo a módulo |
| `server/` | A API de histórico, um pacote à parte |
| `tests/`, `e2e/` | A rede de segurança, os testes de arquitetura e os E2E do sistema inteiro |

Os módulos, com responsabilidade, dependências permitidas e estado, estão em [docs/mapa-modulos.md](docs/mapa-modulos.md). Na ordem de extração são: `regras`, `historico`, `dados`, `selecao`, `meus-dados`, `arremesso`, `mesa`, `pressagios` e `vitrine`.

## Leia só o que a tarefa pede

Enquanto um módulo não é extraído, o contexto dele fica em `docs/contexto/`. Depois da extração, passa a ficar no `CLAUDE.md` do próprio módulo.

| Tarefa | Ler |
|---|---|
| Primeira vez: stack, comandos, onde fica cada coisa, glossário | [visao-geral.md](docs/contexto/visao-geral.md) |
| Mira, carga, fases, store, física, pré-simulação, worker, parada, retorno | [src/modules/arremesso/CLAUDE.md](src/modules/arremesso/CLAUDE.md) |
| Tipos de dado, geometria, numeração, leitura, símbolos, aparência | [src/modules/dados/CLAUDE.md](src/modules/dados/CLAUDE.md) |
| A mão, notação e chat, apelido | [src/modules/selecao/CLAUDE.md](src/modules/selecao/CLAUDE.md) |
| Importar dado (assistente, detecção, calibração, gravação) | [src/modules/meus-dados/CLAUDE.md](src/modules/meus-dados/CLAUDE.md) |
| **Adicionar um tipo de dado** e o detalhe dos importados | [dados.md](docs/contexto/dados.md) |
| Depois do resultado: presságios (raio, kraken, fogo, tempestade, dualidade) | [src/modules/pressagios/CLAUDE.md](src/modules/pressagios/CLAUDE.md) |
| Depois do resultado: voo até a câmera, números em destaque | [apresentacao.md](docs/contexto/apresentacao.md) |
| Vitest, Playwright, `window.__dice`, testes de arquitetura, gate | [testes.md](docs/contexto/testes.md) |
| Fundo, mesa (cores, textura), exportar e importar mesa `.glb`, kraken nos cacos | [src/modules/mesa/CLAUDE.md](src/modules/mesa/CLAUDE.md) |
| Antes de mexer em física, cena ou desempenho; specs antigas × código | [armadilhas.md](docs/contexto/armadilhas.md) |
| Demanda nova: a que módulo pertence | [mapa-modulos.md](docs/mapa-modulos.md) e seção 8 do [guia](docs/guia-orquestrador.md) |
| Próximas features combinadas, ainda sem spec | [backlog.md](docs/backlog.md) |

Gate: `npm run build && npm run lint && npm test && npm run test:server && npm run e2e`. Rode os E2E um por vez, com a máquina livre, porque os botões de presságio têm orçamento de tempo. `docs/superpowers/` é histórico e diverge do código (ver armadilhas.md).

# Referências Three.js

Ao implementar os dados 3D, consulte os fontes oficiais em `references/threejs/`:

- `physics_rapier_basic.html`: gravidade, colisões, restituição e sincronização entre física e meshes; base para dados e paredes da bandeja.
- `physics_ammo_break.html`: `initInput()` usa Raycaster para lançar objetos; adapte a velocidade fixa para direção e intensidade do gesto. Aproveite os colisores convexos; a fratura é dispensável.
- `misc_controls_drag.html`: DragControls e seleção de grupos para os dados acompanharem o mouse antes do lançamento.
- `webgl_geometries.html`: formas D4/D6/D8/D20. D12 usa `DodecahedronGeometry`; D10/D100 precisam de adaptação.

São fontes para adaptação, com imports/assets relativos ao repositório original; não executam isoladamente. Rapier e Ammo são alternativas de física.

[Origem fixada](https://github.com/mrdoob/three.js/tree/877e9c9f39c60f929b5018372a8c953f5beabc1b/examples). Licença MIT em `references/threejs/LICENSE`.
