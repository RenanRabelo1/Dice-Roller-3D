# Spec: `arremesso`

Pasta: `src/modules/arremesso/`. Extração nº 6.

## CLAUDE.md (formato final)

### Responsabilidade
Do gesto ao resultado. O módulo cuida da mira, da carga da força e do redemoinho dos dados na mão. Na soltura, simula o arremesso inteiro com o Rapier, num worker ou na thread principal, e reproduz a gravação na cena. No último quadro publica o resultado. Depois leva os dados de volta à mão quando o jogador clica. É dono da área de jogo física: bandeja, colisores e corpos dos dados.

### Regras de negócio
- Fases: `hand → charging → rolling → settled → returning → hand`. De `charging`, um `cancel` volta a `hand`. Uma `selecaoAlterada` leva qualquer fase de volta a `hand`, com `throwId++` e o lançamento, o resultado e a força limpos.
- Só a mesma origem (o mesmo ponteiro, ou a tecla) solta, e o `repeat` de tecla é ignorado. Gestos em `rolling` e `returning` são ignorados. `press` em `settled` = recolher.
- Mira:
  - raycast no plano y=0, limitado ao chão menos `RAIO_MAXIMO` das paredes;
  - setas movem 0,5;
  - só mira em `hand` e `charging`.
- Teclado:
  - só vale com foco na área de jogo;
  - perder o foco (blur) cancela a carga.
- Carga: onda triangular 0→1→0 a cada 1.400 ms.
- Lançamento:
  - velocidade = 6 + força × 16, com lift 0,35;
  - giro = ômega da mão + `spin(semente, i)` (10–25 rad/s);
  - ômega da mão vem da velocidade da mira e é zero com movimento reduzido;
  - semente de `crypto.getRandomValues`.
- Pré-simulação:
  - `STEP` 1/60, gravidade −40, bandeja 14 × 9 com parede de 1,5 e tampa em y 7;
  - CCD em todos os dados;
  - moeda com colisor `roundCylinder` e rotação travada quando lenta e deitada;
  - amortecimento no d100, na moeda e na forma livre com mais de 20 faces.
- Parada:
  - o tempo esgota em 240 passos (4 s); dado fora da bandeja é recuperado;
  - vale como parado quando todos têm velocidade < 0,08 e giro < 0,15 por 12 passos seguidos.
- É determinística: as mesmas entradas dão a mesma gravação.
- Worker:
  - sem resposta em 2 s, ou com erro, a simulação roda na thread principal;
  - depois de um fallback, o worker não é recriado;
  - se o cálculo local também falhar, registra a falha `physics` (o comportamento atual, inclusive o de derrubar o 3D, fica preservado; ver diagnóstico §10);
  - respostas de arremesso antigo são descartadas por `throwId` e fase.
- Replay:
  - um quadro gravado por passo físico, com os corpos da cena sempre cinemáticos;
  - no último quadro fixa a pose final antes de publicar;
  - publica só se o `throwId` é o atual e a fase é `rolling`.
- Retorno:
  - 400 ms (150 ms com movimento reduzido), com easing cúbico e fade com movimento reduzido;
  - fixa a pose exata antes de `returned`.
- Os corpos da cena não têm CCD (ver `armadilhas.md`).

### Expõe
- `fase()`, `useFase()`, `throwIdAtual()`.
- `resultado() → { throwId, dice, results, raw } | null`.
- Evento `resultadoPublicado` (`{ throwId, dice, results, raw, force }`).
- `forca()`, `useForca()`.
- `prontoParaJogar()`.
- Corpos da cena:
  - `corpos()`: poses de leitura;
  - `dadoNaCena(i) → Object3D | null`;
  - `moverDado(i, pose)`: só em `settled`, usado pela `vitrine`.
