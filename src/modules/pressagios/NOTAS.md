# Notas dos `pressagios`

O detalhe que não cabe no [CLAUDE.md](CLAUDE.md). Leia só quando a ordem mandar. Veio da parte de presságio de `docs/contexto/apresentacao.md`, que saiu na OS-0040; o que é da vitrine (a ordem em `settled`, o voo, os números em destaque) foi para o [NOTAS.md da `vitrine`](../vitrine/NOTAS.md) na OS-0044.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.ts`, `cena.ts` | as portas: `index.ts` puro (estado, regras, movimento, `inspecao`); `cena.ts` com os hooks, `PresagiosNaCena`, `QuebraDaMesa`, `OverlayDoPresagio`, `BotoesDeTeste` e os cacos (`shard`, `shardWood`) |
| `store.ts` | store zustand vanilla: `omen`, `vampiro`, `omenDone`, `omenAt`, `omenRig`, `omenTest`. Decide o presságio em `resultadoPublicado` e o cancela em `aoMudarMovimentoReduzido` |
| `domain/omen.ts` | `OMEN_MS`, `omenMs`, `DUALITY_HIT`, `isD20` |
| `domain/plano.ts` | `planoDoPresagio(omen, dice, vampiro)` dá os efeitos, os índices dos dados e a duração |
| `domain/percurso.ts` | `indicesComPercurso` e `movimentoNoPresagio` calculam os percursos que a vitrine usa |
| `domain/krakenMotion.ts`, `domain/fireMotion.ts`, `domain/vampiroMotion.ts` | o movimento do kraken, da tempestade, do fogo e do vampiro (puros, testados) |
| `domain/omenTest.ts` | `OMEN_TESTS` e `withDiceFor` (os botões de teste) |
| `scene/PresagiosNaCena.tsx`, `Kraken.ts`, `Fire.ts`, `Vampiro.ts`, `QuebraDaMesa.tsx` | o lado 3D e a quebra da mesa |
| `ui/OverlayDoPresagio.tsx`, `ui/presagios.css` | o lado HTML (era `src/ui/OmenOverlay.tsx`; o CSS saiu de `src/index.css`) |
| `ui/BotoesDeTeste.tsx` | os botões de teste (era `src/ui/OmenTests.tsx`) |
| `ui/usePresagio.tsx` | `usePresagio(sel)` e `usePresagioTocando()` |

## Presságios (`domain/omen.ts`)

O d20 (embutido ou importado de base d20 com `omens: true`) e o d100 geram os presságios abaixo.

| | d20 | d100 |
|---|---|---|
| crítico | 20 | 1 (estilo Call of Cthulhu: baixo é bom) |
| falha | 1 | 100 |

`omenOf(dice, results)` (`modules/regras`) → `{ crits: índices, fumbles: índices }` ou `null`. `omenKind` (`modules/regras`): crítico e falha no mesmo arremesso = `duality`.

| Tipo | Efeito | Duração (`OMEN_MS`) |
|---|---|---|
| crit d20 | raio(s) 3D sobre cada d20 (`Bolt` em PresagiosNaCena.tsx) + flash branco HTML | 1300 ms |
| crit d100 | kraken: bandeja quebra, um tentáculo agarra o d100, arremessa para longe, busca de volta e o traz à frente; bandeja se restaura | 6500 ms |
| fumble d20 | fogo: o d20 pega fogo, o fogo se espalha pela bandeja; o d20 vai à frente e **continua queimando até recolher** | 2400 ms |
| fumble d100 | tempestade: tentáculos no mar em volta da bandeja, chuva, trovão, tela balançando; o d100 vem até você | 4600 ms |
| duality | peixes yin-yang colidem (`TaiJi`), tela treme (CSS) | 2600 ms |

`omenMs` escolhe a duração (falha com d20 e d100: a maior). Reduced motion: `publish` não cria presságio; ligar reduced motion durante um cancela (`definirMovimentoReduzido(true)`, de `shared/plataforma`; o store ouve o evento e zera `omen`). `rigOmen` (só via test hook) força o presságio dos próximos arremessos sem alterar a física.

## Lado 3D (`scene/PresagiosNaCena.tsx`)

Que efeito em que dado é `planoDoPresagio(omen, dice)` (`domain/plano.ts`, testado): `raios` (d20 de crítico), `kraken`, `tempestade`, `fogo` e `ms`. O `PresagiosNaCena` e a camada HTML o leem.

A classe `Show` monta `MAX_DICE` instâncias de `Bolt`, um `Kraken`, um `Fire`, um `TaiJi`, um `Vampiro` e uma `PointLight` compartilhada. No primeiro quadro de um presságio lê a posição de pouso dos dados. `frame()` anima por `t = now - omenAt` e devolve o `throwId` uma vez quando `t >= ms`, para `setOmenDone`. O fogo continua nos d20 já na frente até a fase sair de `settled`.

Desempenho (não quebrar):
- `compile()` compila os shaders de todos os efeitos no mount e de novo, com um desenho de aquecimento, quando o `Environment` fica pronto. Evita travada no primeiro presságio.
- Luzes ficam sempre na cena com intensidade 0 fora do efeito: mudar a contagem de luzes recompila o shader de todos os dados.
- Fora de um presságio tudo fica invisível (0 draw calls).

## Kraken (crítico de d100)

- `domain/krakenMotion.ts` (puro, testado): `KRAKEN` = marcos (rupture 450, grab 1150, lift 1750, fling 2050, away 2650, catch 3350, shown 4350, release 5300, restored 6300, duration 6500). `krakenAt(t)` dá `broken/spread/arms/grip/reveal`; `krakenDieAt` dá a pose do d100 (erguido, sacudido, arremessado para `FAR` fora da tela, trazido de volta até a pose do showcase); `fractureCells` quebra o piso em cacos radiais que cobrem o retângulo todo.
- `krakenIndices(omen, dice)`: só d100 críticos, e só se **não** houver falha (dualidade vence).
- `scene/Kraken.ts`: modo `grab` (braço 0 agarra: corpo em Bézier cúbica + hélice enrolada no dado; os outros 9 se debatem; cacos, rachaduras, abismo) e modo `storm` (10 braços saindo do mar em volta da bandeja). Tubos com referenciais de transporte paralelo, ventosas instanciadas.
- `scene/QuebraDaMesa.tsx` chama, a cada quadro, `ocultarPiso(trayBrokenAt(...))` do módulo `mesa`, que esconde `tray-surface` na hora (montado antes da `<MesaNaCena/>`, então vale no mesmo quadro); o `Kraken` desenha os cacos no lugar, com as cores da mesa ativa (`Kraken.start('grab', ..., coresDaMesa())`; ver `src/modules/mesa/CLAUDE.md`). Mesa importada sem piso: o modelo inteiro some.
- O d100 do kraken ou da tempestade **não** faz o voo comum do showcase; o percurso dele é o do presságio (`krakenDieAt` / `stormDieAt`, `STORM` em krakenMotion.ts), e termina na pose comum do resultado. A `Vitrine` (módulo `vitrine`) pergunta ao módulo: `indicesComPercurso(omen, dice)` → `{ kraken, tempestade }` e `movimentoNoPresagio(i, ms, de, para, kraken, tempestade)` → `{ pose, revela, sombra, fim } | null` (`domain/percurso.ts`). `sombra` é até quando o dado projeta sombra (`KRAKEN.grab` ou `STORM.approach`) e `fim` é quando o percurso acaba (`KRAKEN.duration` ou `STORM.duration`); a vitrine não lê `KRAKEN`/`STORM`.

## Fogo (falha de d20)

- `domain/fireMotion.ts` (puro, testado): `fireIndices` (d20 com falha, sem crítico), `fireReach` (raio até o canto mais distante), `fireAt(t, reach)` → `die/radius/tray`.
- `scene/Fire.ts`: chamas como partículas na GPU (um `Points`, shader próprio em forma de língua de fogo) no feltro e em cada d20 aceso, e um plano de feltro queimado com linha de brasa. O objeto chama `fire`; o test hook expõe `burning`.

## Vampiro

- `presagioVampiro` de `regras` decide pelo primeiro 10 no d10 Fome (crítico bestial), pelos dois primeiros 10 no d10 Vampiro (par de críticos) ou pelo primeiro 1 no d10 Fome (falha bestial), nessa ordem. Um presságio de d20 ou d100 tem prioridade.
- `domain/vampiroMotion.ts` usa o relógio de `omenAt` para a cena e o percurso. `VAMPIRO_MS` dá 5.600 ms para o par, 4.600 ms para o crítico bestial e 5.400 ms para a falha bestial. A falha mantém o dado no lugar até o contato da mão no ataque.
- No par, a figura se ergue atrás da parede e depois avança o tronco, com a capa aberta e as garras no ar. O teste usa a câmera padrão para medir a figura nos quatro marcos da presença e verifica a folga de 0,15 unidade da bandeja. `parAt` coordena a revoada da esquerda para a direita a partir de 1.000 ms e o sangue a partir de 2.900 ms. O par de dados fica na pose de pouso até 3.000 ms, chega à pose do resultado em 3.800 ms e usa a revelação da vitrine. A partir de 4.800 ms a figura recua e afunda, e o sangue encolhe.
- `OverlayDoPresagio` anuncia a animação em `role="status"` e junta `.omen-vampiro` a `data-vampiro` em `.game-area`. O crítico bestial tem vinheta vermelha e a falha escurece enquanto as mãos cobrem a visão e traça três rasgos durante o ataque.
- Os botões Par de críticos, Crítico bestial e Falha bestial usam o mesmo viés dos outros testes e garantem dois d10 Vampiro ou um d10 Fome na mão. `window.__dice.state().vampiro` informa o tipo da jogada atual.
- Os três usam a luz compartilhada na cor `#b3122a`, na última prioridade. No par, a luz fica em frente à figura, acima da parede traseira. Recolher, trocar a mão ou ligar movimento reduzido encerra o efeito.
- `vampiroRosto.ts` esculpe o rosto a partir da esfera, usa cores por vértice na pele e traça os sulcos do cabelo. `vampiroMao.ts` gera garras e mãos com nós e tendões, com vértices correspondentes nas duas poses da pegada. `Vampiro.ts` monta as partes agrupadas por material, com o pescoço exposto acima do jabot. O crítico bestial usa uma única malha dupla face, com sete dobras contínuas, forro vermelho e barra ondulada. Na entrega e no ataque, a mão acompanha o dado que a vitrine move. As mãos da falha seguem a câmera e usam a cobertura da linha do tempo.
- `revoadaAt` distribui os morcegos em três alturas, com desvios individuais de posição, rumo, velocidade e fase. As três malhas instanciadas de `Morcegos` usam uma tesselação menor derivada dos mesmos perfis do modelo de detalhe, mantendo a silhueta e as articulações. O módulo usa a capacidade de instâncias nos dois perfis, como o kraken.
- Em `Sangue`, vinte filetes por lateral descem rente à face interna, a partir do lábio contínuo de cada parede. Alguns se unem no topo. Os filetes que alcançam o feltro formam poças achatadas no mesmo lote instanciado dos lábios.
- `Show.compile` aquece a figura, as mãos da câmera, os morcegos e o sangue no mount e com o ambiente pronto. `Show` esconde os efeitos quando o presságio termina ou é interrompido e libera geometrias, materiais e instâncias no descarte.

