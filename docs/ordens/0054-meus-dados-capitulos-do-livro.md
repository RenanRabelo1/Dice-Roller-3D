# Ordem de serviço: meus-dados, Meus dados e Importar dado viram capítulos do livro

Ordem: OS-0054 (HUD imersivo, parte 4 de 5)
Módulo: `meus-dados`
Escopo de escrita:
- `src/modules/meus-dados/**`
- **Casca:**
  - `src/app/Painel.tsx`;
  - `src/index.css`, só os dois capítulos (`#meus-dados` e `#import-die` dentro do `.livro`) e as regras que só eles usam (`.import-drop`, `.import-choice`, `.ink-pop`, `.ink-choice`, `.import-passos`).

Objetivo:
- A lista de dados importados sai do cabeçalho e vira o capítulo "Meus dados".
- O assistente vira o capítulo "Importar dado", com os passos visíveis e três correções do backlog.
- Os dois são controlados pela casca.
- Depois desta ordem, o cabeçalho tem só o título e o `nav`.

Leia antes de começar:
- [docs/hud-imersivo.md](../hud-imersivo.md), as decisões 1 a 4 e 9
- [OS-0052](0052-selecao-roda-e-chat-no-livro.md), as decisões 5 a 7 (o padrão do capítulo e o CSS do livro)
- `src/modules/meus-dados/CLAUDE.md`, `contracts.ts`, `index.ts`, `cena.ts`, `store.ts`, `ui/` e `tests/componentes.test.ts`
- [backlog.md](../backlog.md), item 4: o exemplo do assistente e "Esconder o número"
- `e2e/import.spec.ts`, para saber o que espera (você não o roda nem o edita)

Decisões do orquestrador:

1. **`MeusDados`** vira capítulo: `MeusDados({ aberto, onFechar, onImportar }: { aberto: boolean; onFechar: () => void; onImportar: () => void })`.

   ```tsx
   <aside id="meus-dados" className="chat panel import" data-open={aberto} inert={!aberto} aria-label="Meus dados">
     <header><h2>Meus dados</h2><button aria-label="Fechar Meus dados" onClick={onFechar}>×</button></header>
     <div className="import-body">
       {customs.length === 0 && <p className="import-note">Nenhum dado importado ainda.</p>}
       <div className="selection">{/* um <Meu/> por dado, como hoje */}</div>
       <button className="primary" onClick={onImportar}>Forjar um dado novo</button>
     </div>
   </aside>
   ```

   - O `div.selection` perde `role="group"` e `aria-label`: o aside já é o grupo "Meus dados".
   - Esc com o capítulo aberto chama `onFechar()`. Não há atalho de abrir.
   - Em cada `<Meu/>`, o botão de excluir mostra o texto "Excluir" no lugar de "🗑". O `aria-label` ("Excluir …") e o `confirm` não mudam.

2. **`Importacao`** (no `cena.ts`, onde fica o `import()` preguiçoso) vira `Importacao({ aberto, onFechar, onSalvo })`.
   - **Montagem:** guarde `montado` em estado local, monte só depois da primeira abertura e mantenha montado:

     ```tsx
     const [montado, setMontado] = useState(aberto);
     if (aberto && !montado) setMontado(true);
     ```

   - Ele passa `open={aberto}`, `onClose={onFechar}` e `onSaved={onSalvo}` ao `AssistenteDeImportacao`.
   - **No assistente,** o fim do `save` chama `onSaved()` em vez de `close()`, e também `reset()`. Fechar pelo × ou pelo Esc continua chamando `onClose()`.

3. **Sai o estado global do assistente.** Saem o store `assistente`, `alternarImportacao`, `fecharImportacao`, `useAssistente` e o tipo `EstadoDoAssistente` do `contracts.ts`.
   - Fora do módulo, ninguém os usa (conferido pelo orquestrador). A mudança de contrato está aprovada por esta ordem.
   - Atualize o `index.ts` e qualquer citação no `CLAUDE.md`.

4. **Os passos do assistente.** No topo do `.import-body`, antes de tudo, entra uma lista dos quatro passos:

   ```tsx
   <ol className="import-passos">
     <li aria-current={step === 'file' ? 'step' : undefined}>Arquivo</li>
     <li aria-current={step === 'shape' ? 'step' : undefined}>Forma</li>
     <li aria-current={step === 'numbers' ? 'step' : undefined}>Números</li>
     <li aria-current={step === 'save' ? 'step' : undefined}>Salvar</li>
   </ol>
   ```

5. **As correções do backlog** (item 4):
   1. **O botão nativo de arquivo some.**
      - O `<input type="file" data-testid="import-file">` fica com `className="sr-only"`, continua dentro do `label.import-drop`, focável e clicável pelo label.
      - Entra um `<span className="import-drop-botao" aria-hidden="true">Escolher arquivo</span>` com estilo de botão do livro. O texto de arrastar continua.
      - O E2E usa `setInputFiles` no `data-testid` e continua funcionando.
   2. **A explicação vem antes da ação e não é vermelha.**
      - Quando o erro é o `nao-padrao` (`notStandard` preenchido), a mensagem sai dentro do `.import-choice`, antes do botão "Importar como dado de forma livre", como `<p className="import-note" role="alert">`. O E2E procura `role="alert"` com "Não reconheci um d4–d20".
      - Nesse caso ela não se repete no `p.import-error` do fim.
      - Os outros erros continuam como estão.
   3. **A contagem some.** Sai a linha "Ignorei N faces onde o dado não para" (`imp.dropped`, linha ~328). O cálculo continua; só o texto sai.

