# Módulo `arremesso`

Duas portas (ADR 0010): `index.ts`, puro e sem React (o worker e os testes em Node), e `cena.ts`, com o hook e os componentes. Tipos em `contracts.ts`, regras puras em `domain/` (`gesture`, `aim`, `vortex`, `world`, `apply`, `mover` (o único não puro: lê o store e o registro de corpos), `envelope`, `presim`, `settle`, `vies`), o estado em `store.ts`, a chave do `localStorage` em `repository.ts`, a cena em `scene/` e o rodapé em `ui/`. O worker (`domain/presim.worker.ts`) só nasce por `criarWorkerDePresimulacao()` do `index.ts`. O detalhe (linha do tempo, pré-simulação, parada, constantes, worker) está em [NOTAS.md](NOTAS.md): leia só quando a ordem mandar.

## Responsabilidade
Do gesto ao resultado: a mira, a carga da força e o redemoinho dos dados na mão. Na soltura, simula o arremesso inteiro com o Rapier (no worker ou, no fallback, na thread principal), reproduz a gravação na cena e publica o resultado no último quadro. Depois leva os dados de volta à mão. É dono de: o estado do arremesso (`store.ts`, escrito só ali); a chave `localStorage['diceroller.rolagem']` (o `chargeMode`); o registro de corpos (`registroDeCorpos`, em `scene/corpos.ts`); o worker e o estado do replay (`LoopDoArremesso`); e o registro de lançamentos (`registrarLancamento`).

## Regras de negócio
- Fases: `hand → charging → rolling → settled → returning → hand`. `cancel` em `charging` volta a `hand`. `selecaoAlterada` leva qualquer fase a `hand` num único `set` (`throwId++`, limpa `launch`/`results`/`force`, copia `dice`).
- Só a mesma origem (ponteiro ou tecla) solta; `repeat` de tecla é ignorado; gestos em `rolling`/`returning` são ignorados; `press` em `settled` recolhe.
- Mira: raycast em y=0 com `clampTarget`, setas movem 0,5, só em `hand`/`charging`. Teclado só com foco na área; `blur` cancela.
- Carga `relative`: onda 0→1→0 a cada 1.400 ms; `static`: sobe a 1 em 700 ms e fica.
- `input` com efeito `throw` cria o `Launch` num único `set` (semente de `crypto.getRandomValues`, mão real).
- `publish` só vale com o `throwId` atual e fase `rolling`: um `set` e, no mesmo tique, `resultadoPublicado.emit`. O store de `pressagios` assina `resultadoPublicado` e reage com outro `set`: são dois `set` no mesmo tique (OS-0031).
- Worker: sem resposta em 2 s (+ `BIAS_BUDGET.worker` com viés), ou com erro, `presimulateFor` roda na thread principal e o worker não volta. Se o local falhar, `reiniciar()` e `registrarFalha('physics')`. Respostas antigas são descartadas por `throwId` e fase.
- Replay: um quadro por passo físico, corpos sempre cinemáticos e sem CCD (armadilhas.md); fixa a pose final antes de `publish`.
- Retorno: 400 ms (150 ms com movimento reduzido), fixa a pose exata antes de `returned`.
- A pré-simulação é determinística: as mesmas entradas dão a mesma gravação.
- Luz da carga (OS-0057): um `<pointLight>` dentro da `MaoDoArremesso`, sempre montada, sem sombra, `intensity={0}` por padrão (o número de luzes nunca muda: armadilhas.md). No `useFrame` recebe `intensidadeDaCarga(fase, força, renderizadorPorSoftware())` (regra pura em `domain/luz.ts`: 0 fora de `charging` e no software; `base + ganho × força`) e fica sobre a mira. Não pisca nem treme, então não trata movimento reduzido; o worker não a importa.
- A dica (`DicaDaFase`) tem `key={texto}`: o `<p>` remonta a cada troca de texto e o CSS da casca (`footer.status > p`, animação `dica`) faz o fade.
- O DOM do rodapé (`ModoDeRolagem`, `BarraDeForca`, `DicaDaFase`) é contrato dos E2E e do CSS; `tests/componentes.test.ts` o compara com o rodapé de antes da extração (fixture).

## Expõe
- `index.ts`: `arremesso()` e as ações (`input`, `publish`, `reiniciar`, `setAim`, `setForce`, `setChargeMode`, `setReady`); `assinarArremesso`; `resultadoPublicado` (só `subscribe`); `registroDeCorpos`; `moverDado(i, pose, fixar = true)` (só em `settled`, a única escrita de pose nessa fase, por `apply.ts`; noutra fase ou em vaga vazia não faz nada); `envelopeDaMao()` (os pontos extremos da maior mão e do redemoinho, para o enquadramento da câmera da casca); `inspecao()` → `{ corpos(), lancamentos() }` (os `bodies()`/`launches()` do test hook); `criarWorkerDePresimulacao`; o domínio puro (`reduce`, `charge`, `clampTarget`, `TRAY`, `trayColliders`, `HAND`, `STEP`, `GRAVITY`, `presimulate`, `presimulateFor`, `omenKinds`, `plays`, o redemoinho...).
- Tipos (`contracts.ts`): `EstadoDoArremesso`, `ResultadoPublicado`, `Phase`, `Launch`, `RollRequest`, `Recording`, `UltimoLancamento`, `OmenTest` e os do gesto.
- `cena.ts`: `useArremesso(selector)`; `<LoopDoArremesso omenTest/>`, `<MaoDoArremesso gameArea/>`, `<CorpoDoDado/>` (registra-se sozinho), `<ColisoresDaBandeja/>`; `<ModoDeRolagem/>`, `<BarraDeForca/>` (quem monta decide quando aparece), `<DicaDaFase/>` (textos por fase e o aviso de física).

## Consome
- `selecao`: `selecao`, `selecaoAlterada`.
- `dados`: `polyhedron`, `readUp`, `toResults`, `customsOf`, `registerPoly`, `paraRegras`, `RAIO_MAXIMO`, `definirOpacidade`, `definirSombra` (a `MaoDoArremesso` não procura `die-i`/`gem-i` pelo nome), `<AparenciaDoDado/>`.
- `regras`: `MAX_DICE`, `omenKind`, `omenOf` e os tipos de dado.
- `src/shared`: `events` (`createSignal`), `math`, `plataforma` (`movimentoReduzido`, `registrarFalha`, `useFalha`).
- `pressagios`, por prop-função da casca (inversão de dependência): `omenTest`, o botão de teste de presságio, que mora em `pressagios`. Como `pressagios` depende de `arremesso`, importá-lo daqui criaria um ciclo; a casca passa `() => presagio().omenTest` ao `<LoopDoArremesso/>`.

## Fora do escopo
- Depois de `settled`: o presságio (`pressagios`), o voo, os números e o resultado (`vitrine`). A `Vitrine` (`vitrine/scene/Vitrine.tsx`) lê `registroDeCorpos` e move só por `moverDado`; o `PresagiosNaCena` (`pressagios`) só lê.
- `dadoNaCena` da spec não existe: ninguém o chama (a `Vitrine` usa `dadoNaRaiz` de `dados`), OS-0043.
- A aparência da bandeja (`mesa`), o DPR e a câmera (casca).