## Lado HTML (`ui/OverlayDoPresagio.tsx`)

Flash (crítico de d20, `raios` do plano), mar profundo (kraken), calor (fogo, `fogo` do plano), e na tempestade mar escuro, chuva com semente, trovão. Escreve `data-omen`, `data-kraken` e `data-storm` em `.game-area`; o CSS (`ui/presagios.css`, importado pelo próprio componente, que o Vite junta ao CSS da carga inicial depois de `src/index.css`) usa isso para tremer ou balançar o canvas. Anuncia "Crítico!" etc. em `.sr-only` (regra genérica, continua em `src/index.css`) com `role="status"`. O `tests/overlay.test.ts` compara o DOM e os atributos com a fixture capturada do antigo `OmenOverlay`; o `tests/plano.test.ts` prova que ler o plano dá o mesmo flash, calor, kraken e tempestade que o cálculo antigo.

## Test hook (`inspecao`)

`inspecao(cena)` dá à casca (`app/Cena.tsx`) os campos do presságio do `window.__dice`: `omen` (o `omenKind` do presságio, se for do `throwId` atual), `omenDone`, `omenTime` (`performance.now() - omenAt`), `trayBroken` (`tray-surface` invisível), `burning` (`fire` visível) e `shards` (as cores do primeiro caco de `kraken-fragments`). `rigOmen` continua como ação do store.

