# Ordem de serviço: rede de segurança dos tipos de dado, limites da mão e worker

Ordem: OS-0003 (RS-2 + RS-3, rede de segurança)
Escopo de escrita: `e2e/**` (specs novos ou casos novos nos existentes), `docs/contexto/testes.md`
Objetivo: os E2E passam a cobrir todos os tipos embutidos rolando, os limites da mão, as teclas dos painéis e os caminhos do worker que hoje não têm teste.

Leia antes de começar:
- `docs/contexto/testes.md` e `docs/diagnostico/testes.md` (matriz de cobertura e lacunas)
- `e2e/roll.spec.ts` (helpers de face de cima), `e2e/coin-performance.spec.ts` (como simula worker atrasado ou falho), `e2e/failure.spec.ts` (simulação por `addInitScript`)
- `src/scene/Stage.tsx:26-98` (`ThrowLoop`: `WORKER_TIMEOUT`, `fallback`), só leitura

Entregáveis:
1. **Cada tipo embutido rola e publica:** d4, d8 e d6 de fogo (`fire`), que nunca foram rolados em E2E. A face de cima lida da cena é igual ao resultado publicado, com o mesmo método que `roll.spec.ts` usa para os outros.
2. **Limites da mão:** com 10 dados, os botões "Adicionar …" ficam desabilitados; com 1 dado, o "−" fica desabilitado.
3. **Teclas:** `M` abre o painel "Personalizar mesa" e `Esc` o fecha. `M` digitado no input do chat não abre o painel.
4. **Worker que não responde:** com um `Worker` substituído por `addInitScript` por um que nunca responde, o arremesso ainda publica um resultado real (cálculo local depois de cerca de 2 s), igual à face de cima.
5. **Worker e cálculo local falham juntos:** caracterize o comportamento **atual**, seja ele qual for: falha `physics` registrada (`state().error`), a mensagem `data-testid="failure"` com o texto atual, e o canvas removido. Se não der para provocar a falha do cálculo local sem alterar `src/`, não altere: reporte o motivo e deixe só o item 4.
- `docs/contexto/testes.md`: registrar o que passou a ser coberto.

Critérios de aceite:
- `npm run build`, `npm run lint`, `npm test` e `npm run e2e` passando. Os E2E de hoje passam sem alteração nas asserções existentes.
- Os testes novos descrevem o comportamento de hoje: nenhum `expect` assume um comportamento "corrigido".
- Nenhum arquivo de `src/` ou `server/` alterado.

Fora do escopo:
- Qualquer arquivo fora de `e2e/` e `docs/contexto/testes.md`.
- Corrigir o caminho de falha da física (`docs/diagnostico.md` §10, item 1).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Arquivos: `e2e/roll.spec.ts` (3 casos novos, asserções antigas intactas), `e2e/controls.spec.ts` (novo), `e2e/worker.spec.ts` (novo), `docs/contexto/testes.md`. Nada em `src/` nem em `server/`.

1. `roll`: 3× d4, 3× d8 e 3× d6 de fogo; face de cima pelo `topValue` (o d4 pelo parâmetro `d4`) = resultado publicado; o painel mostra o total.
2. `controls`: com 1 d20, "Remover d20" desabilitado e os "Adicionar …" do grupo Dados habilitados; com 10 dados, todos os "Adicionar …" desabilitados.
3. `controls`: `m` abre `#table-panel`, `Esc` fecha e o foco volta ao botão "Mesa"; `m` e depois `M` no chat, uma tecla por vez, ficam no campo e o painel continua fechado depois de cada uma.
4. `worker`: o `Worker` do presim trocado por um mudo (`addInitScript`); o cálculo local entra entre ~2 e 5 s depois do pedido (limite inferior `>= 1990` ms, porque o falso marca o envio um pouco depois do Stage) e a face de cima bate com o resultado; `error` fica `null`.
5. `worker`: o worker mudo recebe um pedido cujas chaves lançam erro ao serem lidas; é o mesmo objeto que o `presimulateFor` local recebe, então o fallback falha de verdade (`poisonedReads >= 1`). **Comportamento atual registrado:** `error: 'physics'`, fase `hand`, a mesma mão, `results: null`, `throwId` +1, canvas removido, mensagem "Não foi possível carregar a física. Recarregue a página." e rodapé "A física não respondeu; os dados voltaram para a mão. Tente jogar de novo." É o defeito do diagnóstico §10 item 1, que o teste fixa como está; o comentário no spec avisa para refazer a simulação, e não afrouxar as asserções, se a refatoração clonar o pedido.

Verificação do dev: build e lint ok, `npm test` 331; `roll` + `controls` + `worker` 21/21 em duas rodadas; depois da devolução, `controls` + `worker` 5/5 em duas rodadas.

## Parecer do revisor

**Primeira rodada: DEVOLVIDO.** Bloqueante: `controls.spec.ts` digitava `'mM'` de uma vez; como o atalho alterna o painel, um filtro quebrado abriria e fecharia e o teste passaria. Observações: contar as leituras envenenadas e comentar a dependência do mesmo objeto; folga no limite de 2000 ms.

**Segunda rodada: APROVADO.**
- ✅ (a) Só `e2e/roll.spec.ts`, `e2e/controls.spec.ts`, `e2e/worker.spec.ts` e `docs/contexto/testes.md`.
- ✅ (b) Nada em `src/` nem em `server/`.
- ✅ (c) Itens 1 a 5 cobertos.
- ✅ (d) O item 5 descreve o caminho real (`presimulateFor` lança na entrada e cai no `catch` de `Stage.tsx:44-48`); nenhum `expect` assume correção.
- ✅ (e) Asserções antigas de `roll.spec.ts` intactas; o diff só acrescenta.
- ✅ (f) A doc confere.

Observação: `poisonedReads >= 1` está certo; não trocar por `toBe(1)`.

## Gate

2026-11-13, rodado pelo orquestrador depois da correção:

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 22 arquivos, 331 testes |
| `npm run test:server` | ✅ typecheck + 23 testes |
| `npm run e2e` | ⚠️ 97 de 98 (90 + 8 novos), 22,5 min; falhou `omen.spec.ts:145` (botão Dualidade) |
| `npx playwright test e2e/omen.spec.ts` (sozinho) | ⚠️ 13 de 15; falharam os botões Kraken e Tempestade |

**Aceite com ressalva.** As 3 falhas são do mesmo tipo e não vêm desta ordem:
- Todas dizem "nenhum arremesso com … em 6000 ms; este saiu comum": a busca por semente dos botões de teste (`BIAS_BUDGET.worker`) esgotou o tempo.
- Os botões que falham mudam de uma rodada para outra.
- Esta ordem não toca `src/` nem `omen.spec.ts`.
- Os mesmos casos passaram 86/86 no gate da OS-0001.
- Na hora, a máquina tinha 2,8 GB livres e 39% de CPU ocupada por outros projetos (servidores Expo do PontoPlusMobile com cerca de 20 workers, instâncias do Codex), sem nenhum processo desta worktree.

A fragilidade ficou registrada em `docs/contexto/testes.md`. Pendente: confirmar `omen.spec.ts` verde com a máquina livre antes de a fundação começar.
