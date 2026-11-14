# Módulo `pressagios`

Duas portas (ADR 0010): `index.ts`, puro e sem React (testes em Node), e `cena.ts`, com os hooks, a cena 3D e a camada HTML. Tipos em `contracts.ts`, regras puras em `domain/` (`omen`, `plano`, `percurso`, `krakenMotion`, `fireMotion`, `omenTest`), o estado em `store.ts`, a cena em `scene/` e o HTML em `ui/` (com `ui/presagios.css`). O detalhe (cada efeito, os marcos do kraken, o fogo, os botões de teste, a receita de presságio novo) está em [NOTAS.md](NOTAS.md): leia só quando a ordem mandar.

## Responsabilidade
Decidir se um resultado publicado tem presságio e mostrá-lo antes do resultado aparecer: o raio no crítico do d20, o kraken no crítico do d100, o fogo na falha do d20, a tempestade na falha do d100 e os peixes yin-yang na dualidade. Inclui o 3D, a camada HTML e o CSS dela, a duração, o relógio compartilhado, a quebra da mesa no kraken e os botões de teste. É dono de: o store do presságio (`omen`, `omenDone`, `omenAt`, `omenRig`, `omenTest`) e os caches de shader dos efeitos (aquecidos pelo `PresagiosNaCena`).

## Regras de negócio
- O presságio é decidido em `resultadoPublicado`, no mesmo tique (ADR 0005): `omenOf(omenKinds(dice), results)`, de `regras`. O relógio `omenAt` é o `performance.now()` da publicação. `rigOmen(omen)` (test hook) força o dos próximos arremessos sem mudar a física; `setOmenTest` (botões de teste) faz a física real cair nele.
- Com movimento reduzido não há presságio, e ligar o movimento reduzido durante um o cancela (`aoMudarMovimentoReduzido`).
- Toca enquanto a fase é `settled`, o presságio é do `throwId` atual e `omenDone !== throwId` (`presagioTocando`). Recolher os dados o encerra, e o resultado aparece na hora.
- Que efeito em que dado sai de uma fonte só, `planoDoPresagio(omen, dice)`: raios nos d20 de um crítico; kraken no d100 crítico sem falha; tempestade no d100 com falha sem crítico; fogo no d20 com falha sem crítico; na dualidade, só os peixes. O 3D e o HTML o leem.
- A busca dos botões de teste no worker (`plays`, em `arremesso/domain/vies.ts`) repete essa escolha, porque `arremesso` não pode importar `pressagios`. Um teste (`tests/plano.test.ts`) garante que as duas concordam.
- Duração (`OMEN_MS`): raio 1.300, kraken 6.500, fogo 2.400, tempestade 4.600, dualidade 2.600 ms (choque em `DUALITY_HIT`, 1.100). Falha com d20 e d100 dura a maior. O CSS usa os mesmos tempos.
- O fogo continua nos d20 depois do fim, até a fase sair de `settled`.
- Kraken: a mesa quebra entre `rupture` (450) e `restored` (6.300) pela regra única `trayBrokenAt`, aplicada pelo `QuebraDaMesa` com `ocultarPiso` de `mesa`; qualquer interrupção a recompõe. Os cacos usam `coresDaMesa()`, com a madeira "iluminada".
- O d100 do kraken e o da tempestade fazem um percurso próprio que termina na pose do resultado. A vitrine pergunta: `indicesComPercurso` e `movimentoNoPresagio` (pose, número revelado, `sombra` e `fim`).
- Desempenho: shaders compilados no mount e de novo quando o ambiente fica pronto; luzes sempre na cena, com intensidade 0 fora do efeito (mudar a contagem recompila todos os dados); nada visível fora de um presságio.
- Acessibilidade: "Crítico!", "Falha crítica!" e "Dualidade: crítico e falha!" num `role="status"`. O DOM do overlay e os atributos de `.game-area` são contrato dos E2E e do CSS (`tests/overlay.test.ts` com a fixture `tests/fixtures/overlay-antes.json`).

## Expõe
- `index.ts`: `presagio()`, `presagioTocando()`, `rigOmen`, `setOmenTest`, `setOmenDone`; `planoDoPresagio`, `indicesComPercurso`, `movimentoNoPresagio`; `OMEN_MS`, `omenMs`, `DUALITY_HIT`, `isD20`, `OMEN_TESTS`; o movimento (`KRAKEN`, `STORM`, `krakenAt`, `krakenDieAt`, `stormAt`, `stormDieAt`, `krakenIndices`, `stormIndices`, `fractureCells`, `trayBrokenAt`, `fireAt`, `fireIndices`, `fireReach`); `inspecao(cena)` → `{ omen, omenDone, omenTime, trayBroken, burning, shards }` (os campos do `window.__dice`).
- Tipos (`contracts.ts`): `EstadoDoPresagio`, `PlanoDoPresagio`, `MovimentoNoPresagio`, `PresagioInspecionado`.
- `cena.ts`: `usePresagio(sel)`, `usePresagioTocando()`; `<PresagiosNaCena/>` (3D, depois da física), `<QuebraDaMesa/>` (logo antes da `<MesaNaCena/>`), `<OverlayDoPresagio gameArea/>` (escreve `data-omen`, `data-kraken` e `data-storm` em `.game-area` e traz o CSS), `<BotoesDeTeste gameArea/>` (o `App` monta só em `DEV`); `SHARD_DEFAULT`, `shard`, `shardWood`.

## Consome
- `arremesso`: `arremesso()`, `useArremesso`, `resultadoPublicado`, `registroDeCorpos` (os corpos dos dados), `omenKinds`, `TRAY`, o tipo `OmenTest`. O `LoopDoArremesso` lê o botão de teste escolhido pela casca (`presagio().omenTest`).
- `mesa`: `ocultarPiso`, `coresDaMesa`. `dados`: `paraRegras`, `sortDice`. `regras`: `omenOf`, `omenKind`, `MAX_DICE`. `selecao`: `selecao()`, `definir`.
- `src/shared`: `plataforma` (`movimentoReduzido`, `aoMudarMovimentoReduzido`), `math` (`Pose`, `easeOut`, `span`, `clamp01`).

## Fora do escopo
- O voo comum, os números em destaque e o painel do resultado: `vitrine` (hoje `src/scene/Hand.tsx`, `ui/Controls.tsx`; ver `docs/contexto/apresentacao.md`).
- A regra de crítico e falha: `regras`. O visual da mesa: `mesa`. As luzes da casca e o `__dice`: casca.
