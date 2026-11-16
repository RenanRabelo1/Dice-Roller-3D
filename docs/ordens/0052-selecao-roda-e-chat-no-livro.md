# Ordem de serviço: selecao, a roda de dados e o chat como capítulo do livro

Ordem: OS-0052 (HUD imersivo, parte 2 de 5)
Módulo: `selecao`
Escopo de escrita:
- `src/modules/selecao/**`
- **Casca:**
  - `src/app/Painel.tsx`;
  - `src/index.css`, só a roda, o livro (moldura e páginas) e o capítulo do chat.

Objetivo:
- Os dados embutidos saem do cabeçalho e vão para uma roda que abre junto do botão da mão, à direita da faixa de baixo.
- O chat deixa de ser uma gaveta lateral e passa a ser o primeiro capítulo do livro, que a casca abre e fecha.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), as decisões 1 a 5 e o layout
- `src/modules/selecao/CLAUDE.md`
- `src/modules/selecao/ui/` inteiro, `cena.ts` e `tests/componentes.test.ts`
- `src/app/Painel.tsx`
- `e2e/controls.spec.ts` e `e2e/chat.spec.ts`, para saber o que os E2E esperam (você não os roda nem os edita)

Decisões do orquestrador:

1. **`ResumoDaMao`** passa a renderizar `<span className="pool" aria-live="polite">`, não `<p>`, porque vai dentro de um botão. O texto não muda: o E2E lê `.pool`.

2. **`BotoesDeDados`** continua sendo o `div.selection[role=group][aria-label="Dados"]` com um `div.pick` por tipo.
   - Cada `div.pick` ganha `style={{ '--i': índice }}`.
   - O grupo ganha `style={{ '--n': KINDS.length }}`.
   - O E2E `controls.spec.ts` acha `group "Dados"`; não troque esse nome.

3. **`RodaDeDados`** é o componente novo, em `ui/RodaDeDados.tsx`, exportado pelo `cena.ts`. O DOM é este:

   ```tsx
   <div className="roda" data-open={aberta}>
     <div id="roda-de-dados" className="roda-anel" inert={!aberta}><BotoesDeDados /></div>
     <button className="roda-botao" aria-label="Escolher dados" aria-expanded={aberta}
       aria-controls="roda-de-dados" aria-keyshortcuts="D" onClick={alternar}>
       <ResumoDaMao /> <kbd>D</kbd>
     </button>
   </div>
   ```

   - Estado local `aberta`, começando em `true`.
   - A tecla D alterna a roda, com os mesmos filtros do C do chat: sem Ctrl, Meta ou Alt, sem `repeat` e fora de campo de texto (reuse a função `typing`). Esc não mexe na roda.
   - Sem `localStorage`: a roda não lembra entre sessões (decisão 5 da spec).

4. **`Chat`** vira um componente controlado: `Chat({ aberto, onAlternar, onFechar }: { aberto: boolean; onAlternar: () => void; onFechar: () => void })`.
   - Saem o `useState` de `open`, o `ref` do botão e o próprio `<button className="chat-toggle">`. O botão passa para a casca.
   - A tecla C (com os filtros de hoje) chama `onAlternar()`.
   - Esc com o chat aberto chama `onFechar()`, e o × também.
   - O foco no campo ao abrir continua.
   - O `<aside id="dice-chat" aria-label="Chat de dados" data-open inert>` e o resto do DOM não mudam: o E2E acha `complementary "Chat de dados"`.

5. **Casca: o estado do livro em `Painel.tsx`.**

   ```tsx
   type Capitulo = 'chat'; // a OS-0053 e a OS-0054 acrescentam 'mesa', 'meus' e 'importar'
   const [capitulo, setCapitulo] = useState<Capitulo | null>(null);
   const gatilhos = useRef<Partial<Record<Capitulo, HTMLButtonElement | null>>>({});
   const alternar = (c: Capitulo) => setCapitulo((a) => (a === c ? null : c));
   const fechar = (c: Capitulo) => { setCapitulo((a) => (a === c ? null : a)); gatilhos.current[c]?.focus(); };
   ```

   - Abrir um capítulo fecha o que estiver aberto, porque só existe um estado.
   - Fechar com Esc ou com o × devolve o foco ao botão. Fechar com o atalho não move o foco (decisão 4 da spec).

