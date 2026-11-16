# Ordem de serviço: casca, o ritmo do HUD

Ordem: OS-0056 (HUD imersivo, parte 2, ordem 1 de 6)
Módulo: nenhum, só a casca
Escopo de escrita:
- `src/App.tsx`
- `src/index.css`

Objetivo: o HUD passa a reagir à fase do gesto e à força da carga. As faixas de cinema fecham na rolagem e reabrem no resultado, a legenda se revela, a roda abre em leque e o livro vira a página. Tudo respeita o movimento reduzido.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), a parte 2 inteira: arquitetura, movimento e reações por estado
- `src/App.tsx`, `src/app/Painel.tsx` e `src/index.css`, já com a parte 1 (OS-0051 a OS-0055)
- `src/modules/arremesso/index.ts` (`assinarArremesso`) e `src/shared/plataforma/movimento.ts`

Decisões do orquestrador:

1. **Os atributos do `.app`, sem render do React.** O `App` não pode re-renderizar a cada fase: isso re-renderiza o `<Canvas>` e a cena. Num `useEffect` do `App`, com um `ref` no `<main className="app">`:

   ```ts
   const el = app.current!;
   const aplicar = (s: EstadoDoArremesso) => { el.dataset.fase = s.gesture.phase; el.style.setProperty('--forca', String(s.force)); };
   aplicar(arremesso());
   const movimento = (v: boolean) => { if (v) el.dataset.movimento = 'reduzido'; else delete el.dataset.movimento; };
   movimento(movimentoReduzido());
   const sairA = assinarArremesso(aplicar), sairM = aoMudarMovimentoReduzido(movimento);
   return () => { sairA(); sairM(); };
   ```

   - Use só o que as portas exportam (`arremesso` e `assinarArremesso` do `index.ts` do `arremesso`, o tipo pelo `contracts.ts`; `movimentoReduzido` e `aoMudarMovimentoReduzido` de `shared/plataforma`).
   - Se o nome exportado for outro, use o que existe. Não abra porta nova.

2. **Tokens de movimento** no `:root`: `--t-curto`, `--t-medio`, `--t-longo`, `--ease-saida` e `--ease-cine`, com os valores da spec. A `@property --forca` é `<number>`, `inherits: true`, `initial-value: 0`.

3. **Faixas internas (`.game-area::before`).**
   - `content: ""`, `position: absolute`, `inset: 0`, `pointer-events: none`, `z-index: 1` (a mesma camada da vinheta; veja a tabela de empilhamento da OS-0051).
   - Duas faixas `--barra` com `linear-gradient(var(--barra), var(--barra))`, uma em `top` e outra em `bottom`, `background-repeat: no-repeat`.
   - Alturas pelo `background-size`: 0 em `hand`, `charging` e `settled`; 28px em `rolling` e `returning` (16px até 800px de largura).
   - Transição de `background-size` em `var(--t-longo) var(--ease-cine)`.
   - Nada muda a altura do cabeçalho, do rodapé ou da `.game-area`.

4. **Os textos das faixas recuam na rolagem.** Em `rolling` e `returning`, `header.controls > *` e os filhos de `footer.status`, exceto o `.feedback`, ficam com `opacity: .35`, com transição `--t-medio`. A legenda não recua.

5. **Revelação da legenda.**
   - `output strong` entra com a animação `revelar`, `var(--t-longo) var(--ease-saida)`: de `opacity: 0`, `translateY(12px)` e `filter: blur(8px)` para o normal.
   - `output span` faz o mesmo, com `animation-delay: 200ms` e `animation-fill-mode: both`.
   - A animação roda quando os elementos montam: a `vitrine` só monta o texto quando há resultado e o presságio já acabou.

6. **A força no HUD.** Em `charging`:
   - a vinheta aperta: o raio transparente vai de `42%` para `calc(42% - 14% * var(--forca))`, e a borda escura de `.6` para `calc(.6 + .25 * var(--forca))`;
   - a linha de força (`progress`) tem `box-shadow` de `0 0 calc(6px + 14px * var(--forca)) rgba(242,239,232,.8)`.

7. **A roda em leque.**
   - O que anima é o botão dentro de cada `.pick`, não o `.pick`, porque o `transform` do `.pick` é a posição.
   - Fechada: `opacity: 0` e `scale(.6)`. Aberta: o normal.
   - Transição de `opacity` e `transform` em `var(--t-medio) var(--ease-saida)`, com `transition-delay: calc(var(--i) * 20ms)`.

8. **A virada de página.**
   - `.livro > aside[data-open="true"]` entra com `virar`, `var(--t-medio) var(--ease-saida)`: de `perspective(1600px) rotateY(8deg)` e `opacity: .4` para o normal, com `transform-origin` na lombada.
   - Um `::after` faz a sombra varrer da lombada para a borda.

9. **Dica:** fica para a OS-0057, que dá `key` ao `<p>`.

10. **Movimento reduzido.**
    - Troque os `@media (prefers-reduced-motion: reduce)` da parte 1 por regras sob `.app[data-movimento="reduzido"]`.
    - Elas zeram `animation` e `transition` de: `header.controls`, `footer.status` e descendentes, `.livro` e descendentes, `.roda` e descendentes, `.game-area::before` e `.game-area::after`.
    - **Não** use `*` no `.app` inteiro: o CSS dos presságios é do módulo e tem regra própria.
    - As faixas internas ficam no estado final, sem transição.

Entregáveis:
1. O efeito no `App.tsx`.
2. O CSS dos itens 2 a 8 e 10.

Critérios de aceite:
- `git diff --stat` mostra só `src/App.tsx` e `src/index.css`.
- O `App` não tem estado novo nem seletor de store: as reações não causam render. Confira com o React DevTools Profiler, ou com um `console.count` temporário que não vai para o commit.
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
- **Sem E2E no dev.** Os E2E das reações são da OS-0061.

Fora do escopo:
- As reações aos presságios (OS-0061), as luzes (OS-0057 a OS-0060) e qualquer arquivo de módulo.

Se precisar de algo fora disso: pare e reporte. Não implemente.