## Botões de teste das animações (só em `npm run dev`)

`ui/BotoesDeTeste.tsx`, no canto superior esquerdo da mesa, só em desenvolvimento. Raio, Fogo, Kraken, Tempestade, Dualidade, Par de críticos, Crítico bestial e Falha bestial. O escolhido fica ligado (`presagio().omenTest`, gravado por `setOmenTest`) até outro clique e põe na mão os dados de que precisa (`withDiceFor`).

Os próximos arremessos **caem de verdade** no resultado: o `RollRequest` leva `bias`, e `presimulateFor` (`modules/arremesso/domain/presim.ts`) tenta as sementes seguintes até a física real dar aquele presságio (`plays`). Só o giro sorteado muda; mira, força e mão são as do jogador. Cada tentativa custa ~3–8 ms; o worker tem 6 s e a thread principal 3 s (`BIAS_BUDGET`). Sem acerto, o arremesso sai comum e avisa no console. Diferente de `rigOmen` (test hook), que força o presságio sem mudar o resultado.

## Receita: novo presságio

1. Regra em `modules/regras` (`omenOf`, `OmenKind`, `omenKind`) + `src/modules/regras/tests/pressagio.test.ts`; duração em `domain/omen.ts` (`OMEN_MS`, `omenMs`) + `tests/omen.test.ts` (na raiz); o efeito por dado em `domain/plano.ts` + `tests/plano.test.ts`.
2. 3D: nova classe no estilo `Bolt`/`TaiJi` dentro de `Show` (criar no construtor, aquecer em `compile`, esconder em `hide`, liberar em `dispose`). Não adicionar/remover luzes em tempo de execução.
3. HTML: bloco em `ui/OverlayDoPresagio.tsx` + CSS em `ui/presagios.css`; frase em `SAY`. Atualizar a fixture de `tests/overlay.test.ts`.
4. E2E: `e2e/omen.spec.ts` usa `__dice.rigOmen(...)` para forçar o tipo.
