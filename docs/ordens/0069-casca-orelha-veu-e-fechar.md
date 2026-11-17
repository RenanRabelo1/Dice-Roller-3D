# Ordem de serviço: casca, a orelha visível, o véu que bloqueia a mesa e o × no canto

Ordem: OS-0069 (HUD imersivo, acabamento do livro, segunda correção da OS-0067)
Módulo: nenhum, só a casca
Escopo de escrita:
- `src/app/Painel.tsx`, só o elemento do véu
- `src/index.css`: o `.livro[data-aberto="true"]`, o botão de fechar (`.livro > aside header button`) e o bloco `/* OS-0067: folhear */`

Objetivo:
1. A orelha de folhear aparece e é clicável.
2. Com o livro aberto, clicar fora dele não joga o dado.
3. O × fica mais no canto e, no mouse, brilha e cresce um pouco, sem girar.

O que o João viu e o orquestrador confirmou:

1. **A orelha existe, mas não se vê nem se clica.**
   - Com o estouro forçado (1430×730, fieldset "Arquivo" com `paddingBottom: 300px`), o `.folhear` está no DOM, mas não aparece na captura.
   - **Causa:** o capítulo (`aside`) ainda tem `z-index: 10`, herdado da regra antiga `.chat` (`index.css`, linha ~98, achado 1.1 da auditoria). A orelha e o indicador têm `z-index: 2`, e a folha que vira tem 3. Ficam todos atrás da página.

2. **Clicar fora do livro joga o dado.**
   - O `document.elementFromPoint` embaixo da fita vermelha (`.livro[data-aberto="true"]::after`, `pointer-events: none`) e ao lado do livro dá `CANVAS`.
   - **Causa:** o véu da OS-0052 é um `box-shadow` de 100vmax, recortado por `clip-path`. Ele pinta a cena, mas sombra não recebe clique. O ponteiro atravessa até a mesa.
   - A fita é só um marcador decorativo. O João clicou nela achando que virava a página, e o clique foi para o dado.

3. **O ×** gira 90° no hover, e o João achou estranho. Ele também quer o × mais perto do canto da página.

Leia antes de começar:
- As ordens OS-0067 e OS-0068 e o `git log` delas
- `src/app/Painel.tsx` e `src/app/Folheador.tsx`
- `src/index.css`: o `.livro` (OS-0052), o botão de fechar (OS-0068) e o bloco `/* OS-0067: folhear */`

Decisões do orquestrador:

1. **Orelha acima da página** (bloco OS-0067):
   - `.folhear` e `.folhear-indice` com `z-index: 12`;
   - `.folha-virando` com `z-index: 13`.
   - Não mexa no `z-index` da regra `.chat`, porque a limpeza dela é outra ordem (auditoria, item 1).

2. **Um véu de verdade.**
   - **No `Painel`:** `{capitulo && <div className="livro-veu" aria-hidden="true" />}`, logo antes do `<div className="livro">`.
   - **CSS:** `.livro-veu { position: fixed; top: 64px; bottom: 72px; left: 0; right: 0; z-index: 9; background: rgba(5, 5, 6, .55); }`.
     - É a mesma área que o `clip-path` recortava: entre o cabeçalho e o rodapé.
     - Ele fica abaixo do livro (10) e acima da cena e da roda.
   - **Tire do `.livro[data-aberto="true"]`:**
     - a sombra `0 0 0 100vmax rgba(5, 5, 6, .55)` do `box-shadow` (as outras sombras ficam);
     - o `clip-path` inteiro e o comentário dele. Sem o recorte, a sombra do livro deixa de ser cortada.
   - **Clicar no véu não faz nada:** não fecha o livro nem joga o dado. Fechar continua sendo pelo ×, pelo Esc ou pelo botão do capítulo.
   - **Celular (≤ 800 px):** `.livro-veu { display: none }`. Lá o livro já é tela cheia.
   - **Abertura:** o véu entra com a mesma animação de opacidade do livro, 200 ms, e sem animação no movimento reduzido.

3. **O ×, desktop:**
   - **Posição:** `top: 36px; right: 20px`, mais perto da borda direita da página.
     - Nas coordenadas da página (o `aside` começa 14 px para dentro do livro), a fita ocupa de 58 a 80 px da borda direita e desce até `y = 30`.
     - Com `top: 36px` o × fica logo abaixo da ponta dela, sem encostar.
   - **Hover e foco:**
     - **sem rotação**, então tire o `rotate(90deg)`;
     - cor `var(--rubrica)`, `transform: scale(1.12)` e brilho `text-shadow: 0 0 12px rgba(142, 42, 28, .45)`;
     - transição de `color`, `transform` e `text-shadow` em `var(--t-curto)` `var(--ease-saida)`.
   - **Movimento reduzido:** só a cor e o brilho, sem `scale` e sem transição.
   - O celular fica como a OS-0068 deixou.

Entregáveis:
1. A orelha acima da página.
2. O véu em elemento, e o `box-shadow` e o `clip-path` antigos fora.
3. O × no canto, com brilho e sem rotação.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` passam.
- `git diff --stat` só em `src/app/Painel.tsx` e `src/index.css`.
- **Sem E2E nem servidor de dev:** o orquestrador confere com `elementFromPoint`, e o João testa no navegador.
  - Embaixo da fita e ao lado do livro, o elemento atingido é `.livro-veu`.
  - No centro da orelha, é o `button.folhear`.

Fora do escopo:
- Limpar a regra `.chat` antiga.
- Fazer a fita fechar ou virar a página.
- Qualquer arquivo de módulo.

Se precisar de algo fora disso: pare e reporte. Não implemente.