6. **Casca: o novo `Painel`.**
   - **Cabeçalho:**
     - o `h1`;
     - os componentes dos outros módulos que ainda estão nele: `MeusDados`, `PainelDaMesa` e `Importacao` (saem nas OS-0053 e OS-0054);
     - um `<nav aria-label="Livro">` com o botão do chat:

       ```tsx
       <button ref={(el) => { gatilhos.current.chat = el; }} className="chat-toggle" aria-expanded={capitulo === 'chat'}
         aria-controls="dice-chat" aria-keyshortcuts="C" onClick={() => alternar('chat')}>Chat <kbd>C</kbd></button>
       ```

     - `BotoesDeDados` e `ResumoDaMao` saem do cabeçalho.
   - **Livro**, entre o cabeçalho e o rodapé:

     ```tsx
     <div className="livro" data-aberto={capitulo !== null}>
       <Chat aberto={capitulo === 'chat'} onAlternar={() => alternar('chat')} onFechar={() => fechar('chat')} />
     </div>
     ```

     O `.livro` é `position: fixed`, então não ocupa célula do grid do `.app`.
   - **Rodapé:** como hoje, com a `<RodaDeDados />` no fim, à direita.

7. **CSS (casca), com os tokens da OS-0051.**

   **A roda.**
   - `.roda`: `position: relative`. `.roda-botao` é texto sem caixa, com o `.pool` em Cormorant Garamond 600 itálico, 20px, cor `--luz`, e o `kbd` como na faixa de cima.
   - `.roda-anel`: `position: absolute`, `right: 0`, `bottom: calc(100% + 24px)`, `z-index: 3` (a tabela de empilhamento da OS-0051), 300 × 300 px, círculo de borda `rgba(242,239,232,.18)` com fundo radial escuro e translúcido.
     - Fechada: `opacity: 0`, `visibility: hidden` e `transform: scale(.9)`.
     - Aberta: transição de 180ms. Sem transição com `prefers-reduced-motion`.
   - **Os raios.** Cada `.pick` fica `position: absolute` no centro do anel, com `transform: rotate(calc(var(--i) * 360deg / var(--n))) translateY(-120px) rotate(calc(var(--i) * -360deg / var(--n)))`.
   - **O botão Adicionar** é um círculo de 64px: fundo `rgba(10,10,12,.78)`, borda `rgba(242,239,232,.4)`, texto 11px 600 que quebra em até duas linhas ("2d10 Vampiro").
     - `aria-pressed="true"` deixa fundo `--luz` e texto `#0b0b0d`.
   - **O botão `.remove` (−)** é um círculo de 26px, `position: absolute` no canto de cima à esquerda do raio, com fundo `--barra` e borda `--luz`.
   - **Celular:** o anel fica centrado na tela, acima da faixa, com 240px, raio de 96px e raios de 52px.

   **O livro.**
   - `.livro` fechado: `display: none`.
   - `.livro[data-aberto="true"]`:
     - `position: fixed`, centrado, `top: 92px`, `width: min(1120px, calc(100vw - 32px))`, `height: min(680px, calc(100dvh - 64px - 72px - 56px))`, `z-index: 10`;
     - padding de 14px, `border-radius: 10px`;
     - fundo de couro `radial-gradient(ellipse at 50% 0%, var(--couro-brilho), var(--couro))`;
     - filete por `box-shadow`: `inset 0 0 0 2px #6e3a22, inset 0 0 0 6px var(--couro), inset 0 0 0 7px rgba(212,169,63,.5)`, mais a sombra `0 40px 90px rgba(0,0,0,.75)`.
   - **O véu sobre a cena** é um `::before` fixo, entre as faixas, `rgba(5,5,6,.55)`, atrás do livro.
   - **A fita** é decorativa: um `::after` vermelho (`--lacre`) em forma de marcador, saindo do topo da capa.

   **As páginas.**
   - Seletor `.livro > aside`. Ele sobrescreve o `.chat` lateral, sem mudar o `.chat` fora do livro, que a mesa e o assistente ainda usam até as próximas ordens.
   - `position: absolute`, `inset: 14px`, sem `transform` de gaveta.
   - Fundo de página dupla: `linear-gradient(90deg, …)` em `--pergaminho-claro` e `--pergaminho-escuro`, com a sombra da lombada no meio (escura nos 48–52%).
   - Texto em `--tinta`, EB Garamond 17px, padding de 34px 40px.
   - Só o capítulo com `data-open="true"` aparece; os outros ficam `display: none`.
   - **O título** (`aside h2`) é Cinzel 700, 30px, com a capitular (`::first-letter`) em 44px na cor `--rubrica`, e um ornamento de fio abaixo (SVG em `background-image`, sem texto).
   - **O × de fechar** é um botão de 44px no canto de cima à direita da página direita.
   - **Botões dentro do livro:**
     - comuns: fundo `rgba(255,250,236,.35)`, borda `--fio`, cor `--tinta`, EB Garamond 16px, `min-height: 44px`;
     - `[aria-pressed="true"]` e o de enviar: fundo `--lacre`, texto `#f6ecd6`;
     - `focus-visible`: contorno de 2px em `--tinta`.
   - **Campos dentro do livro:** sem caixa, só o fio de baixo em `#8a6a3e`, EB Garamond itálico 20px, cor `--tinta`.

   **O capítulo do chat (`#dice-chat`).**
   - Grid de duas colunas.
   - **Página esquerda:** o título e o `ol.chat-log`.
     - As falas do jogador (`.msg-you`) em Cormorant Garamond itálico 22px, antecedidas de um travessão na cor `--rubrica` (pseudo-elemento).
     - As respostas (`.msg-app`) em `--sepia`, recuadas 22px.
     - Os erros em `#9b2a1a`.
   - **Página direita:** a dica e o formulário (campo e "Aplicar").
     - A dica é o `li.hint` quando o log está vazio. Se a página ficar vazia, mova só o visual: o DOM do chat não muda.

