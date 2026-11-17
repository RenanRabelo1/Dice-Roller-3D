# Ordem de serviço: casca, folhear o capítulo em vez de rolar

Ordem: OS-0067 (HUD imersivo, acabamento do livro)
Módulo: nenhum, só a casca
Escopo de escrita:
- `src/app/Folheador.tsx` (novo) e `src/app/folhas.ts` (novo, regra pura)
- `src/app/Painel.tsx`, só para renderizar o `<Folheador>` dentro do `.livro`
- `src/index.css`, num bloco novo `/* OS-0067: folhear */` e as regras `overflow` do `.import-body` de `#table-panel` e `#meus-dados`
- `src/app/tests/folhas.test.ts` (novo), ao lado do código, como na regra 7
- `e2e/controls.spec.ts`
- **Docs:**
  - `docs/hud-imersivo.md`, uma seção curta "Folhear";
  - `docs/mapa-modulos.md`, os contratos de DOM lidos pela casca.

Objetivo:
- Quando o conteúdo de um capítulo não cabe na página dupla, o livro não mostra barra de rolagem.
  - No canto inferior direito aparece a ponta da folha com uma seta. Clicar vira a página com uma animação de folha passando pela lombada.
  - No canto inferior esquerdo, a seta de voltar.

Por que acontece hoje:
- O corpo dos capítulos Mesa (`#table-panel .import-body`) e Meus dados (`#meus-dados .import-body`) é um texto de 2 colunas (`column-count: 2`, `column-gap: 96px`) com altura fixa.
- Quando o conteúdo não cabe, o navegador cria colunas novas à direita, e o `overflow-y: auto` vira barra horizontal.
  - Exemplo: textura de imagem, mesas salvas ou tela baixa. Medido a 1470×560: 2674 px de conteúdo para 1012 visíveis, 3 páginas duplas.
- Cada página dupla tem `clientWidth + column-gap` de largura. Folhear é andar o `scrollLeft` de uma página dupla por vez.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md): o layout do livro e as partes 2 e 3 (tokens de movimento `--t-*`, `--ease-*`, movimento reduzido)
- `src/app/Painel.tsx` (o estado `capitulo` e o `.livro`)
- `src/index.css`: os blocos das OS-0052 a 0056 (o livro, os capítulos, a virada `virar`/`sombra-varre`, o movimento reduzido)
- `src/shared/plataforma/index.ts` (`movimentoReduzido`)
- `e2e/controls.spec.ts` (os helpers `capitulo` e `botao` e o teste "no chapter scrolls sideways")

Decisões do orquestrador:

1. **Regra pura, em `src/app/folhas.ts`:**

   ```ts
   // Uma "folha" é uma página dupla do corpo em colunas.
   export const larguraDaFolha = (largura: number, vao: number) => largura + vao;
   export const totalDeFolhas = (conteudo: number, largura: number, vao: number) =>
     Math.max(1, Math.ceil((conteudo + vao) / larguraDaFolha(largura, vao) - 0.01));
   export const folhaEm = (scrollLeft: number, largura: number, vao: number) =>
     Math.round(scrollLeft / larguraDaFolha(largura, vao));
   ```

   - `conteudo` é o `scrollWidth`, `largura` é o `clientWidth` e `vao` é o `column-gap` computado.
   - O `- 0.01` absorve o arredondamento de subpixel. Confira com o caso medido: 2674, 1012, 96 → 3.

2. **CSS do corpo, só no desktop (≥ 801 px):**
   - `#table-panel .import-body` e `#meus-dados .import-body` trocam `overflow-y: auto` por `overflow: hidden`. Sem barra, mas o `scrollLeft` continua funcionando por código.
   - No celular (≤ 800 px) nada muda: lá o capítulo é uma coluna só e rola na vertical, que é o natural no toque.

