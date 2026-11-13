# Plano de execução da refatoração

Base: [diagnostico.md](diagnostico.md), [mapa-modulos.md](mapa-modulos.md), ADRs 0001 a 0008 e [specs/](specs/).

Em 2026-11-13 o responsável humano autorizou seguir sem novas aprovações. As recomendações e as suposições da entrega 1 passam a valer como decididas. O orquestrador só para para consultar quando algo exigir um ADR novo ou contradisser o que está aqui.

## 0. Princípios

- **A refatoração não muda comportamento.** Os defeitos do diagnóstico (§10) ficam como estão e vão para `docs/backlog.md`. Corrigir um deles é uma demanda à parte, pelo fluxo da seção 8 do guia.
- **Um passo por vez, com o sistema verde ao fim de cada ordem**: o gate abaixo passa.
- **Gate desta refatoração:** `npm run build && npm run lint && npm test && npm run test:server && npm run e2e`. O `test:server` é criado na fase 3 (ordem RS-4).

## 1. Rede de segurança (fase 3)

### O que já está coberto e passa hoje

Rodado em 2026-11-12: unitários 324/324, E2E 80/80, API 23/23. A matriz completa está em [diagnostico/testes.md](diagnostico/testes.md). Os E2E cobrem pela interface:

- a seleção por botões e pelo chat;
- o arremesso por ponteiro, Espaço e reduced motion;
- a face de cima igual ao resultado publicado, d100×10, a seleção mista e a moeda;
- os presságios forçados e o d100 = 1 real;
- importar, calibrar, recarregar e excluir dado;
- mesa e fundo, exportar e importar, a migração do IndexedDB de v1 para v2;
- as falhas na carga;
- o desempenho com 10 moedas.

Os testes de física em Node rodam a mesma `presimulate` do app.

### O que falta antes de mover código

Lacunas que uma mudança de pasta pode quebrar sem que nenhum teste perceba:

| Funcionalidade | Por que importa para a refatoração | Ordem |
|---|---|---|
| Trabalho paralelo integrado (`feat/modo-de-rolagem`) | a rede precisa cobrir o código que vai ser movido | RS-0 |
| O histórico envia um POST por resultado, com o corpo certo | o gatilho sai da casca e vai para o `historico`; hoje nenhum E2E cobre isso | RS-1 |
| Todos os tipos embutidos rolam e publicam (d4, d8 e d6 de fogo nunca foram rolados em E2E) | `dados` e `arremesso` mudam de lugar | RS-2 |
| Limites da mão nos botões (10 dados, 1 dado) e teclas `M`/`Esc` | `selecao` e `mesa` levam os componentes | RS-2 |
| Worker que não responde → o cálculo local publica o resultado; worker e cálculo local falham juntos → comportamento atual (falha `physics` registrada, mensagem, canvas removido) | o `ThrowLoop` vai para o `arremesso`; hoje nenhum teste cobre esses caminhos | RS-3 |
| A suíte da API no gate | o servidor passa a importar `regras`; hoje o gate não roda a API | RS-4 |

Os imports por URL de `src/` nos E2E (`kraken`, `coin-performance`, `table-kraken`) não são trocados agora. Cada ordem de extração que mover o arquivo-alvo atualiza o caminho, e isso consta na spec do módulo.

## 2. Fundação (fase 4)

| Ordem | Cria |
|---|---|
| F-1 | Testes dentro dos módulos: o `include` do Vitest (`src/**/tests/**/*.test.ts`), o `exclude` no `tsconfig.app.json`, o `include` no `tsconfig.test.json` e no `server/vitest.config.ts` (ADR 0007) |
| F-2 | `src/shared/events.ts` (sinal síncrono, ADR 0005), com testes |
| F-3 | `src/shared/math`: `Vec3`, `Quat`, `Pose`, `easeOut`, `clamp01`, `span`. Troca os importadores de `physics/world.ts` (tipos) e de `showcase`/`highlight`/`krakenMotion` (utilitários). Isso desfaz o ciclo de tipos `dice → physics` |
| F-4 | `src/shared/db` (o atual `src/indexedDb.ts`): cada módulo declara a própria store, e o `shared/db` não conhece nenhum nome de store |
| F-5 | `src/shared/plataforma`: a falha registrada (hoje `store.error`), `Guard`/`Failure`, a sonda de WebGL, o movimento reduzido com evento, o renderizador por software. Tira `error` e `reducedMotion` do `useDice`. Desfaz o ciclo `scene ↔ ui` do lado do `Guard` |
| F-6 | `src/shared/modelos3d`: `parseGlb`/`readModel` saem de `dice/importer.ts`, com os limites por parâmetro. A `tableFile.ts` passa a usá-lo e para de identificar erro pelo nome da classe |
| F-7 | Testes de arquitetura em `tests/arquitetura/` (ADR 0006): o `dependency-cruiser` com parser `swc` (ou o leitor próprio, se o `swc` não enxergar `import()` e `new URL`), as regras de import e ciclo e o teste de dono dos dados (lê o bloco `donos-dos-dados` do mapa). Os ciclos que ainda existem no legado entram como exceção, citando este plano, e somem até a fase 7 |
| F-8 | `src/app/`: a casca. A `Stage.tsx` vai para `src/app/Cena.tsx` e o `testHook.ts` para `src/app/`. A casca passa a montar o `window.__dice` a partir das partes |

