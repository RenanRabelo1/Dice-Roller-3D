# Ordem de serviço: mesa, "Personalizar mesa" vira capítulo do livro

Ordem: OS-0053 (HUD imersivo, parte 3 de 5)
Módulo: `mesa`
Escopo de escrita:
- `src/modules/mesa/**`
- **Casca:**
  - `src/app/Painel.tsx`;
  - `src/index.css`, só o capítulo da mesa (`#table-panel` dentro do `.livro`).

Objetivo: o painel da mesa (fundo, pano e madeira, exportar e importar `.glb`, mesas salvas) abre como capítulo do livro, controlado pela casca, com o botão "Mesa" na faixa de cima.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), as decisões 1 a 4 e 9
- [OS-0052](0052-selecao-roda-e-chat-no-livro.md), as decisões 4 a 7: o padrão do capítulo e o CSS do livro, que já existem
- `src/modules/mesa/CLAUDE.md` e `src/modules/mesa/ui/PainelDaMesa.tsx`
- `src/app/Painel.tsx`
- `e2e/controls.spec.ts` e `e2e/table.spec.ts`, para saber o que esperam (você não os roda nem os edita)

Decisões do orquestrador:

1. **`PainelDaMesa`** fica controlado: `PainelDaMesa({ aberto, onAlternar, onFechar })`, com os mesmos tipos do `Chat`.
   - Saem o `useState` de `open`, o `ref` e o `<button className="chat-toggle">Mesa <kbd>M</kbd></button>`.
   - A tecla M (com os filtros de hoje) chama `onAlternar()`. Esc com o painel aberto chama `onFechar()`, e o "Fechar painel da mesa" também.
   - O `<aside id="table-panel" aria-label="Personalizar mesa" data-open inert>` e todo o conteúdo não mudam: os E2E usam `#table-panel`, `getByLabel` e os `data-testid`.
   - Ele continua montado sempre, como hoje.

2. **Excluir uma mesa salva:** o botão mostra o texto "Excluir" no lugar de "🗑". O `aria-label` e o `confirm` não mudam.

3. **Casca:**
   - `Capitulo` ganha `'mesa'`.
   - O `nav` ganha, antes do Chat:

     ```tsx
     <button ref={(el) => { gatilhos.current.mesa = el; }} className="chat-toggle" aria-expanded={capitulo === 'mesa'}
       aria-controls="table-panel" aria-keyshortcuts="M" onClick={() => alternar('mesa')}>Mesa <kbd>M</kbd></button>
     ```

   - `<PainelDaMesa aberto={capitulo === 'mesa'} onAlternar={() => alternar('mesa')} onFechar={() => fechar('mesa')} />` sai do cabeçalho e entra no `.livro`.
   - O E2E acha o botão por `.chat-toggle` com o texto "Mesa". Não crie outro elemento com essa classe e esse texto.

4. **CSS do capítulo** (`.livro #table-panel`):
   - O `.import-body` vira página dupla com `column-count: 2` e `column-gap: 96px`.
   - Cada `fieldset`, o aviso de sessão, o `role="status"`, o alerta e o `alertdialog` dos avisos levam `break-inside: avoid`. Assim, "Fundo" e "Mesa" caem na página esquerda e "Arquivo" e "Mesas salvas" na direita, sem forçar a quebra.
   - **`legend`:** Cinzel 700, 13px, `letter-spacing: .16em`, maiúsculas, cor `--rubrica`, sem a borda de hoje. O `fieldset` também perde a borda.
   - **`.table-row`:** fica como está, com a fonte do livro.
   - **Os `range`:** `accent-color: var(--lacre)`.
   - **Os `input[type=color]`:** amostra de 48 × 30 px, borda `#8a6a3e`.
   - **O `select`:** com o estilo de botão do livro.
   - **Os botões de tipo de fundo** (Cor, Foto, 360°, Tema): grade de 4 colunas.
   - **Os temas:** grade de 3 colunas.
   - **"Exportar mesa", "Importar mesa", "Duplicar mesa" e "Restaurar mesa padrão":** grade de 2 colunas.
   - **`.table-list li`:** o nome da mesa ocupa a linha e o "Excluir" fica à direita.
   - **O texto pequeno** (`small`) e as notas: `--sepia`, itálico, 14px. Os erros (`.import-error`) em `#9b2a1a`.

5. **Docs do módulo.** O `CLAUDE.md` e, se citar o botão, o `NOTAS.md` da `mesa` dizem:
   - que o painel é controlado pela casca (`aberto`, `onAlternar`, `onFechar`);
   - que o M continua no módulo;
   - que o botão está na faixa de cima da casca.
   - Atualize o comentário do `cena.ts` ("The side sheet…").

6. **Testes.** Se algum teste da `mesa` renderiza o `PainelDaMesa`, ajuste-o às props novas. Não crie infraestrutura de teste de DOM que o módulo não tem: o E2E da OS-0055 cobre a tecla M e o foco.

Entregáveis:
1. O `PainelDaMesa` controlado e o "Excluir" nas mesas salvas.
2. O `Painel.tsx` com o capítulo da mesa.
3. O CSS do capítulo.
4. As docs da `mesa`.

Critérios de aceite:
- Existe um só botão `.chat-toggle` com o texto "Mesa", na faixa de cima da casca.
- M com a área de jogo focada: abre o livro na mesa. Esc: fecha e foca o botão "Mesa". Sem isso, `e2e/controls.spec.ts` quebra.
- Com o chat aberto, M (fora do campo) troca o capítulo para a mesa. Digitar "m" no campo do chat não troca.
- Exportar, importar (com o diálogo de avisos), duplicar, restaurar e excluir mesa funcionam como antes.
- `npm run build`, `npm run lint`, `npm test` e `npm run test:server` passam.
- **Sem E2E no dev.**

Fora do escopo:
- Trocar o fundo padrão da mesa (decisão do João, ordem própria).
- Qualquer mudança na cena 3D, no `FundoCss` ou nos limites do `.glb`.

Se precisar de algo fora disso: pare e reporte. Não implemente.