3. **O componente `Folheador`**, em `src/app/Folheador.tsx`. A casca é dona do livro.
   - **Props:** `{ capitulo: Capitulo | null }`. O `Painel` o renderiza dentro do `.livro`, depois dos capítulos.
   - **O corpo:** quando `capitulo` muda, ele acha o corpo do capítulo aberto, `document.querySelector('.livro > aside[data-open="true"] .import-body')`.
     - Só pagina se o `column-count` computado for maior que 1. No Importar dado e no Chat, o corpo não é em colunas, então nada aparece.
   - **O estado:** `{ folha, total, virando: null | 'frente' | 'tras' }`, local, sem store.
   - **Medir:**
     - com um `ResizeObserver` no corpo;
     - com um `MutationObserver` (`childList`, `subtree`), porque trocar o tipo de fundo acrescenta campos;
     - com o evento `scroll` do corpo. Se o foco do teclado levar o navegador a rolar até um campo de outra folha, o índice segue (`folhaEm`).
   - **Trocar de capítulo ou fechar o livro** volta para a folha 1 (`scrollLeft = 0`).
   - **Se o conteúdo encolher,** a folha é presa ao novo total.
   - **Uma folha só:** nada aparece.

4. **As setas** (a "ponta da folha"):
   - **Próxima:** `<button class="folhear folhear-frente" aria-label="Próxima página">`, no canto inferior direito da página direita. Só aparece se `folha < total`.
   - **Anterior:** `<button class="folhear folhear-tras" aria-label="Página anterior">`, no canto inferior esquerdo da página esquerda. Só aparece se `folha > 1`.
   - **O desenho é uma orelha de página, não um botão de interface:**
     - um triângulo de 56×56 px no canto, com o verso do pergaminho (`linear-gradient(135deg, var(--pergaminho-claro) 50%, transparent 50%)` espelhado para cada lado) e uma sombra fina de dobra;
     - por cima, a seta em Cinzel 700, cor `var(--rubrica)`, `›` na frente e `‹` atrás.
   - **Indicador:** ao lado da seta da frente, em EB Garamond itálico 14 px, cor `var(--sepia)`, `folha 1 de 3`.
   - **Toque:** área clicável de no mínimo 44×44 px.
   - **Hover e foco:** a orelha "levanta", com `transform: scale(1.12)`, a sombra mais funda e a seta indo 2 px para o lado da virada, em `var(--t-curto)` `var(--ease-saida)`. O foco tem o mesmo contorno de 2 px `var(--tinta)` dos outros botões do livro.
   - **Teclado:** só Tab e Enter. As setas do teclado são da mira e não mudam.

5. **A virada (motion design).** Duração `var(--t-longo)` (700 ms), curva `var(--ease-cine)`.
   - **A folha que vira:**
     - `<div class="folha-virando" data-sentido="frente|tras" aria-hidden="true">`, renderizada pelo `Folheador` só durante a virada;
     - posicionada sobre a página de onde sai, ou seja, a direita na frente e a esquerda atrás: `position: absolute; top: 14px; bottom: 14px; width: calc(50% - 14px)`, com `left: 50%` na frente e `right: 50%` atrás;
     - fundo de pergaminho, como as páginas;
     - `transform-origin` na lombada: `left center` na frente, `right center` atrás;
     - `backface-visibility: visible` e `z-index` acima do capítulo.
   - **Keyframes da frente (`folhear-frente`):**

     | Momento | `transform` | `opacity` |
     |---|---|---|
     | 0% | `perspective(2000px) rotateY(0deg)` | 0 |
     | 8% | — | 1 |
     | 50% | `perspective(2000px) rotateY(-90deg)` | — |
     | 92% | — | 1 |
     | 100% | `perspective(2000px) rotateY(-180deg)` | 0 |

     O `folhear-tras` é o espelho, com `rotateY` positivo.
   - **Luz na folha:** um `::after` da folha com `linear-gradient` escurecendo na direção da lombada. Ele anima de `opacity` 0 para .45 em 50% e volta a 0 em 100%: a folha escurece de lado e clareia ao deitar.
   - **Sombra projetada:** um `::before` da folha, um `box-shadow` largo e suave, `0 0 40px rgba(40, 20, 8, .35)`, que só aparece entre 15% e 85%.
   - **O conteúdo troca escondido.** Durante a virada, o corpo ganha `data-folheando`:
     - o conteúdo vai a `opacity: 0` até 40% (`folha-esmaece`);
     - fica em 0 até 60%;
     - volta a 1 até 100%.
     - O `Folheador` troca o `scrollLeft` em 50%, com `setTimeout(metade da duração)`, quando a folha está de lado sobre a lombada.
     - O efeito lido é "a página levantou, passou e a de baixo apareceu".
   - **Só se anima `transform` e `opacity`,** a regra do armadilhas.md. Nada de `filter` nem de gradiente com variável por quadro.
   - **Clique durante a virada:** é ignorado. No fim, a folha desmonta, o `data-folheando` sai, e o foco fica na seta clicada, ou na outra, se a clicada sumiu.
   - **A duração no JS** sai do CSS: leia `--t-longo` computado. Não copie 700 no código.

