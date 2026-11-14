# Apresentação do resultado: presságios, showcase, destaque

Tudo que acontece em `settled`, depois do `publish`. Arquivos: o módulo `modules/pressagios` (o estado em `store.ts`, `domain/omen.ts`, `domain/omenTest.ts`, `domain/krakenMotion.ts`, `domain/fireMotion.ts`, `domain/plano.ts`, `domain/percurso.ts`; a cena em `scene/PresagiosNaCena.tsx`, `scene/Kraken.ts`, `scene/Fire.ts`, `scene/QuebraDaMesa.tsx`, pelo `cena.ts`), `ui/OmenOverlay.tsx`, `scene/showcase.ts`, `scene/highlight.ts`, `scene/Hand.tsx` (só a parte `settled`; a mão do arremesso é a `MaoDoArremesso` do módulo `arremesso`, montada logo antes), `ui/Controls.tsx` (painel).

## Ordem em `settled`

```
publish ─► presságio? ──sim──► toca (PresagiosNaCena 3D + OmenOverlay HTML) ─► setOmenDone(throwId)
              │                                                           │
              └──não───────────────────────────────────────────────────────┴─► showcase (voo + números) ─► setShowcased(throwId)
```

- O painel (`Controls`) **espera** o presságio: `presagioTocando()` (`modules/pressagios`; o hook é `usePresagioTocando`, em `cena.ts`) = fase `settled`, presságio deste `throwId` e `omenDone !== throwId`. Recolher os dados encerra o presságio e o resultado aparece na hora.
- `Hand.tsx` também espera: enquanto `presagioTocando()`, reinicia o relógio do showcase (`showcase.current.at = now`).
- Sincronização é toda via store (`presagio()` do módulo `pressagios`, `showcased` no `useDice` legado), comparando `throwId`: `omen.throwId`, `omenDone`, `showcased`, `omenAt` (relógio compartilhado, `performance.now()` do publish).

## Presságios (`modules/pressagios/domain/omen.ts`)

Só d20 (embutido, ou importado de base d20 com `omens: true`: `isD20`) e d100 contam:

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

## Lado 3D (`modules/pressagios/scene/PresagiosNaCena.tsx`)

Que efeito em que dado é `planoDoPresagio(omen, dice)` (`domain/plano.ts`, testado): `raios` (d20 de crítico), `kraken`, `tempestade`, `fogo` e `ms`. O `PresagiosNaCena` e a camada HTML (`kraken`/`storm`) o leem.

Classe `Show` montada uma vez: `Bolt` ×`MAX_DICE`, um `Kraken`, um `Fire`, um `TaiJi`, uma `PointLight` (dividida entre raio e fogo, que nunca tocam juntos). `frame()` a cada quadro decide se há presságio vivo, inicia na primeira vez (posição dos dados via `bodies`), anima por `t = now - omenAt` e devolve o `throwId` uma vez quando `t >= ms` → `setOmenDone`. O fogo continua depois disso, nos d20 já na frente, até a fase sair de `settled`.

Desempenho (não quebrar):
- `compile()` compila os shaders de todos os efeitos no mount e de novo, com um desenho de aquecimento, quando o `Environment` fica pronto. Evita travada no primeiro presságio.
- Luzes ficam sempre na cena com intensidade 0 fora do efeito: mudar a contagem de luzes recompila o shader de todos os dados.
- Fora de um presságio tudo fica invisível (0 draw calls).

## Kraken (crítico de d100)

- `modules/pressagios/domain/krakenMotion.ts` (puro, testado): `KRAKEN` = marcos (rupture 450, grab 1150, lift 1750, fling 2050, away 2650, catch 3350, shown 4350, release 5300, restored 6300, duration 6500). `krakenAt(t)` dá `broken/spread/arms/grip/reveal`; `krakenDieAt` dá a pose do d100 (erguido, sacudido, arremessado para `FAR` fora da tela, trazido de volta até a pose do showcase); `fractureCells` quebra o piso em cacos radiais que cobrem o retângulo todo.
- `krakenIndices(omen, dice)`: só d100 críticos, e só se **não** houver falha (dualidade vence).
- `scene/Kraken.ts`: modo `grab` (braço 0 agarra: corpo em Bézier cúbica + hélice enrolada no dado; os outros 9 se debatem; cacos, rachaduras, abismo) e modo `storm` (10 braços saindo do mar em volta da bandeja). Tubos com referenciais de transporte paralelo, ventosas instanciadas.
- `scene/QuebraDaMesa.tsx` chama, a cada quadro, `ocultarPiso(trayBrokenAt(...))` do módulo `mesa`, que esconde `tray-surface` na hora (montado antes da `<MesaNaCena/>`, então vale no mesmo quadro); o `Kraken` desenha os cacos no lugar, com as cores da mesa ativa (`Kraken.start('grab', ..., coresDaMesa())`; ver `src/modules/mesa/CLAUDE.md`). Mesa importada sem piso: o modelo inteiro some.
- O d100 do kraken ou da tempestade **não** faz o voo comum do showcase; o percurso dele é o do presságio (`krakenDieAt` / `stormDieAt`, `STORM` em krakenMotion.ts), e termina na pose comum do resultado. O `Hand.tsx` pergunta ao módulo: `indicesComPercurso(omen, dice)` → `{ kraken, tempestade }` e `movimentoNoPresagio(i, ms, de, para, kraken, tempestade)` → `{ pose, revela } | null` (`domain/percurso.ts`).

