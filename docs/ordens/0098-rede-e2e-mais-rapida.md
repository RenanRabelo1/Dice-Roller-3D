# Ordem de serviço: rede de segurança, E2E mais rápido

Ordem: OS-0098 (pedido do usuário em 2026-11-18: "os testes E2E estão demorando demais")
Módulo: nenhum. É a rede de segurança da raiz (`e2e/`, ADR 0007), sem regra de negócio.
Escopo de escrita:
- `playwright.config.ts`, `package.json` (só os scripts `e2e*`), `e2e/**`
- Nenhum arquivo em `src/` ou `server/`

Objetivo:
- O `npm run e2e` completo cai de ~38 min para **≤ 15 min**, sem perder cobertura. **Revisto na revisão:** ≤ 30 min com 3 workers. O SwiftShader é limitado pela CPU: 3 workers rodaram em 17 min e 4 em 31. A primeira entrega mediu 44min11s → 28min41s. Como a suíte completa agora só roda nos marcos (fim de um grupo de ordens e antes do PR), o ganho que importa no dia a dia é o `e2e:rapido`.
- Um `npm run e2e:rapido` de **≤ 4 min** serve para o dia a dia.

Medição de hoje (`npm run e2e`, `workers: 1`, 116 testes, 37,7 min):

| Spec | Tempo | Testes |
|---|---|---|
| omen | 9,2 min | 18 |
| table | 5,5 min | 11 |
| import | 5,2 min | 10 |
| roll | 4,2 min | 16 |
| screens | 2,7 min | 10 |
| hud | 2,4 min | 7 |
| controls | 1,6 min | 9 |
| history | 1,3 min | 4 |
| chat | 1,1 min | 6 |
| smoke | 1,0 min | 6 |
| demais | ~3 min | — |

A máquina tem 16 núcleos e 16 GB.

Decisões do orquestrador:

1. **Paralelo onde pode, em série onde o tempo importa.** Dois projetos no `playwright.config.ts`:
   - `paralelo`: todos os specs exceto os sensíveis a tempo, com vários workers. Meça 3 e 4 e escolha o mais rápido que passe estável duas vezes seguidas.
   - `sequencial`, com 1 worker, rodando **depois** do paralelo e com a máquina livre:
     - `omen.spec.ts`: a busca do botão de teste tem orçamento de tempo;
     - `coin-performance.spec.ts` e `coin-software.spec.ts`: medem desempenho;
     - `hud.spec.ts`: conta programas e luzes.
   - O `npm run e2e` roda os dois em sequência e sai com erro se qualquer um falhar, mas **sempre roda os dois**: uma falha no paralelo não esconde o resultado do sequencial.
   - Cada worker tem o próprio estado. Confira que nenhum spec depende de outro nem de dado deixado por outro: IndexedDB, `localStorage` e a porta do stub da API. Se algum depender, corrija o teste, não a ordem.
2. **Botões de teste do presságio** (`omen.spec.ts`, os 8 "test button …", ~5,5 min):
   - **um** arremesso real por botão, em vez de dois;
   - depois dele, confira que o botão continua ligado (`aria-pressed="true"`) com os dados de volta na mão, e então o desligamento como hoje.
   - A cobertura do segundo arremesso já existe nos testes unitários (`plays`, `withDiceFor` e a pré-simulação com viés de cada um, em `arremesso/tests` e `pressagios/tests`).
3. **`e2e:rapido`:**
   - Marque com a tag `@rapido` um conjunto mínimo que cubra os caminhos centrais:
     - jogo abre;
     - arremesso com o resultado igual à face de cima;
     - recolher;
     - chat com notação;
     - um presságio forçado (`rigOmen`);
     - um botão de teste;
     - moeda;
     - mesa (troca de tema);
     - importar um d20 STL;
     - falha do renderizador.
   - É um caso por área, sem duplicar.
   - Script: `"e2e:rapido": "playwright test --grep @rapido"`. Meta: ≤ 4 min.
4. **Nada é apagado.** Os testes continuam no `npm run e2e`; só mudam a ordem e o paralelismo, mais o item 2.
5. **Fora daqui:** os 14 vermelhos herdados da `main` (`docs/backlog.md` §10: `screens`, `table` e a contagem de luzes do `hud`). Não os conserte nesta ordem. Eles continuam vermelhos e devem ser os **mesmos** de antes, sem vermelho novo.

Entregáveis:
1. `playwright.config.ts` com os dois projetos e os scripts `e2e` e `e2e:rapido`.
2. `omen.spec.ts` com um arremesso por botão.
3. As tags `@rapido`.
4. No relatório:
   - o tempo e o resultado de `npm run e2e` **duas vezes** seguidas;
   - o tempo e o resultado de `npm run e2e:rapido`;
   - a lista de falhas comparada com a de antes (as 14 herdadas);
   - o texto proposto para `docs/contexto/testes.md` e para a linha "Gate" do `CLAUDE.md` da raiz, que ficam com o orquestrador.

Critérios de aceite:
- `npm run e2e` ≤ 15 min, com o mesmo conjunto de falhas herdadas e nenhuma nova, nas duas rodadas.
- `npm run e2e:rapido` ≤ 4 min, verde.
- `npm run build && npm run lint && npm test` passam.
- Commit: `test(e2e): ... [OS-0098]`.

Se precisar de algo fora disso: pare e reporte. Não implemente.