8. **Docs do módulo.** O `CLAUDE.md` da `selecao` diz:
   - que a roda é dela (`RodaDeDados`, tecla D, aberta por padrão);
   - que o `Chat` é controlado pela casca (`aberto`, `onAlternar`, `onFechar`) e que o C continua no módulo.

9. **Testes.** O `tests/componentes.test.ts` compara com o cabeçalho legado (`fixtures/cabecalho-antes.json`), e isso deixa de valer de propósito. Troque pelas asserções do DOM novo:
   - `RodaDeDados`: o `id`, os atributos `aria-*` e o `.pool` com o texto da mão;
   - `BotoesDeDados`: o grupo "Dados" e os `--i` e `--n`;
   - `BotaoDeDado`: o par Adicionar/Remover de hoje;
   - `Chat`: renderiza só o aside, sem botão, com `data-open` e `inert` seguindo `aberto`;
   - o par de `Meus dados` com o `.pick`: mantenha enquanto a `meus-dados` usar.
   - Apague a fixture se nenhum teste a usar mais.
   - Um teste da tecla D, se já houver um padrão de teste de teclado no módulo; se não houver, não crie infraestrutura nova: o E2E da OS-0055 cobre.

Entregáveis:
1. `RodaDeDados`, `ResumoDaMao`, `BotoesDeDados` e `Chat` como descrito, e o `cena.ts` exportando `RodaDeDados`.
2. O `Painel.tsx` com o estado do livro, o `nav` e o livro.
3. O CSS da roda, do livro e do capítulo do chat.
4. O `CLAUDE.md` da `selecao` e os testes.

Critérios de aceite:
- O botão "Chat" não existe mais dentro do `Chat`; existe um só, na casca, com a classe `chat-toggle`.
- Tecla C com a área de jogo focada: abre o livro no chat e foca o campo.
- Esc: fecha o chat e foca o botão "Chat".
- C com o chat aberto e o foco fora do campo: fecha sem mover o foco.
- Digitar "c", "d" ou "m" no campo do chat não abre nem fecha nada.
- Tecla D: recolhe e abre a roda, e o `aria-expanded` segue.
- Com 10 dados na mão, todos os "Adicionar" ficam desabilitados.
- `npm run build`, `npm run lint`, `npm test` (incluindo `tests/arquitetura/`) e `npm run test:server` passam. Nenhum módulo importa `src/app/`.
- **Sem E2E no dev.** O orquestrador roda o E2E na OS-0055.

Fora do escopo:
- A mesa, Meus dados e o assistente de importação: ficam como estão no cabeçalho, com o estilo de gaveta lateral.
- Os dados importados na roda.
- Mudar a notação, as mensagens do chat ou o limite de 10 dados.

Se precisar de algo fora disso: pare e reporte. Não implemente.
