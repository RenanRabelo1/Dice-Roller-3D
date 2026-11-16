# HUD imersivo: Fantasma + Grimório

> **Concluído na OS-0055** (parte 1). Conferência de contraste: nenhum token foi trocado, todos os pares passam (faixas 8,1 a 13,4:1; páginas 5,5 a 10,8:1; `#f6ecd6` sobre `--lacre` 8,6:1). Único ajuste: o rótulo pequeno do resultado (`output span`) passou de `--nevoa` para `--luz`, porque sobre o fundo "Pôquer" (o mais claro) `--nevoa` dava 3,5:1 e `--luz` dá 4,6:1.

Spec da refatoração visual (item 4 do [backlog](backlog.md)). A direção foi escolhida pelo João em 2026-11-16, entre seis protótipos do canvas "HUD imersivo" (o 6º, "Fantasma + Grimório", montado sobre capturas da cena 3D real). Esta página é o plano: o que muda, as decisões e a ordem das ordens de serviço. São duas partes. A **parte 1** (OS-0051 a OS-0055) monta o HUD. A **parte 2** (OS-0056 a OS-0061, [abaixo](#parte-2-a-cena-viva)) dá movimento, reação ao jogo e luz. O detalhe de cada entrega está nas ordens, em [ordens/](ordens/).

## A ideia

O jogo já é imersivo onde é 3D: os dados, a bandeja e os presságios. O HUD de hoje parece um painel de software (botões em fileira no topo, resultado e dica num rodapé), e isso quebra o clima. A proposta tem duas camadas:

1. **Jogando: o Fantasma.** O HUD quase some. Duas faixas pretas de cinema emolduram a cena, com uma vinheta nas bordas. O resultado aparece como legenda de filme sobre a cena. Os dados ficam numa roda que abre junto do botão da mão.
2. **Configurando: o Grimório.** Mesa, Meus dados, Importar dado e Chat viram capítulos de um livro que abre sobre a cena. Um capítulo por vez, em página dupla de pergaminho.

Na parte 1, nada muda na cena 3D, na física, no desempenho ou nas regras: é só a camada HTML/CSS e a forma como a casca compõe os painéis. A parte 2 toca na cena só para acender luzes, dentro das regras de [armadilhas.md](contexto/armadilhas.md).

## Decisões

| # | Decisão | Por quê |
|---|---|---|
| 1 | **A casca é dona de qual capítulo está aberto** (`capitulo: 'mesa' \| 'meus' \| 'importar' \| 'chat' \| null`, em `src/app/Painel.tsx`). Os painéis dos módulos viram componentes controlados: recebem `aberto` e callbacks. | Um capítulo por vez exige um estado só. Abrir e fechar painéis é composição, e a composição já é da casca (decisão 6 do [mapa](mapa-modulos.md)). Nenhum módulo passa a ler o estado de outro. |
| 2 | **Os botões de abrir saem dos módulos e vão para a barra de cima da casca**, com os mesmos nomes acessíveis e a classe `chat-toggle` (os E2E acham "Mesa" por ela). | Uma navegação só, no topo. |
| 3 | **Os atalhos continuam nos módulos:** M na `mesa`, C na `selecao`, D (roda) na `selecao`. O módulo chama `onAlternar()` em vez de mudar estado próprio. | Mudança mínima; o filtro "não dispara digitando num campo" já está lá e testado. |
| 4 | **Foco:** fechar com Esc ou com o × devolve o foco ao botão do capítulo na barra (`onFechar`). Fechar com o próprio atalho não move o foco (`onAlternar`). | É o comportamento de hoje (`e2e/controls.spec.ts`). |
| 5 | **A roda de dados é da `selecao`** e mostra os 11 tipos embutidos. Os dados importados ficam no capítulo Meus dados e no chat (apelido). Começa aberta; a tecla D e o botão da mão a recolhem. Sem lembrar entre sessões. | Os importados têm tinta e exclusão, que são da `meus-dados`. Aberta por padrão para ninguém procurar os dados (e os E2E clicam em "Adicionar d6"). |
| 6 | **O número do resultado continua em algarismos** ("13", não "Treze"). | Os E2E e os leitores de tela leem o total. O número por extenso vai para o backlog. |
| 7 | **As fontes são empacotadas, não do Google Fonts.** `@fontsource` com subconjunto latino, importado no `main.tsx`. | O jogo funciona sem rede. |
| 8 | **Sem ADR.** | Não muda fronteira, regra nem `shared/`. O item 6 do mapa ganha uma linha na OS-0055. |
| 9 | **O 🗑 vira o texto "Excluir"**, nas mesas salvas e em Meus dados. O `aria-label` ("Excluir …") não muda. | Emoji destoa do livro. |

## Linguagem visual

### Tokens (em `:root`, `src/index.css`)

| Token | Valor | Uso |
|---|---|---|
| `--barra` | `#050506` | faixas de cima e de baixo |
| `--nevoa` | `#d6d1c6` | texto das faixas |
| `--luz` | `#f2efe8` | texto ativo, linha de força, legenda do resultado |
| `--apagado` | `#a9a397` | dica e opções não marcadas nas faixas |
| `--couro` / `--couro-brilho` | `#2c130c` / `#5a2a1c` | capa do livro (gradiente do brilho para a borda) |
| `--pergaminho-claro` / `--pergaminho-escuro` | `#f1e2c0` / `#e6d0a2` | páginas (gradiente) |
| `--tinta` | `#2b1d14` | texto das páginas |
| `--lacre` | `#7a2318` | botão marcado ou principal; texto `#f6ecd6` sobre ele |
| `--rubrica` | `#8e2a1c` | legendas, capitular, ornamento |
| `--sepia` | `#5e4a36` | texto pequeno e dicas nas páginas (`#6e5a44` do protótipo falha em 4,5:1 sobre `#e6d0a2`) |
| `--fio` | `#b99a66` | bordas dentro do livro |

Os tokens atuais (`--chalk`, `--brass`, `--panel`…) continuam para o que não mudar.

### Tipografia

| Família | Pesos | Onde |
|---|---|---|
| Bricolage Grotesque (já existe) | 400, 800 | faixas: título, links, dica, rolagem |
| Cormorant Garamond | 600 itálico | legenda do resultado e texto da mão |
| Cinzel | 700 | títulos de capítulo e legendas (`legend`) do livro |
| EB Garamond | 400, 400 itálico, 600 | corpo do livro, campos e botões nas páginas |

Pacotes: `@fontsource/cormorant-garamond`, `@fontsource/cinzel`, `@fontsource/eb-garamond`, versão exata no `package.json` (sem `^`), importando só os CSS `latin-<peso>.css` / `latin-<peso>-italic.css` usados.

### Layout (≥ 801 px)

```
┌──────────────────────────── faixa de cima, 64 px, --barra ───────────────────────────┐
│ ROLADOR DE DADOS                     Mesa M · Meus dados · Importar dado · Chat C     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                cena 3D + vinheta                       ╭ roda ╮       │
│                                                                        │ dados│       │
│                              13 (legenda)                              ╰──────╯       │
│                         D20 7 · D20 2 · D6 4                                         │
├──────── linha de força (2 px, só carregando) ────────────────────────────────────────┤
│ Relativa  Estática       Mire com o mouse e segure…            2d20 + 1d6  D         │
└──────────────────────────── faixa de baixo, 72 px, --barra ──────────────────────────┘
```

- **Rolagem fica à esquerda,** na faixa de baixo. O E2E `roll.spec.ts` exige o grupo no terço esquerdo e no quarto de baixo da tela.
- **O livro** abre centrado entre as faixas, com até 1120 × 680 px. A cena por trás escurece (`rgba(5,5,6,.55)`). A capa é de couro com filete dourado, e as páginas têm a sombra da lombada no meio.
- **Até 800 px:**
  - A faixa de cima tem o título numa linha e os 4 botões em outra, sem `kbd`.
  - A faixa de baixo tem Rolagem e o botão da mão numa linha e a dica embaixo.
  - A roda é centrada acima da faixa.
  - O livro ocupa a tela inteira, numa página só, com rolagem.

Os quadros de referência estão no canvas "HUD imersivo", coluna "6 · Fantasma + Grimório" (jogando e livro aberto). As cores e as medidas desta página prevalecem sobre o canvas.

## Ordens

Uma por módulo, cada uma deixando o gate verde. A casca entra quando a ordem a lista.

| Ordem | Módulo | Entrega |
|---|---|---|
| [OS-0051](ordens/0051-casca-fundacao-visual.md) | casca | fontes, tokens, faixas de cinema, legenda do resultado, linha de força, vinheta |
| [OS-0052](ordens/0052-selecao-roda-e-chat-no-livro.md) | selecao (+ casca) | roda de dados, chat controlado, o livro com o 1º capítulo |
| [OS-0053](ordens/0053-mesa-capitulo-do-livro.md) | mesa (+ casca) | painel da mesa como capítulo |
| [OS-0054](ordens/0054-meus-dados-capitulos-do-livro.md) | meus-dados (+ casca) | Meus dados e Importar dado como capítulos, correções do assistente |
| [OS-0055](ordens/0055-casca-acabamento-e-aceite.md) | casca + `e2e/` | celular, movimento reduzido, contraste, E2E, docs, gate completo |

Os devs não rodam E2E. O orquestrador roda o E2E completo no fim, na OS-0055, um spec por vez.

## Fora desta spec

- **Fundo padrão da mesa.** Na cena real, o tema padrão é uma bandeja sobre cor lisa quase preta, e isso também tira imersão. Trocar o padrão (por exemplo, para o tema Taverna) é decisão do João e vira ordem própria da `mesa`.
- **A pose de calibração da forma livre** (item 4 do backlog: mostrar o dado pousado no chão e destacar a face de cima). É mudança na prévia 3D, fica no backlog.
- **Total por extenso** e **histórico na tela** (a "Crônica" do protótipo). Funções novas, não entram no backlog sem pedido.
- **Os dados importados na roda.**
- **Som.** O jogo não tem áudio. Seria uma frente própria (sons gravados ou gerados, volume, mudo), com módulo a definir.

---

# Parte 2: a cena viva

A parte 1 dá a estrutura. A parte 2 faz o HUD e a cena **respirarem com o jogo**: movimento com ritmo de cinema, reação a cada fase e a cada presságio, e luz que responde ao que acontece na mesa. Ela começa depois da OS-0055 aceita.

## Arquitetura: quem é dono de quê

Tudo cabe no monólito modular, sem módulo novo, sem item novo em `shared/` e sem evento novo. Cada reação lê um sinal que já tem dono, pela porta do dono:

| Sinal | Dono | Como a casca ou o módulo lê |
|---|---|---|
| fase do gesto (`hand`, `charging`, `rolling`, `settled`, `returning`) | `arremesso` | `useArremesso` (`cena.ts`), como o `Painel` já faz. A casca escreve `data-fase` no `.app`. |
| força da carga (0 a 1) | `arremesso` | `assinarArremesso` (`index.ts`), sem render. A casca escreve `--forca` no `.app`. |
| presságio tocando | `pressagios` | os atributos `data-omen`, `data-kraken` e `data-storm` que o `OverlayDoPresagio` já põe na `.game-area`. A OS-0059 os registra como contrato público. |
| presságio do resultado mostrado | `vitrine` | `data-presagio` no `output` do resultado (OS-0060). A vitrine já consome o `presagio()`. |
| movimento reduzido | `shared/plataforma` | `useMovimentoReduzido`. A casca escreve `data-movimento="reduzido"` no `.app`. |

- **O CSS das reações é da casca**, em `src/index.css`, como todo o HUD. Ele só lê atributos e variáveis; não há regra de negócio em CSS.
- **Luz na cena é de quem é dono da coisa iluminada:**
  - a vela da mesa é da `mesa`;
  - a luz da carga é do `arremesso`;
  - o clarão do presságio é dos `pressagios`;
  - o destaque do resultado é da `vitrine`.
- Nenhum módulo lê o estado de outro fora das dependências que o [mapa](mapa-modulos.md) já permite.

## Movimento

**Tokens** (em `:root`):

| Token | Valor |
|---|---|
| `--t-curto` | 160ms |
| `--t-medio` | 320ms |
| `--t-longo` | 700ms |
| `--ease-saida` | `cubic-bezier(0.22, 1, 0.36, 1)`, para revelar |
| `--ease-cine` | `cubic-bezier(0.65, 0, 0.35, 1)`, para as faixas |

**Princípios:**
- O movimento conta o que está acontecendo, não enfeita. Cada animação responde a uma mudança de estado do jogo.
- Nada anima em loop sem motivo (o tremor da vela é luz, não layout).
- Só `transform`, `opacity` e `filter` no HTML, para nada provocar layout nem redimensionar o canvas. Uma faixa que cresce não muda a altura da `.game-area`: o E2E exige o canvas do tamanho da área.
- **Movimento reduzido:** com `.app[data-movimento="reduzido"]`, nenhuma transição nem animação do HUD. Isso substitui os `@media (prefers-reduced-motion)` da parte 1: o atributo segue a mesma fonte de verdade que os presságios usam. Na cena, sem tremor de vela; as luzes mudam de intensidade, mas não piscam.

## Reações por estado

| Estado | Fonte | HUD | Cena |
|---|---|---|---|
| **Mão** | `data-fase="hand"` | faixas internas abertas; HUD inteiro visível | vela acesa, tremendo de leve |
| **Carregando** | `charging` + `--forca` | a vinheta aperta com a força; a linha de força brilha mais quanto mais carregada | luz da carga sobre a mira, crescendo com a força |
| **Rolando / recolhendo** | `rolling`, `returning` | faixas de cinema internas fecham até 28px; os textos das faixas caem para 35% | luz da carga apaga (curta) |
| **Resultado** | `settled` e o `output` preenchido | faixas internas reabrem (`--t-longo`, `--ease-cine`); a legenda se revela: sobe 12px, sai de `blur(8px)` e de opacidade 0 (`--t-longo`, `--ease-saida`); o detalhe entra 200ms depois | luz de destaque sobe com os dados no voo até a câmera |
| **Presságio tocando** | `.game-area[data-omen]`, `[data-kraken]`, `[data-storm]` | a vinheta toma a cor do presságio: ouro no crítico, brasa na falha, ouro e brasa alternando na dualidade, verde-abismo no kraken, azul frio na tempestade; na falha, as faixas tremem 2px por 300ms | o clarão do presságio ganha cor e ritmo próprios em cada um |
| **Resultado com presságio** | `output[data-presagio]` | legenda dourada com brilho no crítico, brasa na falha, gradiente ouro e brasa na dualidade | — |
| **Livro** | `.livro[data-aberto]`, `aside[data-open]` | a página vira na troca de capítulo (a nova entra com `rotateY` de 8° a 0 e sombra varrendo, `--t-medio`) | — |
| **Roda** | `.roda[data-open]` | os raios abrem em leque, 20ms de atraso por `--i` | — |
| **Dica** | troca de texto | o texto novo entra com fade (`--t-curto`) | — |

"Faixas internas" são duas faixas pretas desenhadas dentro da `.game-area` (`::before`), por cima do canvas. Elas não são as barras do cabeçalho e do rodapé.

## Luz

**Regras de [armadilhas.md](contexto/armadilhas.md) que valem para toda luz nova:**
- O número de luzes é fixo: cada luz é montada uma vez, junto com a cena, e se esconde com intensidade 0, nunca desmontando. Mudar o número de luzes recompila o shader de todos os dados.
- Nenhuma luz nova projeta sombra. A única sombra continua sendo a da luz direcional da casca.
- A luz é atualizada no `useFrame`, lendo o estado sem render do React.
- **No renderizador por software** (`renderizadorPorSoftware()`), as luzes novas ficam em intensidade 0, sem tremor.

**As luzes:**

| Luz | Dono | Tipo e cor | Comportamento |
|---|---|---|---|
| Vela | `mesa` | `PointLight` quente, fora da bandeja | depende do tema (`luzDaMesa(tema)`, função pura); tremor suave e determinístico |
| Carga | `arremesso` | `PointLight` `#ffb06a`, sobre a mira | intensidade proporcional à força só em `charging`; 0 no resto |
| Presságio | `pressagios` | a `PointLight` que já existe (uma só) | ganha cor e curva para o kraken (verde por baixo), a tempestade (relâmpagos no ritmo do trovão do CSS) e a dualidade (pulso ouro e frio) |
| Destaque | `vitrine` | `PointLight` `#ffe8c0`, à frente da fileira do resultado | sobe de 0 enquanto os dados voam até a câmera, fica no resultado, apaga ao recolher |

**Orçamento:** são três luzes pontuais novas (vela, carga e destaque), e todo E2E roda em SwiftShader. O `coin-performance.spec.ts` e o `coin-software.spec.ts` têm que continuar passando. Se estourarem, o corte é nesta ordem, e o orquestrador registra na OS-0061:
1. o destaque da vitrine sai;
2. a carga sai;
3. a vela fica.

## Ordens da parte 2

| Ordem | Módulo | Entrega |
|---|---|---|
| [OS-0056](ordens/0056-casca-ritmo.md) | casca | tokens de movimento, `data-fase`, `--forca`, `data-movimento`, faixas internas, revelação da legenda, roda em leque, virada de página |
| [OS-0057](ordens/0057-arremesso-luz-da-carga.md) | arremesso (+ casca: CSS da dica) | luz da carga e troca da dica com fade |
| [OS-0058](ordens/0058-mesa-luz-da-vela.md) | mesa (+ casca: luzes base no `Cena.tsx`) | a vela por tema e a luz-chave mais quente |
| [OS-0059](ordens/0059-pressagios-clarao-e-contrato.md) | pressagios | o clarão do kraken, da tempestade e da dualidade, e o contrato dos atributos da `.game-area` |
| [OS-0060](ordens/0060-vitrine-destaque.md) | vitrine | `data-presagio` na legenda e a luz de destaque |
| [OS-0061](ordens/0061-casca-reacoes-e-aceite.md) | casca + `e2e/` | o CSS das reações aos presságios, os E2E, o orçamento e as docs |

**Fora da parte 2:**
- **Som:** sem pedido.
- **Partículas, poeira e névoa no ar:** custo de cena sem pedido.
- **Mudar o fundo padrão da mesa:** decisão do João.
