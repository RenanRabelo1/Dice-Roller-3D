# Ordem de serviço: casca, a fundação visual do HUD imersivo

Ordem: OS-0051 (HUD imersivo, parte 1 de 5)
Módulo: nenhum, só a casca
Escopo de escrita:
- `src/index.css`
- `src/main.tsx`, só os imports das fontes
- `package.json` e `package-lock.json`, só as três dependências de fonte

Objetivo: o jogo ganha a moldura de cinema (faixas pretas em cima e embaixo, vinheta na cena), a legenda do resultado e a linha de força, sem mudar nenhum DOM, texto ou comportamento.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), a spec inteira (tokens, tipografia e layout)
- `src/index.css` e `src/app/Painel.tsx`
- `src/modules/pressagios/ui/presagios.css`, só para saber o empilhamento (`.omen`, `.omen-tests` com `z-index: 5`)
- `e2e/roll.spec.ts`, o teste `controls leave the complete game area usable` e o `roll mode, bottom left`

Decisões do orquestrador:
1. **Fontes.**
   - Instale `@fontsource/cormorant-garamond`, `@fontsource/cinzel` e `@fontsource/eb-garamond` com versão exata (`npm i -E`).
   - No `main.tsx`, importe só os arquivos latinos usados:
     - Cormorant Garamond: `latin-600-italic.css`;
     - Cinzel: `latin-700.css`;
     - EB Garamond: `latin-400.css`, `latin-400-italic.css` e `latin-600.css`.
   - Confira os nomes exatos dentro do pacote instalado.
   - Nada de `<link>` para o Google Fonts: o jogo funciona sem rede.
2. **Tokens.** Acrescente ao `:root` os tokens da tabela da spec (`--barra`, `--nevoa`, `--luz`, `--apagado`, `--couro`, `--couro-brilho`, `--pergaminho-claro`, `--pergaminho-escuro`, `--tinta`, `--lacre`, `--rubrica`, `--sepia`, `--fio`). Não apague os tokens atuais.
3. **Faixa de cima (`header.controls`).**
   - Fundo `--barra`, sem borda, `min-height: 64px` (não `height`: até a OS-0054 o cabeçalho ainda leva os botões dos dados e precisa crescer), padding horizontal 28px.
   - O `h1` fica com Bricolage 400, 13px, `letter-spacing: .32em`, `text-transform: uppercase` e cor `--nevoa`. O texto no DOM continua "Rolador de dados": o E2E acha o heading por esse nome.
4. **Faixa de baixo (`footer.status`).**
   - Fundo `--barra`, sem borda, `min-height: 72px`, `position: relative`, `display: flex`, `align-items: center` e `justify-content: space-between`.
   - A ordem do DOM não muda: `ModoDeRolagem`, depois `div.feedback` e por fim `p` (dica).
   - **Rolagem**, à esquerda:
     - as opções viram texto sem caixa, 13px, cor `--apagado`;
     - a marcada fica em `--luz`, sublinhada com `text-underline-offset: 6px` e sem fundo latão;
     - o `span` "Rolagem" continua `aria-hidden`; pode sumir visualmente.
   - **Dica**, ao centro: 13px, cor `--apagado`, `text-align: center`, `flex: 1`.
5. **Legenda do resultado (`div.feedback > output`).**
   - `position: absolute`, `left: 0`, `right: 0`, `bottom: calc(100% + 32px)`, coluna centrada, `pointer-events: none`, `z-index: 3`, `text-shadow: 0 2px 18px rgba(0,0,0,.95)`.
   - `output strong`: Cormorant Garamond 600 itálico, 76px, cor `--luz`.
   - `output span`: Bricolage 12px, `letter-spacing: .32em`, `text-transform: uppercase`, cor `--nevoa`.
   - Vazio, o output não ocupa espaço nem tem sombra visível.
   - O `div.feedback` deixa de ter `min-width`.
6. **Linha de força (`progress`, que a casca só monta carregando).**
   - `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `height: 2px`, `appearance: none`, `border: 0`, fundo transparente.
   - O valor fica em `--luz` com `box-shadow: 0 0 10px rgba(242,239,232,.7)`, nos pseudo-elementos `::-webkit-progress-bar`, `::-webkit-progress-value` e `::-moz-progress-bar`.
   - Ela fica na borda de cima da faixa de baixo.
7. **Vinheta.**
   - Em `.game-area::after`: `content: ""`, `position: absolute`, `inset: 0`, `pointer-events: none`.
   - Fundo `radial-gradient(ellipse at 50% 52%, rgba(255,170,90,.08) 0%, rgba(0,0,0,0) 42%, rgba(0,0,0,.6) 100%)`.
8. **Empilhamento.** Hoje nada na área de jogo tem `z-index`, exceto o `.omen-tests` (5). Sem ajuste, a vinheta (`::after`, o último filho) pintaria por cima do presságio. E a `.game-area`, que vem depois do rodapé no DOM, cobriria a legenda, que transborda do rodapé para cima. Fica assim:

   | Camada | `z-index` | Onde se define |
   |---|---|---|
   | canvas e fundo | auto | não muda |
   | vinheta (`.game-area::after`) | 1 | `index.css` |
   | `.game-area .omen` e `.failure` | 2 | `index.css`, sem mexer no `presagios.css` do módulo |
   | legenda (`.feedback output`) e, na OS-0052, a roda | 3 | `index.css` |
   | `.omen-tests` (só em desenvolvimento) | 5 | não muda |
   | livro (OS-0052) e gavetas `.chat` | 10 | não muda |
9. **Botões e campos fora do livro** (os que sobram no cabeçalho até a OS-0054) continuam com o estilo atual. Esta ordem não estiliza o livro nem a roda.
10. **Celular (≤ 800 px).**
   - O bloco `@media (max-width: 800px)` atual se adapta às faixas: título com 11px de letra; faixa de baixo em duas linhas, com a Rolagem na primeira e a dica, centrada, na segunda.
   - Legenda do resultado com `strong` de 44px e `span` de 11px.
   - O E2E de 390px exige que o cabeçalho fique acima da área de jogo, o rodapé abaixo, o canvas do tamanho da área e nenhuma rolagem horizontal.

Entregáveis:
1. As fontes instaladas e importadas.
2. O `index.css` com os tokens, as faixas, a legenda, a linha de força, a vinheta e o bloco de celular.

Critérios de aceite:
- `git diff --stat` mostra só `src/index.css`, `src/main.tsx`, `package.json` e `package-lock.json`.
- Nenhum `.tsx` de módulo nem da casca muda, exceto os imports do `main.tsx`.
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
  - Nenhum chunk JS novo; as fontes entram como assets.
  - O worker continua com 2379,76 kB.
- O `dist/` não referencia `fonts.googleapis.com` nem `fonts.gstatic.com`.
- **Sem E2E no dev.** O orquestrador roda o E2E na OS-0055.

Fora do escopo:
- O livro, a roda de dados e qualquer mudança de DOM (OS-0052 em diante).
- A cena 3D, a câmera e o `FundoCss` da `mesa`.

Se precisar de algo fora disso: pare e reporte. Não implemente.
