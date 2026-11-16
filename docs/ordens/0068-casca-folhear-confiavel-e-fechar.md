# Ordem de serviço: casca, folhear que sempre percebe o estouro, e o × do livro

Ordem: OS-0068 (HUD imersivo, acabamento do livro, correção da OS-0067)
Módulo: nenhum, só a casca
Escopo de escrita:
- `src/app/Folheador.tsx`
- `src/index.css`, no bloco `/* OS-0067: folhear */` e na regra do botão de fechar do livro (`.livro > aside header button`, desktop e celular)

Objetivo:
1. A orelha de folhear aparece sempre que o conteúdo não cabe, inclusive quando ele cresce depois que o capítulo abriu.
2. O × de fechar os capítulos fica coerente com o livro e alinhado à página.

Como o João achou e como o orquestrador reproduziu:
- **A falha (item 1):** no capítulo Mesa, com uma mesa importada e o fundo Foto, a seção "Arquivo" foi para a folha 2, mas a orelha não apareceu. Não havia como passar a página.
- **Reprodução:** com a Mesa aberta, aumentar só a altura do fieldset "Arquivo" (`style.paddingBottom = '300px'`) leva o `scrollWidth` do corpo de 1012 para 1566, e o `.folhear` não aparece.
  - Inserir um elemento novo funciona, porque o `MutationObserver` pega.
- **A causa:**
  - o `ResizeObserver` observa só o `.import-body`, que tem altura fixa e não muda quando o conteúdo cresce por dentro;
  - quem muda de tamanho são os filhos dele (os fieldsets e os parágrafos).
  - Isso acontece de verdade quando as fontes do livro (EB Garamond e Cormorant, carregadas só quando o livro abre), uma textura ou o painel de avisos chegam depois da primeira medição.
- **O × (item 2):** hoje ele é um botão com caixa e borda, preso no canto da página (`top: 14px; right: 18px`), desalinhado do título e da margem da página (`padding: 34px 40px`). Ele parece um botão de interface, não parte do livro.

Leia antes de começar:
- [docs/ordens/0067-casca-folhear-o-capitulo.md](0067-casca-folhear-o-capitulo.md) e o relatório dela
- `src/app/Folheador.tsx` e `src/app/folhas.ts`
- `src/index.css`: o livro (OS-0052, `.livro > aside`, o `h2`, a fita do `.livro[data-aberto="true"]::after`), o celular (OS-0055) e o bloco da OS-0067

Decisões do orquestrador:

1. **Medir quando qualquer filho muda de tamanho.** No `useEffect` do `Folheador`:
   - **O `ResizeObserver`** observa o corpo **e cada filho elemento direto dele**. Quando o `MutationObserver` vir `childList`, desobserve os filhos antigos e observe os atuais. Basta um `ro.disconnect()` seguido de observar o corpo e os filhos de novo.
   - **Fontes:** `document.fonts.addEventListener('loadingdone', ler)`, com o `removeEventListener` na limpeza, e um `document.fonts.ready.then(ler)` protegido contra o efeito já desmontado.
   - **Imagens dentro do corpo:** `corpo.addEventListener('load', ler, true)`, na fase de captura, porque `load` de `<img>` não borbulha.
   - O `MutationObserver` continua como está (`childList`, `subtree`) e passa a ter também `characterData: true`, para texto que muda dentro de um nó existente.
   - O `ler` continua barato e só chama `setEstado` quando `total` ou `folha` mudam: muitas chamadas não custam render.

2. **O × do livro** (`.livro > aside header button`, desktop):
   - **Sem caixa:** `background: none; border: 0; border-radius: 0`, sem sombra.
   - **Glifo:** Cormorant Garamond 600, 34 px, `line-height: 1`, cor `var(--sepia)`.
   - **Posição, alinhada à margem da página:** `top: 34px; right: 40px`, iguais ao `padding` do `aside`, para o × ficar na linha do topo do título e na margem direita do texto. Confira se ele não colide com a fita vermelha (`.livro[data-aberto="true"]::after`, `right: 72px`); se colidir, `right: 108px`, à esquerda da fita.
   - **Área de toque:** 44×44 px, com o glifo centralizado.
   - **Hover e foco:** a cor vai para `var(--rubrica)` e o glifo gira 90° (`transform: rotate(90deg)`), em `var(--t-curto)` `var(--ease-saida)`. O foco mantém o contorno de 2 px `var(--tinta)` do livro.
   - **Movimento reduzido** (`.app[data-movimento="reduzido"]`): sem rotação e sem transição; só a cor muda.
   - **Celular (≤ 800 px):** o livro é tela cheia e o × continua `position: fixed`, como na OS-0055. Ele só ganha o mesmo glifo sem caixa e um fundo `var(--pergaminho-claro)` redondo (`border-radius: 50%`), para continuar legível sobre o conteúdo que rola.
   - **Não mude o DOM** dos módulos: o `<button aria-label="Fechar …">×</button>` continua igual. É só CSS da casca.

3. **Nada mais muda** no folhear: a orelha, a virada, o indicador e o movimento reduzido ficam como a OS-0067 entregou.

Entregáveis:
1. A medição robusta no `Folheador`.
2. O CSS do ×.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` passam.
- `git diff --stat` só em `src/app/Folheador.tsx` e `src/index.css`.
- **Sem E2E nem servidor de dev:** o João testa no navegador.
- O orquestrador repete a reprodução (aumentar o `paddingBottom` do fieldset "Arquivo") e a orelha tem de aparecer.

Fora do escopo:
- A ordem dos fieldsets, o `break-inside` e qualquer arquivo de módulo.

Se precisar de algo fora disso: pare e reporte. Não implemente.