O `CLAUDE.md` raiz é reescrito pelo orquestrador ao fim da fundação, no formato do guia: visão geral, as regras da seção 2 com as adaptações dos ADRs, o mapa de módulos e onde ficam as coisas. A tabela "Tarefa → Ler" muda de `docs/contexto/` para o `CLAUDE.md` de cada módulo à medida que os módulos forem extraídos.

## 3. Como as ordens das fases 3 e 4 são delimitadas

O formato da seção 6 do guia pressupõe um módulo. Enquanto os módulos não existem, as ordens trocam o campo `Módulo:` por `Escopo de escrita:`, uma lista fechada de caminhos:

- **RS-n (rede de segurança):** só `e2e/**`, `tests/**`, `playwright.config.ts`, `package.json` (scripts) e o `docs/contexto/*.md` que descreve o que a ordem mudou (regra 8). Nenhum arquivo de `src/` ou `server/src/`, com uma exceção: a RS-0, que integra uma branch e é revisada pelo diff do merge.
- **F-n (fundação):** `src/shared/<parte>/**`, mais os pontos de chamada no legado que a ordem lista nominalmente. É o "dev de shared" do guia.

As ordens de extração (fase 5) usam o formato do guia. O escopo de escrita é:

- o módulo (`src/modules/<m>/**` e, no histórico, `server/src/modules/<m>/**`);
- os pontos de chamada no legado e na casca, listados na ordem;
- os testes que movem para o módulo.

O legado não é módulo, então trocar uma chamada nele não fere a regra 6. Uma ordem nunca altera **outro módulo já extraído**: se precisar, para e reporta.

**Tamanho.** Uma ordem que exige ler mais de um módulo inteiro, ou que toca mais de cerca de 15 arquivos, é dividida. Os módulos grandes (`dados`, `arremesso`, `pressagios`) saem em duas ou três ordens:

1. `contracts.ts` + `index.ts` + `domain/`;
2. componentes e cena;
3. a remoção do legado.

Cada uma deixa o sistema verde.

**Convivência com o legado:**

- O legado pode importar o `index.ts` de um módulo extraído.
- Um módulo extraído não importa arquivo do legado. Quando precisar de algo que ainda está lá, a casca entrega por parâmetro ou por função. Por exemplo, o `historico` recebe o arremesso pronto da casca até o `arremesso` existir.
- Ponte assim é temporária e fica anotada no `CLAUDE.md` do módulo, como "Consome (provisório)". A fase 6 remove todas.

## 4. Diff isolado e registro das ordens

- Cada ordem vive em `docs/ordens/NNNN-<titulo>.md`, no formato do guia. Quando termina, ganha três blocos no fim: o **relatório do dev**, o **parecer do revisor** (o checklist da seção 7, item a item) e o **gate**, com os comandos e o resultado.
- **Execução:**
  - o dev é um subagente sem contexto da sessão; recebe só a ordem e os arquivos que ela manda ler;
  - trabalha nesta worktree e deixa a mudança sem commit;
  - uma ordem por vez.
- **Revisão:**
  - o revisor é outro subagente;
  - lê o `git diff` da ordem, o `docs/mapa-modulos.md` e a ordem;
  - não escreve nada e emite o parecer;
  - item reprovado devolve a ordem ao dev, com o item citado.
- **Aceite:**
  - o orquestrador roda o gate;
  - faz um commit por ordem em `refac/first-complete`, com a mensagem `refac(<escopo>): <título> [OS-NNNN]` e a ordem atualizada no mesmo commit;
  - isso dá um diff isolado por ordem, que se revisa ou reverte sozinho;
  - nada é enviado ao remoto (sem push).
