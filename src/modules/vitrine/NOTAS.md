# Notas da `vitrine`

O detalhe que não cabe no [CLAUDE.md](CLAUDE.md). Leia só quando a ordem mandar. Veio da parte da vitrine de `docs/contexto/apresentacao.md`, que saiu na OS-0044; a parte de presságio já tinha ido para o [NOTAS.md dos `pressagios`](../pressagios/NOTAS.md) na OS-0040.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.ts`, `cena.ts` | as portas: `index.ts` puro (estado, regras, `inspecao`); `cena.ts` com `useVitrine`, `Vitrine` e `PainelDoResultado` |
| `store.ts` | store zustand vanilla: `showcased`; lido por `vitrine()`, `vitrineConcluida(throwId)` e `useVitrine` |
| `domain/showcase.ts` | `showcasePoses`, `CAPTION`: onde cada dado pousa na frente da câmera |
| `domain/highlight.ts` | `highlightAt`, `SHOW`, `HL_SIZE`: o número flutuante |
| `domain/inkGlow.ts` | `upInk`, `glowMesh`, `UP_INK`: a gravação acesa e o cache da geometria por `kind\|valor` |
| `domain/painel.ts` | `resultText`: o texto do painel |
| `scene/Vitrine.tsx` | a cena (era `src/scene/Hand.tsx`, só a parte `settled`; a mão do arremesso é a `MaoDoArremesso` de `arremesso`, montada logo antes) |
| `ui/PainelDoResultado.tsx`, `ui/useVitrine.tsx` | o painel (`<output data-testid="result">`, montado pelo `Painel` da casca, `src/app/Painel.tsx`) e o hook |

## Ordem em `settled`

```
publish ─► presságio? ──sim──► toca (PresagiosNaCena 3D + OverlayDoPresagio HTML) ─► setOmenDone(throwId)
              │                                                           │
              └──não───────────────────────────────────────────────────────┴─► vitrine (voo + números) ─► setShowcased(throwId)
```

- O painel (`<PainelDoResultado/>`) **espera** o presságio: `presagioTocando()` (`pressagios`; o hook é `usePresagioTocando`, em `cena.ts`) = fase `settled`, presságio deste `throwId` e `omenDone !== throwId`. Recolher os dados encerra o presságio e o resultado aparece na hora.
- A `Vitrine` também espera: enquanto `presagioTocando()`, reinicia o relógio da vitrine (`showcase.current.at = now`).
- A sincronização é toda via store (`presagio()` de `pressagios`, `vitrine()` daqui), comparando `throwId`: `omen.throwId`, `omenDone`, `showcased`, `omenAt` (relógio compartilhado, o `performance.now()` do publish).

## O voo (`domain/showcase.ts` + `scene/Vitrine.tsx`)

`showcasePoses(polys, raw, view, above?)`: fileira(s) na frente da câmera (5 colunas em paisagem, 3 em retrato), na ordem do resultado, cada dado girado para a face sorteada olhar a câmera com o número em pé. Usa `raw` (valor físico), nunca relê o dado.

Na `Vitrine`, ao entrar em `settled`:
- monta `from` (pose atual), `to` (a vitrine), os índices do kraken e da tempestade e `marks` (onde fica o numeral sorteado no espaço do dado);
- o d100 do kraken ou da tempestade faz o percurso do presságio, não o voo: `indicesComPercurso` e `movimentoNoPresagio` (pose, número revelado, até quando tem sombra e quando acaba), de `pressagios`;
- anima por `SHOW` (`highlight.ts`): o número sobe em 550 ms, o voo começa em 1.000 ms, dura 650 ms, escalonado 70 ms por dado;
- a sombra do dado some quando ele decola (`sombraNaGema`, de `dados`);
- **moeda** voa como os dados e mostra o desenho; o texto "Cara"/"Coroa" fica **embaixo** dela (`CAPTION`), e as fileiras com moeda se afastam para o texto não encostar na de baixo;
- dado com símbolo (Vampiro) sobe o símbolo (`symbolGeometry`) em vez do número;
- a pose vai por `moverDado` (de `arremesso`, o único que escreve pose em `settled`); ao pousar, fixa a pose exata a cada quadro e grava `setShowcased` um quadro depois de pousar;
- **dado de forma livre gravado** (`readsDown` + `printed`): vista de cima, como na calibração (`showcasePoses(..., above)`); a gravação de cima acende (`upInk` escolhe os triângulos de tinta voltados para cima, `glowMesh` monta a malha `ink-glow-i`, que pulsa no ritmo do destaque) no lugar do número solto; sem gravação achada, o número fica na frente do dado, no tamanho `FONT.livre`. A geometria do brilho fica guardada por `kind|valor`;
- movimento reduzido: sem voo, o número só aparece acima do dado, e `setShowcased` sai na hora. Ligá-lo no meio do voo devolve os dados para onde pousaram.

## Destaque (`domain/highlight.ts`)

`highlightAt(ms, i, start, face, faceScale)` → posição, opacidade, escala e brilho do número flutuante. O número "gruda" na face cedo no voo para nunca aparecerem dois números. Depois pulsa (0,9 Hz). Os números são `Text` do troika num grupo `result-highlights`, `depthTest: false`, `renderOrder` 20: sempre por cima.

## Test hook (`inspecao`)

`inspecao(cena)` dá à casca (`app/Cena.tsx`) os campos da vitrine do `window.__dice`: `highlights()` (os filhos de `result-highlights`: `text`, nulo num símbolo, `visible` e `position`) e `inkGlow(i)` (`ink-glow-i`: `visible`, `triangles` e `opacity`, ou nulo). `showcased` vem de `vitrine()`.
