# Apresentação do resultado: presságios, showcase, destaque

Tudo que acontece em `settled`, depois do `publish`. Arquivos: `dice/omen.ts`, `scene/Omens.tsx`, `scene/Kraken.ts`, `scene/krakenMotion.ts`, `scene/Tray.tsx`, `ui/OmenOverlay.tsx`, `scene/showcase.ts`, `scene/highlight.ts`, parte `settled` de `scene/Hand.tsx`, `ui/Controls.tsx` (painel).

## Ordem em `settled`

```
publish ─► presságio? ──sim──► toca (Omens 3D + OmenOverlay HTML) ─► setOmenDone(throwId)
              │                                                           │
              └──não───────────────────────────────────────────────────────┴─► showcase (voo + números) ─► setShowcased(throwId)
```

- O painel (`Controls`) **espera** o presságio: `waiting = omen.throwId === throwId && omenDone !== throwId`.
- `Hand.tsx` também espera: enquanto `waiting`, reinicia o relógio do showcase (`showcase.current.at = now`).
- Sincronização é toda via store, comparando `throwId`: `omen.throwId`, `omenDone`, `showcased`, `omenAt` (relógio compartilhado, `performance.now()` do publish).

## Presságios (`dice/omen.ts`)

Só d20 e d100 contam:

| | d20 | d100 |
|---|---|---|
| crítico | 20 | 1 (estilo Call of Cthulhu: baixo é bom) |
| falha | 1 | 100 |

`omenOf(dice, results)` → `{ crits: índices, fumbles: índices }` ou `null`. `omenKind`: crítico e falha no mesmo arremesso = `duality`.

| Tipo | Efeito | Duração (`OMEN_MS`) |
|---|---|---|
| crit d20 | raio(s) 3D sobre cada d20 (`Bolt` em Omens.tsx) + flash branco HTML | 1300 ms |
| crit d100 | kraken: bandeja quebra, tentáculos, d100 ascende com asas/halo, bandeja se restaura | 5600 ms |
| fumble | sangue escorrendo (HTML/SVG em OmenOverlay) | 1700 ms |
| duality | peixes yin-yang colidem (`TaiJi`), tela treme (CSS) | 2600 ms |

`omenMs` escolhe a duração. Reduced motion: `publish` não cria presságio; ligar reduced motion durante um cancela (`setReducedMotion`). `rigOmen` (só via test hook) força o presságio dos próximos arremessos sem alterar a física.

## Lado 3D (`scene/Omens.tsx`)

Classe `Show` montada uma vez: `Bolt` ×`MAX_DICE`, um `Kraken`, um `TaiJi`, uma `PointLight`. `frame()` a cada quadro decide se há presságio vivo, inicia na primeira vez (posição dos dados via `bodies`), anima por `t = now - omenAt` e devolve o `throwId` quando `t >= ms` → `setOmenDone`.

Desempenho (não quebrar):
- `compile()` compila os shaders de todos os efeitos no mount e de novo, com um desenho de aquecimento, quando o `Environment` fica pronto. Evita travada no primeiro presságio.
- Luzes ficam sempre na cena com intensidade 0 fora do efeito: mudar a contagem de luzes recompila o shader de todos os dados.
- Fora de um presságio tudo fica invisível (0 draw calls).

## Kraken (crítico de d100)

- `krakenMotion.ts` (puro, testado): `KRAKEN` = marcos da linha do tempo (rupture 450, launch 1450, reveal 2600, repair 4200, restored 5400, duration 5600). `krakenAt(t)` dá `broken/spread/arms/halo/hero`; `krakenFlightAt` dá a pose do d100 (arco até a câmera, segura, volta à pose final do showcase); `krakenHeroPoses` amplia o showcase para o "close"; `fractureCells` quebra o piso em cacos radiais que cobrem o retângulo todo.
- `krakenIndices(omen, dice)`: só d100 críticos, e só se **não** houver falha (dualidade vence).
- `Kraken.ts`: geometria (10 braços, ventosas e lascas instanciadas, cacos do piso, rachaduras, abismo, asas, raios).
- `Tray.tsx` esconde `tray-surface` enquanto `krakenAt(t).broken`; o `Kraken` desenha os cacos no lugar.
- O d100 crítico **não** faz o voo comum do showcase; o voo dele é o da ascensão.

## Lado HTML (`ui/OmenOverlay.tsx`)

Sangue (manchas SVG com semente + gotas), flash, vinheta do mar profundo/céu. Escreve `data-omen` e `data-kraken` em `.game-area`; o CSS (`src/index.css`) usa isso para tremer o canvas. Anuncia "Crítico!" etc. em `.sr-only` com `role="status"`.

## Showcase (`scene/showcase.ts` + `Hand.tsx`)

`showcasePoses(polys, raw, view)`: fileira(s) na frente da câmera (5 colunas em paisagem, 3 em retrato), na ordem do resultado, cada dado girado para a face sorteada olhar a câmera com o número em pé. Usa `raw` (valor físico), nunca relê o dado.

Em `Hand.tsx`, ao entrar em `settled`:
- monta `from` (pose atual), `to` (showcase), `hero` (kraken) e `marks` (onde fica o numeral sorteado no espaço do dado);
- anima por `SHOW` (`highlight.ts`): número sobe 550 ms, voo começa em 1000 ms, dura 650 ms, escalonado 70 ms por dado;
- a sombra do dado some quando ele decola;
- **moeda não voa**: fica na bandeja, só o texto "Cara"/"Coroa" sobe;
- dado com símbolo (Vampiro) sobe o símbolo (`symbolGeometry`) em vez do número;
- ao pousar, fixa a pose exata a cada quadro; reporta `setShowcased` um quadro depois de pousar;
- reduced motion: sem voo, o número só aparece acima do dado.

## Destaque (`scene/highlight.ts`)

`highlightAt(ms, i, start, face, faceScale)` → posição/opacidade/escala/brilho do número flutuante. O número "gruda" na face cedo no voo para nunca aparecerem dois números. Depois pulsa (0,9 Hz). Os números são `Text` do troika num grupo `result-highlights`, `depthTest: false`, `renderOrder` 20 — sempre por cima.

## Receita: novo presságio

1. Regra e duração em `dice/omen.ts` (`omenOf`, `OmenKind`, `OMEN_MS`, `omenMs`) + `tests/omen.test.ts`.
2. 3D: nova classe no estilo `Bolt`/`TaiJi` dentro de `Show` (criar no construtor, aquecer em `compile`, esconder em `hide`, liberar em `dispose`). Não adicionar/remover luzes em tempo de execução.
3. HTML: bloco em `OmenOverlay.tsx` + CSS; frase em `SAY`.
4. E2E: `e2e/omen.spec.ts` usa `__dice.rigOmen(...)` para forçar o tipo.
