# HUD imersivo: Fantasma + Grimório

Spec da refatoração visual (item 4 do [backlog](backlog.md)). A direção foi escolhida pelo João em 2026-11-16, entre seis protótipos do canvas "HUD imersivo" (o 6º, "Fantasma + Grimório", montado sobre capturas da cena 3D real). Esta página é o plano: o que muda, as decisões e a ordem das ordens de serviço. O detalhe de cada entrega está nas ordens OS-0051 a OS-0055, em [ordens/](ordens/).

## A ideia

O jogo já é imersivo onde é 3D: os dados, a bandeja e os presságios. O HUD de hoje parece um painel de software (botões em fileira no topo, resultado e dica num rodapé), e isso quebra o clima. A proposta tem duas camadas:

1. **Jogando: o Fantasma.** O HUD quase some. Duas faixas pretas de cinema emolduram a cena, com uma vinheta nas bordas. O resultado aparece como legenda de filme sobre a cena. Os dados ficam numa roda que abre junto do botão da mão.
2. **Configurando: o Grimório.** Mesa, Meus dados, Importar dado e Chat viram capítulos de um livro que abre sobre a cena. Um capítulo por vez, em página dupla de pergaminho.

Nada muda na cena 3D, na física, no desempenho ou nas regras. É só a camada HTML/CSS e a forma como a casca compõe os painéis.

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
