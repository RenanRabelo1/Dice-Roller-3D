# Ordem de serviço: meus-dados, a ficha do dado forjado

Ordem: OS-0085 ([docs/janelas-de-previa.md](../janelas-de-previa.md), terceira janela)
Módulo: `meus-dados`
Escopo de escrita:
- `src/modules/meus-dados/**`
- **Casca:**
  - `src/index.css`, só o capítulo Meus dados (`.livro > #meus-dados`), num bloco `/* OS-0085: ficha do dado */`;
  - `e2e/import.spec.ts`, um teste novo.

Objetivo:
- No capítulo Meus dados, o botão **Editar** de um dado abre a **ficha** dele na página da direita, com uma animação.
- **A ficha mostra** o dado girando numa janela 3D e permite mudar, ao vivo:
  - a tinta e o acabamento;
  - a cor da gema;
  - o nome e o apelido;
  - se conta como d20 nos presságios.

Decisões do João (2026-11-17):

| Pergunta | Decisão |
|---|---|
| Como escolher o dado | O botão **"Tinta"** do cartão vira **"Editar"**, e abrir a ficha **tem motion design** (nada de aparecer de uma vez) |
| O que se edita | **Tinta e acabamento, cor da gema, nome e presságios do d20** |
| "Forjar um dado novo" | Vai para a página da esquerda, **embaixo da lista** |

Leia antes de começar:
- [docs/janelas-de-previa.md](../janelas-de-previa.md): o que vale para as janelas (canvas próprio montado só com o capítulo aberto, `dpr` 1, perfil leve, movimento reduzido, luz própria)
- `src/modules/meus-dados/CLAUDE.md`, `ui/MeusDados.tsx`, `ui/InkButton.tsx`, `ui/InkChoice.tsx`, `store.ts` (`atualizar`) e `tests/componentes.test.ts`
- `src/modules/selecao/ui/JanelaDosDados.tsx`, a janela de dado do chat (OS-0083): é o padrão a seguir, só para ler
- `src/modules/selecao/index.ts` (`slugProblem`, `slugOf`) e `src/modules/dados/index.ts` (`customDie`, `finishOf`, `carregarModelo`, `hasTexture`)
- `src/modules/dados/contracts.ts`: o `CustomDie` (`name`, `slug`, `color`, `ink`, `finish`, `omens`, `printed`, `base`, `file.format`)
- `src/index.css`: o bloco do Meus dados (OS-0054) e os tokens de movimento (`--t-*`, `--ease-*`, a virada `virar` da OS-0056)

Decisões do orquestrador:

1. **Layout do capítulo** (desktop), espelhando a mesa da OS-0082:
   - **Página esquerda:** o título, a lista de cartões e, embaixo dela, o botão **"Forjar um dado novo"**.
     - A lista continua paginada pela orelha (OS-0067). Use o mesmo truque da mesa (`column-count: 2` com `column-width` enorme), para a orelha contar uma coluna por folha.
   - **Página direita:** a ficha (`<section className="ficha-do-dado" aria-label="Ficha de <nome>">`).
     - **Sem dados forjados:** a direita mostra "Forje um dado para vê-lo aqui.", em itálico sépia.
   - **Celular:** a ficha fica abaixo da lista, e o botão Editar rola até ela.
2. **O cartão:** o `<details className="ink-pop">` com "Tinta" sai.
   - **Entra:** `<button aria-label="Editar <nome>" aria-pressed={escolhido}>Editar</button>`, para **todo** dado, e não só para os gravados.
   - **Ficam iguais:** o botão de pôr na mão (`BotaoDeDado`) e o **Excluir**.
   - **Qual abre:** ao abrir o capítulo, a ficha mostra o **primeiro** dado. Excluir o escolhido passa a ficha para o primeiro que restar.
3. **A janela 3D da ficha** (`ui/JanelaDoDado.tsx`): um `<Canvas>` próprio com o dado escolhido, por `AparenciaDoDado` da porta `dados/cena.ts`, `index` 0.
   - **Movimento:** gira devagar e aceita arrastar (`OrbitControls` sem zoom e sem pan). No perfil leve e no movimento reduzido, não gira sozinho.
   - **Montagem:** só com o capítulo aberto e com um dado escolhido.
