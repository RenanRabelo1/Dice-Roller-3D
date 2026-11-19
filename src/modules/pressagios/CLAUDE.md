# Módulo `pressagios`

Duas portas (ADR 0010): `index.ts`, puro e sem React (testes em Node), e `cena.ts`, com os hooks, a cena 3D e a camada HTML. Tipos em `contracts.ts`, regras puras em `domain/` (`omen`, `plano`, `percurso`, `krakenMotion`, `fireMotion`, `vampiroMotion`, `omenTest`), o estado em `store.ts`, a cena em `scene/` e o HTML em `ui/` (com `ui/presagios.css`). O detalhe (cada efeito, os marcos, os botões de teste, a receita de presságio novo) está em [NOTAS.md](NOTAS.md).

## Responsabilidade
Decidir se um resultado publicado tem presságio e mostrá-lo antes do resultado aparecer. Os efeitos são raio, kraken, fogo, tempestade, dualidade e os três presságios de vampiro. Inclui o 3D, a camada HTML e o CSS dela, a duração, o relógio compartilhado, a quebra da mesa no kraken e os botões de teste. É dono do store do presságio (`omen`, `vampiro`, `omenDone`, `omenAt`, `omenRig`, `omenTest`) e dos caches de shader dos efeitos, aquecidos pelo `PresagiosNaCena`.

## Regras de negócio
- O presságio é decidido em `resultadoPublicado`, no mesmo tique (ADR 0005): `omenOf(omenKinds(dice), results)`, de `regras`. O relógio `omenAt` é o `performance.now()` da publicação. `rigOmen(omen)` (test hook) força o dos próximos arremessos sem mudar a física; `setOmenTest` (botões de teste) faz a física real cair nele.
- Com movimento reduzido não há presságio, e ligar o movimento reduzido durante um o cancela (`aoMudarMovimentoReduzido`).
- Toca enquanto a fase é `settled`, o presságio é do `throwId` atual e `omenDone !== throwId` (`presagioTocando`). Recolher os dados o encerra, e o resultado aparece na hora.
- Que efeito em que dado sai de uma fonte só, `planoDoPresagio(omen, dice)`: raios nos d20 de um crítico; kraken no d100 crítico sem falha; tempestade no d100 com falha sem crítico; fogo no d20 com falha sem crítico; na dualidade, só os peixes. O 3D e o HTML o leem.
- A busca dos botões de teste no worker (`plays`, em `arremesso/domain/vies.ts`) repete essa escolha, porque `arremesso` não pode importar `pressagios`. Um teste (`tests/plano.test.ts`) garante que as duas concordam.
- Duração (`OMEN_MS`): raio 1.300, kraken 6.500, fogo 2.400, tempestade 4.600, dualidade 2.600 ms (choque em `DUALITY_HIT`, 1.100). Falha com d20 e d100 dura a maior. O CSS usa os mesmos tempos.
- `presagioVampiro` de `regras` decide no mesmo tique. O plano e o percurso recebem `vampiro` quando o resultado tem par de críticos (5.600 ms), crítico bestial (4.600 ms) ou falha bestial (5.400 ms). `domain/vampiroMotion.ts` define os marcos, as poses e a cobertura das mãos na câmera.
- O fogo continua nos d20 depois do fim, até a fase sair de `settled`.
- Kraken: a mesa quebra entre `rupture` (450) e `restored` (6.300) pela regra única `trayBrokenAt`, aplicada pelo `QuebraDaMesa` com `ocultarPiso` de `mesa`; qualquer interrupção a recompõe. Os cacos usam `coresDaMesa()`, com a madeira "iluminada".
- O d100 do kraken e o da tempestade fazem um percurso próprio que termina na pose do resultado. A vitrine pergunta: `indicesComPercurso` e `movimentoNoPresagio` (pose, número revelado, `sombra` e `fim`).
- Desempenho: shaders compilados no mount e de novo quando o ambiente fica pronto; luzes sempre na cena, com intensidade 0 fora do efeito (mudar a contagem recompila todos os dados); nada visível fora de um presságio.
- Acessibilidade: "Crítico!", "Falha crítica!" e "Dualidade: crítico e falha!" num `role="status"`. O DOM do overlay e os atributos de `.game-area` são contrato dos E2E e do CSS (`tests/overlay.test.ts` com a fixture `tests/fixtures/overlay-antes.json`).

