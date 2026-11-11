# Dice Roller 3D — mapa para agentes

Rolador de dados 3D (React 19 + three/R3F + Rapier + zustand, Vite). UI em pt-BR. O resultado é decidido por uma pré-simulação física no arremesso e reproduzido na tela.

**Leia só o módulo da tarefa** (`docs/contexto/`), não o repositório inteiro:

| Tarefa | Ler |
|---|---|
| Primeira vez, stack, comandos, onde fica cada coisa, glossário | [visao-geral.md](docs/contexto/visao-geral.md) |
| Mira, carga, fases, store, física, pré-simulação, worker, parada, retorno | [arremesso.md](docs/contexto/arremesso.md) |
| Tipos de dado, geometria, numeração, leitura, símbolos, notação/chat, **adicionar dado** | [dados.md](docs/contexto/dados.md) |
| Depois do resultado: presságios (raio, kraken, sangue, dualidade), voo até a câmera, números em destaque | [apresentacao.md](docs/contexto/apresentacao.md) |
| Vitest, Playwright, `window.__dice`, gate | [testes.md](docs/contexto/testes.md) |
| Fundo, mesa (cores, textura), exportar/importar mesa `.glb`, kraken nos cacos | [mesa.md](docs/contexto/mesa.md) |
| Antes de mexer em física, cena ou desempenho; specs antigas vs. código | [armadilhas.md](docs/contexto/armadilhas.md) |

Gate: `npm run build && npm run lint && npm test && npm run e2e`.
`docs/superpowers/` é histórico e diverge do código (ver armadilhas.md). Mudou o comportamento? Atualize o módulo correspondente no mesmo commit.

# Referências Three.js

Ao implementar os dados 3D, consulte os fontes oficiais em `references/threejs/`:

- `physics_rapier_basic.html`: gravidade, colisões, restituição e sincronização entre física e meshes; base para dados e paredes da bandeja.
- `physics_ammo_break.html`: `initInput()` usa Raycaster para lançar objetos; adapte a velocidade fixa para direção e intensidade do gesto. Aproveite os colisores convexos; a fratura é dispensável.
- `misc_controls_drag.html`: DragControls e seleção de grupos para os dados acompanharem o mouse antes do lançamento.
- `webgl_geometries.html`: formas D4/D6/D8/D20. D12 usa `DodecahedronGeometry`; D10/D100 precisam de adaptação.

São fontes para adaptação, com imports/assets relativos ao repositório original; não executam isoladamente. Rapier e Ammo são alternativas de física.

[Origem fixada](https://github.com/mrdoob/three.js/tree/877e9c9f39c60f929b5018372a8c953f5beabc1b/examples). Licença MIT em `references/threejs/LICENSE`.