## Fogo (falha de d20)

- `modules/pressagios/domain/fireMotion.ts` (puro, testado): `fireIndices` (d20 com falha, sem crítico), `fireReach` (raio até o canto mais distante), `fireAt(t, reach)` → `die/radius/tray`.
- `scene/Fire.ts`: chamas como partículas na GPU (um `Points`, shader próprio em forma de língua de fogo) no feltro e em cada d20 aceso, e um plano de feltro queimado com linha de brasa. O objeto chama `fire`; o test hook expõe `burning`.

## Lado HTML (`ui/OmenOverlay.tsx`)

Flash (crítico de d20), mar profundo (kraken), calor (fogo), e na tempestade mar escuro, chuva com semente, trovão. Escreve `data-omen`, `data-kraken` e `data-storm` em `.game-area`; o CSS (`src/index.css`) usa isso para tremer ou balançar o canvas. Anuncia "Crítico!" etc. em `.sr-only` com `role="status"`.

## Showcase (`scene/showcase.ts` + `Hand.tsx`)

`showcasePoses(polys, raw, view)`: fileira(s) na frente da câmera (5 colunas em paisagem, 3 em retrato), na ordem do resultado, cada dado girado para a face sorteada olhar a câmera com o número em pé. Usa `raw` (valor físico), nunca relê o dado.

Em `Hand.tsx`, ao entrar em `settled`:
- monta `from` (pose atual), `to` (showcase), os índices do kraken/tempestade e `marks` (onde fica o numeral sorteado no espaço do dado);
- anima por `SHOW` (`highlight.ts`): número sobe 550 ms, voo começa em 1000 ms, dura 650 ms, escalonado 70 ms por dado;
- a sombra do dado some quando ele decola;
- **moeda** voa como os dados e mostra o desenho; o texto "Cara"/"Coroa" fica **embaixo** dela (`CAPTION` em showcase.ts), e as fileiras com moeda se afastam para o texto não encostar na de baixo;
- dado com símbolo (Vampiro) sobe o símbolo (`symbolGeometry`) em vez do número;
- ao pousar, fixa a pose exata a cada quadro; reporta `setShowcased` um quadro depois de pousar;
- **dado de forma livre gravado** (`readsDown` + `printed`): vista de cima, como na calibração (`showcasePoses(..., above)`); a gravação de cima acende (`inkGlow.ts`: `upInk` escolhe os triângulos de tinta voltados para cima, `glowMesh` monta a malha `ink-glow-i`, que pulsa no ritmo do destaque) no lugar do número solto; sem gravação achada, o número fica na frente do dado, no tamanho `FONT.livre`. A geometria do brilho fica guardada por `kind|valor`;
- reduced motion: sem voo, o número só aparece acima do dado.

## Destaque (`scene/highlight.ts`)

`highlightAt(ms, i, start, face, faceScale)` → posição/opacidade/escala/brilho do número flutuante. O número "gruda" na face cedo no voo para nunca aparecerem dois números. Depois pulsa (0,9 Hz). Os números são `Text` do troika num grupo `result-highlights`, `depthTest: false`, `renderOrder` 20 — sempre por cima.

## Botões de teste das animações (só em `npm run dev`)

`ui/OmenTests.tsx`, no canto superior esquerdo da mesa (some no build de produção: `import.meta.env.DEV`). Raio, Fogo, Kraken, Tempestade e Dualidade. O escolhido fica ligado (`presagio().omenTest`, gravado por `setOmenTest`) até ser clicado de novo e põe na mão os dados que precisa (`withDiceFor` em `modules/pressagios/domain/omenTest.ts`).

Os próximos arremessos **caem de verdade** no resultado: o `RollRequest` leva `bias`, e `presimulateFor` (`modules/arremesso/domain/presim.ts`) tenta as sementes seguintes até a física real dar aquele presságio (`plays`). Só o giro sorteado muda; mira, força e mão são as do jogador. Cada tentativa custa ~3–8 ms; o worker tem 6 s e a thread principal 3 s (`BIAS_BUDGET`). Sem acerto, o arremesso sai comum e avisa no console. Diferente de `rigOmen` (test hook), que força o presságio sem mudar o resultado.

## Receita: novo presságio

1. Regra em `modules/regras` (`omenOf`, `OmenKind`, `omenKind`) + `src/modules/regras/tests/pressagio.test.ts`; duração em `modules/pressagios/domain/omen.ts` (`OMEN_MS`, `omenMs`) + `tests/omen.test.ts`.
2. 3D: nova classe no estilo `Bolt`/`TaiJi` dentro de `Show` (criar no construtor, aquecer em `compile`, esconder em `hide`, liberar em `dispose`). Não adicionar/remover luzes em tempo de execução.
3. HTML: bloco em `OmenOverlay.tsx` + CSS; frase em `SAY`.
4. E2E: `e2e/omen.spec.ts` usa `__dice.rigOmen(...)` para forçar o tipo.
