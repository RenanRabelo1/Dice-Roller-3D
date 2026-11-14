# Spec: `vitrine`

Pasta: `src/modules/vitrine/`. Extração nº 9.

## CLAUDE.md (formato final)

### Responsabilidade
Mostrar o resultado depois de `settled`. Os dados voam até a frente da câmera com a face sorteada virada para o jogador, o número sobe e pulsa em destaque, a gravação de um dado de forma livre se acende, e o painel mostra o total e o detalhe. Tudo isso espera o presságio terminar.

### Regras de negócio
- Enquanto `pressagios.presagioTocando()`, o relógio da vitrine é reiniciado: o voo só começa depois do presságio.
- Layout:
  - fileiras na frente da câmera, com 5 colunas em paisagem e 3 em retrato, na ordem do resultado;
  - cada dado mostra a face sorteada para a câmera, com o número em pé;
  - usa `raw`, nunca relê o dado;
  - as fileiras com moeda se afastam 0,45 para a legenda.
- Linha do tempo:
  - o número sobe em 550 ms;
  - o voo começa em 1.000 ms, dura 650 ms e é escalonado em 70 ms por dado;
  - depois o número pulsa a 0,9 Hz e "gruda" na face cedo, para nunca aparecerem dois números;
  - a sombra some na decolagem.
- Moeda: voa como os dados e mostra o desenho. "Cara"/"Coroa" fica embaixo.
- Dado com símbolo (Vampiro): sobe o símbolo em vez do número.
- Forma livre:
  - gravada (`readsDown` + `printed`): vista de cima, como na calibração; acende os triângulos de tinta voltados para cima (cone de 60°) no lugar do número solto;
  - sem gravação achada, o número fica na frente do dado, no tamanho `FONT.livre`.
- Os dados com percurso de presságio (`indicesComPercurso`) seguem `movimentoNoPresagio` e não fazem o voo comum.
- Ao pousar, fixa a pose a cada quadro. Informa `vitrineConcluida` um quadro depois de pousar.
- Movimento reduzido: sem voo, e o número só aparece acima do dado. A vitrine conclui na hora.
- Painel: mostra o total (`regras.total`) e o detalhe só quando há resultado e nenhum presságio tocando.
  - Detalhe: o valor de cada dado, e "Cara"/"Coroa" nas moedas.
  - Só moedas: "Cara", "2 caras, 1 coroa".
  - `data-testid="result"`, `aria-live`.

### Expõe
- `vitrineConcluida(throwId) → boolean`: a casca usa para o DPR e o panorama.
- Componentes: `<Vitrine/>` (cena: o voo, o grupo `result-highlights`, o brilho), `<PainelDoResultado/>`.
- `inspecao()`: `showcased`, `highlights`, `inkGlow(i)`.

### Consome
- `arremesso`: `fase`, `resultado`, `throwIdAtual`, `dadoNaCena`, `moverDado`. _(Nomes reais desde a OS-0031/0034: `arremesso()` dá fase, `throwId`, resultado, força e `ready`; `useArremesso(selector)` é o hook; `registroDeCorpos` e `inspecao().corpos()` são os corpos. `fase`, `resultado`, `throwIdAtual` e `corpos` da spec original não existem. `dadoNaCena`, `moverDado` e `envelopeDaMao` nascem na extração da `vitrine`.)_ Também nesta extração: `dados` ganha `definirOpacidade`/`definirSombra`/`rotulos`, e `MaoDoArremesso` (`arremesso`) e o `Hand` da vitrine deixam de procurar `die-i`/`gem-i` pelo nome.
- `pressagios`: `presagioTocando`, `tempoDoPresagio`, `indicesComPercurso`, `movimentoNoPresagio`.
- `dados`: `poliedro`, `simbolo`, `FONT`, `FONT_URL`, `SYMBOL`, `corDaGema`, `corDaTinta`, `tipo`, `rotulos`, `definirSombra`, `inkTriangles`.
- `regras`: `total`.
- `src/shared/plataforma`: `movimentoReduzido`.
- `src/shared/math`.

### Fora do escopo
- O retorno à mão: `arremesso`.
- O efeito do presságio: `pressagios`.
- Os numerais pintados no dado: `dados`.

## Dados de que é dono
- `showcased` (hoje no `useDice`).
- O cache de geometria do brilho por `kind|valor`.

## Origem do código

| De | O quê |
|---|---|
| `src/scene/showcase.ts`, `highlight.ts`, `inkGlow.ts` | tudo. `Pose` e `easeOut` vão para `src/shared/math` |
| `src/scene/Hand.tsx` (o que sobrou dele na OS-0033, inteiro) | a parte `settled`. O percurso do d100 (`164-173`) sai e é substituído por `pressagios.movimentoNoPresagio` (desde a OS-0039 o `Hand.tsx` já chama `indicesComPercurso` e `movimentoNoPresagio`) |
| `src/store.ts:25, 44` | `showcased`, `setShowcased` |
| `src/dice/notation.ts:39-51` | `resultText`: o detalhe fica aqui e o total vem de `regras` |
| `src/ui/Controls.tsx:52-55, 74-76` | `<output data-testid="result">` |

**Pontos de chamada a trocar:**
- a casca (o predicado "entre animações", hoje em `app/Cena.tsx` (era `Stage.tsx:128` e `:148`), vira uma função da casca);
- o test hook (`highlights`, `inkGlow`, `state().showcased`);
- o trecho que procura `gem-i`/`die-i` pelo nome (`Hand.tsx`) passa a pedir a `dados` `definirOpacidade`/`definirSombra`/`rotulos`, criados nessa extração;
- `tests/showcase.test.ts`, `highlight.test.ts` e `inkGlow.test.ts`, que movem para o módulo.
- **Vem do `arremesso` nesta extração (adiado pela OS-0034):** `dadoNaCena(i)`, `moverDado(i, pose)` (só em `settled`, delegando a `apply`) e `envelopeDaMao()`, que a casca passa a usar no enquadramento da câmera (`app/Cena.tsx`). O `arremesso` ainda não os tem porque ninguém os chamava; hoje o `Hand` lê `registroDeCorpos` direto.

## Critérios de aceite da extração
- `src/scene/Hand.tsx` deixa de existir: o resto vai para `arremesso` e para a casca.
- Em `settled`, só a vitrine move os dados.
- O test hook não procura `result-highlights` nem `ink-glow-i` pelo nome, só pela `inspecao()`.
- Os E2E `roll`, `coin`, `import` (voo da forma livre) e `omen` (o resultado depois do presságio) passam.
- O gate completo passa.