6. **Movimento reduzido** (`movimentoReduzido()` de `shared/plataforma`, ou `.app[data-movimento="reduzido"]` no CSS): sem folha e sem esmaecer. O `scrollLeft` troca na hora, e o hover da orelha não anima.

7. **Perfil leve:** igual ao completo. Só `transform` e `opacity`, compostos pela GPU.

8. **E2E, em `e2e/controls.spec.ts`:** um teste novo, "a chapter that does not fit turns its pages instead of scrolling".
   - Viewport de 1440×560, para forçar o estouro com a mesa padrão.
   - Abre a Mesa e espera a virada do capítulo (600 ms). Confere:
     - o `overflow-x` computado do `.import-body` é `hidden`;
     - "Próxima página" está visível e "Página anterior" não existe;
     - o indicador diz `folha 1 de N`, com N ≥ 2.
   - **Avançar:** clica em "Próxima página" e espera o fim (1 s). Confere:
     - o `scrollLeft` do corpo é a largura de uma folha (tolerância de 2 px);
     - o indicador diz `folha 2 de N`;
     - "Página anterior" está visível.
   - **Voltar:** clica em "Página anterior" e espera o fim. O `scrollLeft` volta a 0.
   - **Com movimento reduzido** (`emulateMedia`): clicar troca na hora, e nenhuma `.folha-virando` aparece.
   - O teste "no chapter scrolls sideways" continua passando: o capítulo não rola, quem anda é o corpo.

9. **Teste puro** (`src/app/tests/folhas.test.ts`):
   - `totalDeFolhas` com o caso medido (2674, 1012, 96 → 3);
   - o caso que cabe (1012, 1012, 96 → 1);
   - o arredondamento (1012,4, 1012, 96 → 1);
   - `folhaEm` em 0, numa folha e meia e no fim.

10. **Docs.**
    - **`hud-imersivo.md`:** uma seção curta "Folhear: o livro não rola", com o porquê, a orelha, a virada e o movimento reduzido.
    - **`mapa-modulos.md`, em "Contratos de DOM lidos pela casca":** o `Folheador` lê o `.import-body` dos capítulos abertos e o `column-count` dele. Renomear essa classe na `mesa` ou em `meus-dados` é mudança de contrato.

Entregáveis:
1. `folhas.ts` e o teste.
2. O `Folheador` e a linha no `Painel`.
3. O CSS: o corpo sem rolagem, a orelha, a virada e o movimento reduzido.
4. O E2E.
5. As docs.

Critérios de aceite:
- `npm run build`, `npm run lint`, `npm test` (incluindo `tests/arquitetura/`) e `npm run test:server` passam.
- Nenhum arquivo de módulo muda (`git diff --stat` sem `src/modules/`).
- **Sem E2E no dev.** O orquestrador roda o `controls.spec.ts` e mostra no navegador ao João.

Fora do escopo:
- O Importar dado e o Chat. Se o orquestrador achar rolagem vertical neles, vira outra ordem.
- Arrastar a folha com o mouse ou o dedo, som de papel e atalho de teclado novo.

Se precisar de algo fora disso: pare e reporte. Não implemente.
