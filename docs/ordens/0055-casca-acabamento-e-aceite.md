# Ordem de serviço: casca, acabamento do HUD imersivo, E2E e aceite

Ordem: OS-0055 (HUD imersivo, parte 5 de 5)
Módulo: nenhum, só a casca e a rede de segurança
Escopo de escrita:
- `src/index.css`
- `src/app/Painel.tsx`, só se o acabamento pedir
- `e2e/*.spec.ts`
- **Docs:**
  - `docs/hud-imersivo.md`;
  - `docs/backlog.md`, item 4;
  - `docs/mapa-modulos.md`, decisão 6;
  - `docs/contexto/visao-geral.md`;
  - `CLAUDE.md` da raiz, a linha da casca na tabela "Onde ficam as coisas".

Objetivo: fechar o HUD imersivo. Ele tem que funcionar no celular, respeitar movimento reduzido e contraste, ter E2E cobrindo o livro e a roda, docs que batem com o código e o gate completo verde.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md)
- As ordens OS-0051 a OS-0054 e os relatórios delas
- `src/app/Painel.tsx` e `src/index.css`
- `e2e/controls.spec.ts`, `e2e/import.spec.ts`, `e2e/table.spec.ts`, `e2e/chat.spec.ts` e `e2e/roll.spec.ts`

Decisões do orquestrador:

1. **Abertura do livro.** O `.livro[data-aberto="true"]` entra com `opacity` de 0 a 1 e `transform: translateX(-50%) scale(.97)` até 1, em 200ms (`@keyframes`).
   - Trocar de capítulo não anima.
   - Com `prefers-reduced-motion: reduce`, nada anima: nem o livro, nem a roda, nem a legenda.

2. **Celular (≤ 800 px).**
   - **O livro:** com o livro aberto, `position: fixed`, `inset: 0` e `z-index` acima das faixas. Página única: o fundo é um pergaminho só, sem lombada, e as colunas e grids dos capítulos viram uma coluna. `overflow-y: auto`. O × de cada capítulo fica visível no topo.
   - **O `nav`:** os 4 botões numa linha própria, `flex: 1` cada, sem `kbd`, com no mínimo 44px de altura.
   - **Conferência:** nenhuma rolagem horizontal em 390 × 844, com o livro fechado e com cada capítulo aberto.

3. **Contraste.** Confira 4,5:1 em todo texto do HUD novo, e 3:1 no texto de 24px ou mais:
   - as faixas: `--nevoa` e `--apagado` sobre `--barra`;
   - as páginas: `--tinta`, `--sepia` e `--rubrica` sobre `--pergaminho-escuro`;
   - os botões marcados: `#f6ecd6` sobre `--lacre`;
   - a legenda sobre a cena mais clara: o feltro das capturas, com a sombra.

   Se um par falhar, escureça o token e registre a troca na tabela da spec.

4. **E2E: adaptar o que a mudança de DOM quebrou.** Os dados importados agora ficam no capítulo Meus dados, que só aparece aberto.
   - Crie em `e2e/import.spec.ts` um helper idempotente, como o `panel()` do `table.spec.ts`:

     ```ts
     const meusDados = async (p: Page) => {
       if (await p.locator('#meus-dados').getAttribute('data-open') !== 'true')
         await p.locator('.chat-toggle', { hasText: 'Meus dados' }).click();
     };
     ```

     Chame-o antes de cada `Adicionar <importado>`, `Excluir <importado>` ou `Tinta` que não venha logo depois de um "Salvar". O "Salvar" já deixa Meus dados aberto.
   - Exemplo: o `import.spec.ts:73` exclui a Caveira depois de usar o chat, e o chat fechou Meus dados.
   - Onde um teste joga clicando na mesa (ponteiro) com um capítulo aberto, feche antes com Esc: o véu do livro bloqueia o ponteiro de propósito. Jogar com Espaço na `.game-area` focada continua valendo.
   - Não troque nomes acessíveis nos testes para "fazer passar": se um nome mudou, é bug da ordem que o mudou.

5. **E2E novos**, em `e2e/controls.spec.ts`:
   1. **Um capítulo por vez.** M abre a mesa. C, com o foco fora de campo, troca para o chat: a mesa fica com `data-open="false"`, o chat com `true`, e só o botão do chat tem `aria-expanded="true"`.
   2. **Foco.** Esc no chat devolve o foco ao botão "Chat".
   3. **A roda.**
      - Ela começa aberta: o grupo "Dados" está visível e o botão "Escolher dados" tem `aria-expanded="true"`.
      - D recolhe: o grupo não está visível e o `aria-expanded` é `false`.
      - D de novo reabre.
      - Digitar "d" no campo do chat não mexe na roda.
   4. **Meus dados vazio.** O capítulo mostra "Nenhum dado importado ainda." e "Forjar um dado novo". Esse botão troca para o capítulo Importar dado.

6. **Docs.**
   - **`hud-imersivo.md`:** no topo, "Concluído na OS-0055", e os tokens que o passo 3 trocou.
   - **`backlog.md`, item 4:** "Virou a spec `hud-imersivo.md`, concluída nas OS-0051 a OS-0055". Ficam pendentes só a pose de calibração da forma livre e o fundo padrão da mesa.
   - **`mapa-modulos.md`, decisão 6:** acrescente uma frase. Desde a OS-0052, a casca também compõe o livro: ela guarda o capítulo aberto e os botões de abrir, e os painéis dos módulos são controlados (`aberto` e callbacks), com os atalhos ainda nos módulos.
   - **`visao-geral.md`** e **`CLAUDE.md` da raiz:** o `Painel` compõe as faixas, o livro e a roda.

Entregáveis:
1. O CSS de acabamento: abertura, celular, movimento reduzido e contraste.
2. Os E2E adaptados e os novos.
3. As docs.

Critérios de aceite:
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
- **O dev não roda o E2E.** O orquestrador roda `npm run e2e` completo, um spec por vez, com a máquina livre (os botões de presságio têm orçamento de tempo).
  - Registra a tabela do gate nesta ordem, como na OS-0046.
  - Abre as capturas `screens/controls-1440.png` e `screens/controls-390.png` para conferir o visual.
- Nenhuma rolagem horizontal em 390px, com o livro fechado e com cada capítulo aberto (coberto pelo E2E de layout, mais a conferência visual do orquestrador).

Fora do escopo:
- O fundo padrão da mesa, o total por extenso, o histórico na tela, os importados na roda e a pose de calibração.
- Qualquer `.tsx` de módulo. Se o acabamento pedir mudança de DOM num módulo, pare e reporte: vira uma ordem do módulo.

Se precisar de algo fora disso: pare e reporte. Não implemente.
