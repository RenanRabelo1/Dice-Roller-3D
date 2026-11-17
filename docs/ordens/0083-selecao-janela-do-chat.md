# Ordem de serviço: selecao, a janela dos dados no chat

Ordem: OS-0083 ([docs/janelas-de-previa.md](../janelas-de-previa.md))
Módulo: `selecao`
Escopo de escrita:
- `src/modules/selecao/**`
- **Casca:**
  - `src/index.css`, só o capítulo do chat (`.livro > #dice-chat`), num bloco `/* OS-0083: janela do chat */`;
  - `e2e/chat.spec.ts`, um teste novo.

Objetivo:
- Enquanto o jogador digita a notação no chat, uma janela 3D na página direita mostra os dados que ele está escrevendo, girando.

Leia antes de começar:
- [docs/janelas-de-previa.md](../janelas-de-previa.md), inteira
- `src/modules/selecao/CLAUDE.md`, `ui/Chat.tsx` e `domain/notacao.ts` (`parseDice`)
- `src/modules/dados/cena.ts` e `scene/AparenciaDoDado.tsx`: a aparência de um dado pelo tipo
- `src/modules/meus-dados/ui/AssistenteDeImportacao.tsx`, o `Preview` e o `Canvas`: é o padrão de janela a seguir, só para ler
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), a seção Desempenho

Decisões do orquestrador:

1. **`ui/JanelaDosDados.tsx`** (novo).
   - **Raiz:** `<div className="janela-dos-dados" role="img" aria-label="Prévia dos dados">`, com um `<Canvas>` com `dpr={1}`, `gl={{ alpha: true, antialias: true }}` e `frameloop={perfilLeve() ? 'demand' : 'always'}`.
   - **Montagem:** o `Chat` renderiza `{aberto && <JanelaDosDados texto={text} />}`, entre a lista de mensagens e o formulário.
2. **A leitura ao vivo:**
   - a janela passa o `texto` por `parseDice` 150 ms depois da última tecla;
   - com `dice`, mostra os dados;
   - vazio ou com `error`, mostra a janela vazia com `<p className="janela-vazia">Digite os dados para vê-los aqui.</p>` por cima;
   - o erro **não** aparece ao vivo e continua indo para o log só ao enviar, como hoje.
3. **Os dados na janela:**
   - em fileiras de até 5, centralizadas, com um espaço que caiba o maior raio (`RAIO_MAXIMO` de `dados`);
   - cada um é um `<group>` com a aparência de `dados`, girando devagar no próprio eixo, cada um com uma fase diferente;
   - a câmera enquadra a fileira mais larga.
   - **Aparência do dado:** use `AparenciaDoDado` da porta `dados/cena.ts`.
     - **O orquestrador já conferiu que ele funciona fora da cena principal:** o `index` só nomeia os objetos (`die-i`, `gem-i`), cada canvas tem a própria cena, e o `useThree` dele usa a cena da janela.
     - Passe `index` = posição do dado na prévia.
     - O espaço entre os dados sai de `RAIO_MAXIMO`, que está no `index.ts` de `dados`.
4. **Luz e giro:**
   - **luz:** própria, com `ambientLight` 0,35 e uma `directionalLight` `#fff1dc` 2,5, sem sombra;
   - **controles:** `OrbitControls` sem zoom e sem pan, para o jogador girar o conjunto;
   - **movimento reduzido ou perfil leve:** sem giro automático;
   - **no leve,** chame `invalidate()` quando a lista de dados mudar e no `change` dos controles.
5. **Layout** (casca, `src/index.css`):
   - **Desktop:** a janela fica na página direita, entre a dica e o formulário, com cerca de 240 px de altura e a largura da página.
   - **Celular:** 160 px.
   - **Cuidado:** não mexa no véu, no ×, no folhear nem nos seletores do E2E (`.chat-log`, o campo "Dados, por exemplo").
6. **E2E** em `e2e/chat.spec.ts`: "typing dice shows them in the chat preview".
   - Com o chat aberto, há um `canvas` dentro de `.janela-dos-dados`, e o "Digite os dados" aparece.
   - Digitar `2d20 + d6`, sem enviar, faz o aviso sumir.
   - Fechar o chat tira o canvas.
7. **Docs do módulo:** o `CLAUDE.md` da `selecao` (a janela e a dependência visual de `dados/cena.ts`).

Entregáveis:
1. `JanelaDosDados` e a linha no `Chat`.
2. O CSS.
3. O E2E e as docs.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` (incluindo `tests/arquitetura/`) passam. A `selecao` só usa a porta `cena.ts` e o `index.ts` de `dados`.
- **Sem E2E nem servidor de dev no dev:** o orquestrador roda e o João testa.

Fora do escopo:
- A mesa (OS-0082) e a regra da notação.
- Mostrar a mão atual quando o campo está vazio: o João escolheu "enquanto digita".

Se precisar de algo fora disso: pare e reporte. Não implemente.