- Área de jogo: `TRAY`, `trayColliders()`, `envelopeDaMao()` (pontos extremos da mão e do redemoinho, para o enquadramento da câmera).
- Componentes:
  - `<Arremesso gameArea />`: corpos, mão, seta, replay, colisores;
  - `<BarraDeForca/>`;
  - `<DicaDaFase/>`: os textos de ajuda por fase e o aviso de física.
- `inspecao()` (modo teste): fase, `throwId`, resultado, mira, corpos, `launches`, `ready`, `previewSurface`.

### Consome
- `selecao`: `selecao`, `selecaoAlterada`.
- `dados`: `poliedro`, `poliedrosImportados`, `lerFaceDeCima`, `paraResultados`, `RAIO_MAXIMO`, `<AparenciaDoDado/>`, `definirOpacidade`, `definirSombra`.
- `regras`: `MAX_DICE`.
- `src/shared/plataforma`: `movimentoReduzido`, `registrarFalha`, `falha`.
- `src/shared/math`.

### Fora do escopo
- O que se mostra depois de `settled`: o presságio (`pressagios`) e o voo, os números e o painel (`vitrine`).
- A aparência da bandeja: `mesa`.
- O DPR e a câmera: casca.

## Dados de que é dono
- `gesture`, `throwId`, `aim`, `force`, `launch`, `results`, `raw`, `ready`.
- `chargeMode` (modo de rolagem Relativa/Estática, veio de `feat/modo-de-rolagem` na OS-0001) e a chave `localStorage['diceroller.rolagem']`, que guarda a escolha entre visitas.
- O registro de corpos (a ref `bodies`), o worker e o estado do replay.

## Origem do código

| De | O quê |
|---|---|
| `src/throw/*`, `src/physics/*` | tudo. `world.ts` se divide: os vetores vão para `src/shared/math`, `MAX_RADIUS` já foi para `dados` e o resto fica aqui |
| `src/store.ts` | campos e ações de gesto e resultado (`input`, `publish`, `setAim`, `setForce`, `setReady`) |
| `src/scene/Stage.tsx:26, 30-98, 133-139, 151-153` | `ThrowLoop`, `WORKER_TIMEOUT`, registro de corpos, `recordLaunch` |
| `src/scene/Hand.tsx:23-38, 73-146, 165-190, 314-356, 359` | input, mão, redemoinho, seta, retorno. A parte `settled` (`39-72, 191-313`) vai para `vitrine` e `pressagios` |
| `src/scene/Die.tsx:169-227` | `RigidBody`, colisor, `register`, posição inicial |
| `src/scene/Tray.tsx:48-56` | colisores fixos |
| `src/ui/Controls.tsx:29-32, 52, 54, 77-81` | `Force`, a dica por fase, o aviso de física |
| `src/scene/Stage.tsx:155-192` | o enquadramento fica na casca e passa a usar `envelopeDaMao()` |

**Pontos de chamada a trocar:**
- os legados de vitrine e presságio, que ainda estão em `Hand.tsx`, `Omens.tsx` e `Tray.tsx`;
- o test hook;
- os E2E `kraken.spec.ts:33` e `coin-performance.spec.ts`, que importam `/src/store.ts` e `/src/physics/presim.ts` por URL e têm o caminho atualizado na mesma ordem;
- os testes de `aim`, `gesture`, `settle`, `vortex`, `world`, `physics` e `store` (a parte do gesto), que movem para o módulo; `tests/helpers/sim.ts` passa a importar do `index.ts`.

## Critérios de aceite da extração
- `useDice` não tem mais campos do arremesso.
- `physics/apply` continua o único lugar que muda tipo, velocidade e pose de corpo (`moverDado` delega a ele).
- Os testes de física (determinismo, fuga, timeout, seleção mista) passam sem mudar asserções.
- O chunk do worker continua sendo gerado (`presim.worker-*.js`).
- Os E2E `roll`, `coin`, `coin-performance`, `coin-software` e `failure` passam.
- O gate completo passa.