- **Gate por ordem:** `build`, `lint`, `test` e `test:server` sempre. `e2e` completo em toda ordem que toca `src/scene`, `src/ui`, `src/app`, um componente de módulo ou `e2e/`, e sempre no aceite de cada módulo. Os E2E rodam um por vez na máquina (ver `docs/contexto/testes.md`).
- **Auditoria periódica** (seção 8 do guia): a cada módulo concluído, ou a cada dez ordens, o revisor confere o `CLAUDE.md` dos módulos contra o código e o mapa contra o grafo real.

## 5. Destino da documentação existente

| Hoje | Destino |
|---|---|
| `CLAUDE.md` raiz (aponta para `docs/contexto/`) | reescrito na fundação no formato do guia |
| `docs/contexto/visao-geral.md` | absorvido pelo `CLAUDE.md` raiz e pelo mapa; sai ao fim da fundação |
| `docs/contexto/{arremesso,dados,apresentacao,mesa}.md` | o conteúdo de cada módulo vai para o `CLAUDE.md` dele quando ele é extraído (30 a 50 linhas; detalhe a mais vai para `src/modules/<m>/NOTAS.md`, que só se lê quando a ordem manda). O arquivo sai quando o último módulo que ele cobre é extraído |
| `docs/contexto/armadilhas.md` | fica: são invariantes do sistema que atravessam módulos. Cada armadilha ganha o módulo a que se refere |
| `docs/contexto/testes.md` | fica, para E2E, `window.__dice` e o gate. Os testes unitários passam a ser descritos no módulo |
| `docs/specs/<m>.md` | sai quando o módulo é extraído (absorvida pelo `CLAUDE.md` e pelo `contracts.ts`) |
| `docs/superpowers/`, `.superpowers/` | histórico; ficam como estão |

## 6. Trabalho em paralelo

- **`feat/modo-de-rolagem`.** O snapshot `1e4d815` (2 commits) entra nesta branch na RS-0, antes de qualquer movimentação, por merge com os 4 conflitos resolvidos. A outra branch não é alterada.
  Commits feitos lá depois disso continuam possíveis até o primeiro módulo ser extraído. A partir daí, o custo de juntar cresce a cada ordem, e a recomendação é parar feature nova nos arquivos do legado até o módulo correspondente sair. Feature nova entra pelo fluxo da seção 8 do guia, no módulo já extraído.
- **`feat/dice-3d`.** Os 11 commits já estão em `origin/main` com outro hash. Não entram.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| A entrega síncrona dos eventos não reproduz o "retrato único" do `publish` e o resultado aparece antes do presságio por um quadro | E2E `omen` e um teste no módulo `pressagios` sobre a ordem dos eventos |
| Desempenho: mover a cena muda a ordem de `useFrame`/`useBeforePhysicsStep`, o número de luzes ou a compilação de shaders | as regras de `armadilhas.md` entram no `CLAUDE.md` dos módulos de cena; E2E `coin-performance` e `coin-software` no gate; checar `gl.info.programs` |
| Chunks sob demanda viram estáticos sem aviso (ADR 0007, ponto 11) | todo aceite confere a lista de chunks do `vite build` |
| O `dependency-cruiser` não funciona com o TS 7 | F-7 testa antes e tem o leitor próprio como alternativa |
| Os E2E que importam `src/` por URL quebram em silêncio | a spec de cada módulo lista quais; a ordem atualiza o caminho |
| Os orçamentos de desempenho dos E2E dependem da carga da máquina | E2E um por vez, sem agentes pesados rodando junto; uma falha só de desempenho é investigada antes de reprovar |
| Commits novos em `feat/modo-de-rolagem` depois da RS-0 | seção 6 |
| A casca acumula ponte provisória | toda ponte fica anotada e a fase 6 remove todas; a auditoria confere |
| O módulo `dados` vira o "módulo que todos consomem" | o critério de entrada é estreito (ver a spec); a auditoria acompanha o tamanho |

## 8. Ordem de execução

RS-0 → RS-1 → RS-2 → RS-3 → RS-4 → F-1 … F-8 → reescrever o `CLAUDE.md` raiz → extrair `regras`, `historico`, `dados`, `selecao`, `meus-dados`, `arremesso`, `mesa`, `pressagios`, `vitrine` → desacoplamento (fase 6: remover as pontes) → limpeza (fase 7: código sem uso, exceções zeradas nos testes de arquitetura).
