# Janelas de prévia no livro: a mesa e os dados do chat

Spec pedida pelo João em 2026-11-17. Ordens: [OS-0082](ordens/0082-mesa-janela-de-previa.md) e [OS-0083](ordens/0083-selecao-janela-do-chat.md).

## O problema

Com o livro aberto, o véu e as páginas cobrem a cena.

- **Mesa:** quem personaliza a mesa não vê o que está mudando. A mesa da cena já muda ao vivo, mas está escondida.
- **Fundo 360°:** o João achou que não funcionava, porque o fundo novo aparece atrás do livro.
- **Chat:** quem digita "2d20caveira + d6" não vê os dados até fechar o livro.

## Decisões do João (2026-11-17)

| Pergunta | Decisão |
|---|---|
| Como ver a mesa enquanto edita | **Janela no livro:** uma mini-cena 3D dentro da página, girando devagar e girável com o mouse, como o dado no assistente de importação |
| O que a janela da mesa mostra | **A mesa e o fundo:** feltro, madeira e textura, mais o fundo escolhido (cor, foto, tema ou 360°) |
| Quando a janela do chat mostra os dados | **Enquanto digita:** prévia ao vivo da notação, antes de enviar |

## O que vale para as duas janelas

- **Dono:** cada janela é do módulo dono do capítulo. A da mesa fica na `mesa` (`ui/`), e a dos dados do chat, na `selecao` (`ui/`).
  - Nada novo em `shared` nem em evento.
  - A casca só dá o espaço no CSS do livro.
- **Um `<Canvas>` próprio,** como o `AssistenteDeImportacao` já faz.
  - **Ciclo de vida:** é **montado só com o capítulo aberto** e desmontado ao fechar, o que libera o contexto WebGL. Como só um capítulo abre por vez, existe no máximo uma janela.
  - **Configuração:** `dpr={1}`, fundo transparente (`gl={{ alpha: true }}`), sem sombra e sem pós-processamento.
- **Movimento:**
  - gira sozinha devagar e aceita arrastar para girar (`OrbitControls` sem zoom e sem pan);
  - com **movimento reduzido**, não gira sozinha, mas o arrastar continua;
  - no **perfil leve** (`perfilLeve()`, ADR 0011), `frameloop="demand"`: nada gira sozinho, e a janela redesenha quando o tema ou a notação mudam e enquanto o jogador arrasta.
- **Luz:** uma luz própria, simples (ambiente mais uma direcional quente). A janela não importa a luz da casca, porque módulo não importa a casca. É uma aproximação da cena, não a cena.
- **Acessibilidade:** o contêiner da janela tem `role="img"` e um `aria-label` ("Prévia da mesa", "Prévia dos dados"). O canvas não recebe foco.
- **Testes:** um E2E por janela. Abrir o capítulo põe um segundo `canvas` dentro da janela; fechar tira, e volta a ter só o da cena.

## A janela da mesa (OS-0082)

- **No livro:** a **página esquerda** fica com o título e a janela, que ocupa o resto da altura. Os controles vão para a **página direita**, numa coluna só, e a orelha de folhear (OS-0067) pagina essa página quando não cabe. É como um livro de verdade, com a ilustração de um lado e o texto do outro.
- **Conteúdo:**
  - a mesa montada por `buildFor(theme)`, a mesma regra da `MesaNaCena`;
  - remontada quando o tema muda, com um intervalo de 150 ms, porque o seletor de cor dispara a cada movimento;
  - a mesa velha é liberada com `disposeTable`.
- **Fundo, por tipo:**
  - **cor:** o `<color attach="background">` da janela;
  - **foto ou tema:** o `FundoCss` dentro do contêiner da janela, atrás do canvas transparente;
  - **360°:** `scene.background` com o `panoramaTexture` (o mesmo cache por arquivo), com a rotação, o brilho e o desfoque do tema. O reflexo nos dados não entra, porque não há dado na janela.
- **Câmera:** em três quartos, enquadrando a bandeja inteira (`GUIDE`), e girando em volta do eixo vertical.
- **Ajuda do 360°:** abaixo dos botões de tipo de fundo, uma linha curta em sépia: "360°: uma foto panorâmica 2:1 (equirretangular) em .jpg, .png, .webp ou .hdr." Só aparece com o fundo 360° escolhido, ou ao passar o mouse e focar o botão.
- **Celular:** página única. A janela fica no topo, com 220 px de altura, e os controles rolam embaixo.

## A janela do chat (OS-0083)

- **No livro:** na página direita do capítulo Chat, entre a dica e o campo de digitar.
- **Conteúdo:**
  - o texto do campo passa por `parseDice` a cada mudança, com intervalo de 150 ms;
  - com dados, a janela mostra cada um girando, em fileiras de até 5 (até `MAX_DICE`), com a aparência de `dados` (`AparenciaDoDado`, da porta `cena.ts`);
  - com o campo vazio ou a notação inválida, a janela fica vazia, com uma linha em itálico: "Digite os dados para vê-los aqui." O erro continua aparecendo só ao enviar, como hoje, para não piscar enquanto o jogador digita.
- **Depois de enviar:** o campo limpa, e a janela volta a ficar vazia.
- **Celular:** a janela fica acima do campo, com 160 px de altura.

## Fora desta spec

- **Pausar a cena principal com o livro aberto:** economizaria GPU, mas a cena aparece por trás do véu e congelaria a vela. Fica para depois, se o perfil leve não bastar.
- **Panoramas prontos para escolher:** hoje o 360° exige um arquivo. Ter alguns de fábrica é outra decisão, e outra spec.
- **Luz idêntica à da cena e reflexo do 360° na janela.**