6. **Casca:**
   - `Capitulo` ganha `'meus'` e `'importar'`.
   - O `nav` fica na ordem: Mesa, Meus dados, Importar dado, Chat.
     - **"Meus dados":** `className="chat-toggle"`, `aria-controls="meus-dados"`, `aria-expanded={capitulo === 'meus'}`, `onClick={() => alternar('meus')}`.
     - **"Importar dado":** mesma forma, com `aria-controls="import-die"`. O E2E clica no botão de nome "Importar dado"; tem que ser o único com esse nome.
   - No `.livro`:

     ```tsx
     <MeusDados aberto={capitulo === 'meus'} onFechar={() => fechar('meus')} onImportar={() => setCapitulo('importar')} />
     <Importacao aberto={capitulo === 'importar'} onFechar={() => fechar('importar')} onSalvo={() => setCapitulo('meus')} />
     ```

     Ao salvar, o livro vira a página para Meus dados, e o dado novo já aparece ali (o E2E espera "Adicionar d20 Caveira" visível logo depois de salvar).
   - O cabeçalho fica só com o `h1` e o `nav`. Agora ele pode ter `height: 64px` em vez de `min-height`, só acima de 800px.

7. **CSS dos capítulos:**
   - **`#meus-dados`:**
     - `.import-body` em duas colunas (`column-count: 2`); cada `.pick` é um cartão (borda `--fio`, padding 12px 14px) com `break-inside: avoid`;
     - "Forjar um dado novo" é botão principal (`--lacre`).
   - **A tinta dentro do livro:**
     - o `.ink-pop .ink-choice` deixa de ser popover (`position: static`, sem fundo escuro) e abre embaixo do cartão, em `--tinta`;
     - o `summary` "Tinta" com o estilo de botão do livro;
     - o E2E clica no texto exato "Tinta".
   - **`#import-die`:** grid de duas colunas com `column-gap: 96px`.
     - **Página esquerda:** `.import-passos`, a `.import-preview` (mais alta: 340px, sem borda, fundo radial suave) ou o `.import-drop` no passo do arquivo.
     - **Página direita:** o resto, na ordem do DOM.
     - Use `grid-column` nos três primeiros e deixe o resto na coluna 2. Não reordene o DOM.
   - **`.import-passos`:** quatro itens em linha. Cada um tem um círculo numerado (`counter`) de 30px com borda `--fio` e um rótulo em Cinzel 11px.
     - O item com `aria-current="step"` fica com o círculo `--lacre`, o número `#f6ecd6` e o rótulo `--tinta`.
   - **`.import-drop`:** borda tracejada `--fio` (não amarela), texto `--tinta` e o `.import-drop-botao` como botão do livro. O `:focus-within` fica com contorno `--tinta`.
   - **`.import-choice button.primary`:** `--lacre`, não latão.
   - **`.import-note`:** `--sepia`, itálico. **`.import-error`:** `#9b2a1a`.
   - **No celular:** uma coluna só nos dois capítulos.

8. **Docs do módulo.** O `CLAUDE.md` da `meus-dados` diz:
   - que "Meus dados" e "Importar dado" são capítulos controlados pela casca, com as props;
   - que o estado `importando`/`montado` saiu do store;
   - que salvar chama `onSalvo`.

9. **Testes.** O `tests/componentes.test.ts` compara com o cabeçalho legado, e isso deixa de valer de propósito. Troque por asserções do DOM novo:
   - `MeusDados` com e sem dados: o aside, `data-open`/`inert`, a nota de vazio, o "Excluir" com `aria-label` e "Forjar um dado novo";
   - `Importacao`: não monta antes da primeira abertura; depois de aberta e fechada, continua montada com `data-open="false"`;
   - o assistente renderiza `.import-passos` com o `aria-current` certo no passo do arquivo.
   - Apague a fixture se nenhum teste a usar mais.

Entregáveis:
1. `MeusDados`, `Importacao` e `AssistenteDeImportacao` como descrito, e o store e os contratos sem o estado do assistente.
2. O `Painel.tsx` com os dois capítulos e o cabeçalho final.
3. O CSS dos dois capítulos.
4. As docs e os testes da `meus-dados`.

Critérios de aceite:
- O cabeçalho só tem o `h1` e o `nav`, com 4 botões `.chat-toggle`.
- Importar um `.stl` padrão até salvar: o livro passa a mostrar Meus dados com o dado novo, e ele entra na mão (se houver espaço), como hoje.
- Um modelo não padrão: a explicação aparece antes do botão de forma livre, não em vermelho, e com `role="alert"`.
- Nenhum texto "Ignorei … faces".
- `grep -rn "alternarImportacao\|fecharImportacao\|useAssistente\|EstadoDoAssistente" src tests` não acha nada.
- `npm run build`, `npm run lint`, `npm test` (incluindo `tests/arquitetura/` e o `leitor.test.ts`, que vê o `import()` do `cena.ts`) e `npm run test:server` passam.
  - O chunk `AssistenteDeImportacao` continua separado.
- **Sem E2E no dev.**

Fora do escopo:
- A pose de calibração da forma livre (fica no backlog).
- A prévia 3D girando: fica como está (o João gosta).
- A detecção, a calibração e a gravação.

Se precisar de algo fora disso: pare e reporte. Não implemente.
