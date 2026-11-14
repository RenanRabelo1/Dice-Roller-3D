# Apresentação do resultado: showcase, destaque

Tudo que acontece em `settled`, depois do `publish`, e ainda não foi extraído (a futura `vitrine`). Arquivos: `scene/showcase.ts`, `scene/highlight.ts`, `scene/Hand.tsx` (só a parte `settled`; a mão do arremesso é a `MaoDoArremesso` do módulo `arremesso`, montada logo antes), `ui/Controls.tsx` (painel).

**Presságios** (raio, kraken, fogo, tempestade, dualidade; o 3D, a camada HTML e o CSS dela, os botões de teste): o módulo `pressagios`, em [src/modules/pressagios/CLAUDE.md](../../src/modules/pressagios/CLAUDE.md), com o detalhe em [NOTAS.md](../../src/modules/pressagios/NOTAS.md).

## Ordem em `settled`

```
publish ─► presságio? ──sim──► toca (PresagiosNaCena 3D + OverlayDoPresagio HTML) ─► setOmenDone(throwId)
              │                                                           │
              └──não───────────────────────────────────────────────────────┴─► showcase (voo + números) ─► setShowcased(throwId)
```

- O painel (`Controls`) **espera** o presságio: `presagioTocando()` (`modules/pressagios`; o hook é `usePresagioTocando`, em `cena.ts`) = fase `settled`, presságio deste `throwId` e `omenDone !== throwId`. Recolher os dados encerra o presságio e o resultado aparece na hora.
- `Hand.tsx` também espera: enquanto `presagioTocando()`, reinicia o relógio do showcase (`showcase.current.at = now`).
- Sincronização é toda via store (`presagio()` do módulo `pressagios`, `showcased` no `useDice` legado), comparando `throwId`: `omen.throwId`, `omenDone`, `showcased`, `omenAt` (relógio compartilhado, `performance.now()` do publish).

## Showcase (`scene/showcase.ts` + `Hand.tsx`)

`showcasePoses(polys, raw, view)`: fileira(s) na frente da câmera (5 colunas em paisagem, 3 em retrato), na ordem do resultado, cada dado girado para a face sorteada olhar a câmera com o número em pé. Usa `raw` (valor físico), nunca relê o dado.

Em `Hand.tsx`, ao entrar em `settled`:
- monta `from` (pose atual), `to` (showcase), os índices do kraken/tempestade e `marks` (onde fica o numeral sorteado no espaço do dado);
- o d100 do kraken ou da tempestade faz o percurso do presságio, não o voo: `indicesComPercurso` e `movimentoNoPresagio` (pose, número revelado, até quando tem sombra e quando acaba), de `pressagios`;
- anima por `SHOW` (`highlight.ts`): número sobe 550 ms, voo começa em 1000 ms, dura 650 ms, escalonado 70 ms por dado;
- a sombra do dado some quando ele decola;
- **moeda** voa como os dados e mostra o desenho; o texto "Cara"/"Coroa" fica **embaixo** dela (`CAPTION` em showcase.ts), e as fileiras com moeda se afastam para o texto não encostar na de baixo;
- dado com símbolo (Vampiro) sobe o símbolo (`symbolGeometry`) em vez do número;
- ao pousar, fixa a pose exata a cada quadro; reporta `setShowcased` um quadro depois de pousar;
- **dado de forma livre gravado** (`readsDown` + `printed`): vista de cima, como na calibração (`showcasePoses(..., above)`); a gravação de cima acende (`inkGlow.ts`: `upInk` escolhe os triângulos de tinta voltados para cima, `glowMesh` monta a malha `ink-glow-i`, que pulsa no ritmo do destaque) no lugar do número solto; sem gravação achada, o número fica na frente do dado, no tamanho `FONT.livre`. A geometria do brilho fica guardada por `kind|valor`;
- reduced motion: sem voo, o número só aparece acima do dado.

## Destaque (`scene/highlight.ts`)

`highlightAt(ms, i, start, face, faceScale)` → posição/opacidade/escala/brilho do número flutuante. O número "gruda" na face cedo no voo para nunca aparecerem dois números. Depois pulsa (0,9 Hz). Os números são `Text` do troika num grupo `result-highlights`, `depthTest: false`, `renderOrder` 20 — sempre por cima.