## Expõe
- `index.ts`: `presagio()`, `presagioTocando()`, `rigOmen`, `setOmenTest`, `setOmenDone`; `reiniciarPresagio()` (restaura o store inicial); `indicesComPercurso`, `movimentoNoPresagio`; `OMEN_MS`, `omenMs`, `isD20`; o movimento que a `vitrine` lê (`KRAKEN`, `STORM`, `krakenDieAt`, `stormAt`, `stormDieAt`); `inspecao(cena)` → `{ omen, vampiro, omenDone, omenTime, trayBroken, burning, shards }` (os campos do `window.__dice`).
- Tipos (`contracts.ts`, sem re-export na porta; ninguém de fora os usa): `EstadoDoPresagio`, `PlanoDoPresagio`, `MovimentoNoPresagio`, `PresagioInspecionado`. `planoDoPresagio`, `DUALITY_HIT`, `OMEN_TESTS`, o resto do movimento do kraken e o do fogo ficam internos (os testes do módulo importam de `domain/`).
- `cena.ts`: `usePresagio(sel)`, `usePresagioTocando()`; `<PresagiosNaCena/>` (3D, depois da física), `<QuebraDaMesa/>` (logo antes da `<MesaNaCena/>`), `<OverlayDoPresagio gameArea/>` (atributos em `.game-area` e CSS), `<BotoesDeTeste gameArea/>` (o `App` monta só em `DEV`); `shard`, `shardWood` (só para os testes do módulo). Os botões Par de críticos, Crítico bestial e Falha bestial escolhem os dados e viés desses presságios.

- **Contrato da `.game-area`**. Enquanto um presságio toca, o `OverlayDoPresagio` põe `data-omen="crit|fumble|duality"`, `data-kraken` (durante o kraken), `data-storm` (durante a tempestade) ou `data-vampiro="par-de-criticos|critico-bestial|falha-bestial"`. Todos somem quando o presságio acaba.
- A `PointLight` do presságio atende fogo, raio, tempestade, kraken, dualidade e vampiro nessa ordem de prioridade (`fonteDaLuz`). Fogo e raio têm curvas no `Show`. As demais ficam em `domain/luz.ts`. Apagar a luz põe a intensidade em 0.

## Vampiro

`scene/Vampiro.ts` monta a figura procedural comum aos três presságios. No par, `presencaAt` ergue a figura atrás da parede traseira e inclina o tronco sobre a borda com as garras abertas. Para ajustar a pose, preserve a câmera da casca e use o teste de projeção e folga em `tests/vampiroCena.test.ts`. Consulte [NOTAS.md](NOTAS.md#vampiro) para a malha, as curvas da animação e o aquecimento em `Show.compile`.

## Consome
- `arremesso`: `arremesso()`, `useArremesso`, `resultadoPublicado`, `registroDeCorpos` (os corpos dos dados), `omenKinds`, `TRAY`, o tipo `OmenTest`. O `LoopDoArremesso` lê o botão de teste escolhido pela casca (`presagio().omenTest`).
- `mesa`: `ocultarPiso`, `coresDaMesa`. `dados`: `paraRegras`, `sortDice`. `regras`: `omenOf`, `omenKind`, `presagioVampiro`, `MAX_DICE`. `selecao`: `selecao()`, `definir`.
- `src/shared`: `plataforma` (`movimentoReduzido`, `aoMudarMovimentoReduzido`), `math` (`Pose`, `easeOut`, `span`, `clamp01`).

## Fora do escopo
- O voo comum, os números em destaque e o painel do resultado: `vitrine` (ver `src/modules/vitrine/CLAUDE.md`).
- A regra de crítico e falha: `regras`. O visual da mesa: `mesa`. As luzes da casca e o `__dice`: casca.