4. **Os campos da ficha.** Cada um só aparece quando faz sentido para o dado, e a regra é pura: `camposDaFicha(die)` em `domain/ficha.ts`, com teste.

   | Campo | Quando aparece | Controle |
   |---|---|---|
   | Nome | sempre | `<input>` de texto, até 40 caracteres |
   | Apelido (o nome no chat) | sempre | `<input>`, com o exemplo ao lado ("Ex.: 2d20caveira") como no assistente |
   | Tinta | `printed` | o mesmo `InkChoice` de hoje |
   | Acabamento | dado STL (`file.format === 'stl'`) | o mesmo `InkChoice` (gema ou fosco) |
   | Cor da gema | dado STL | `<input type="color">` |
   | Conta como d20 nos presságios | `base === 'd20'` | `<input type="checkbox">` |

   - **Gravar:** cada mudança chama `atualizar({ ...die, ...patch })`, como o `InkButton` faz hoje. A cor espera 300 ms depois do último movimento, porque o seletor dispara sem parar.
   - **Nome e apelido** só gravam no Enter ou ao sair do campo, e só se forem válidos.
     - **Apelido:** é validado por `slugProblem` da `selecao`, comparando com os **outros** dados, sem o próprio. O erro aparece embaixo, em `<p role="alert">`, e nada é gravado.
     - **Mudar o apelido muda como se chama o dado no chat.** A mão não perde nada, porque ela guarda o dado pelo `id` (`custom:<id>`), e não pelo apelido. Confira isso.
     - **Nome vazio** volta para o anterior.
   - **A tinta de dado com textura:** o `tintaPermitida` continua valendo, como no `InkButton`, inclusive o `carregarModelo` e o `hasTexture` do `.glb`.
5. **Motion design**, o pedido do João. Use só `transform` e `opacity` (armadilhas.md) e os tokens `--t-curto`, `--t-medio`, `--t-longo` e `--ease-saida`/`--ease-cine`.
   - **No cartão:** ao escolher, a borda passa a `var(--rubrica)` e o cartão sobe 2 px com uma sombra curta (`--t-curto`). O anterior volta.
   - **Ao abrir ou trocar a ficha:**
     1. a página direita faz a virada `virar` da OS-0056 (`--t-medio`), saindo da lombada;
     2. o conteúdo antigo, se houver, some antes: `opacity` a 0 e desce 4 px em 150 ms;
     3. **o dado se materializa** na janela: `scale` de 0,6 a 1 e `opacity` de 0 a 1 em `--t-longo` `--ease-saida`, com um giro rápido que desacelera até o giro lento (no `useFrame`, a velocidade cai de 6 rad/s para a normal em 700 ms);
     4. atrás do canvas, um **lampejo dourado**: um `radial-gradient` âmbar que sobe de `opacity` 0 a 0,5 e volta a 0 em 600 ms, como luz de forja;
     5. os campos entram **em cascata**: cada linha sobe 8 px e aparece, com 50 ms de atraso entre elas, começando em 200 ms.
   - **Ao mudar uma característica:** o dado dá um pulso de confirmação, `scale` 1 → 1,04 → 1 em 180 ms.
   - **Movimento reduzido:** nada anima. A ficha troca na hora, o dado não gira, e não há pulso nem lampejo.
   - **Perfil leve:** as animações de CSS ficam, porque são baratas. O canvas usa `frameloop="demand"`: redesenha ao trocar de dado ou de característica e ao arrastar.
6. **Docs do módulo:** no `CLAUDE.md` e no `NOTAS.md`, a ficha, o que cada campo grava e a validação do apelido. Registre também que o `InkButton`/`ink-pop` saiu, se sair mesmo.
7. **Testes:**
   - **`domain/ficha.ts`:** os campos por tipo de dado (STL gravado de base d20, GLB sem gravação, STL de forma livre).
   - **`componentes.test.ts`:** o cartão com o botão **Editar**, e o **Forjar** embaixo da lista. As fixtures acompanham.
   - **E2E** em `e2e/import.spec.ts`, depois de importar o d20 Caveira:
     - "Editar d20 Caveira" mostra um `canvas` dentro de `.ficha-do-dado`;
     - escolher a tinta "Dourada" faz o `window.__dice.customs()` trazer o dado com tinta de ouro;
     - um apelido inválido (`d20`) mostra o alerta e não muda o dado.

Entregáveis:
1. O layout com o Forjar embaixo da lista.
2. O botão Editar e a ficha com a janela 3D e os campos.
3. O motion design.
4. Os testes e as docs.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` (incluindo `tests/arquitetura/`) passam.
  - A `meus-dados` usa só as portas de `dados`, `selecao` e `regras`.
  - O importador continua carregando sob demanda (`leitor.test.ts`).
- **Sem E2E nem servidor de dev no dev:** o orquestrador roda e o João testa.

Fora do escopo:
- Trocar o arquivo do dado, recalibrar a forma e mexer no assistente de importação.

Se precisar de algo fora disso: pare e reporte. Não implemente.
