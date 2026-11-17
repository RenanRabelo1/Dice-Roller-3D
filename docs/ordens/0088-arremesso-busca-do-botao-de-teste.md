# Ordem de serviço: arremesso, a busca do botão de teste em máquina lenta

Ordem: OS-0088 (backlog, item 7)
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/**`

Objetivo:
- O botão "Testar animações" e o `omen.spec.ts` acham o presságio pedido também em máquina lenta, sem o falso vermelho "nenhum arremesso com X em 6000 ms".

Como é hoje:
- A pré-simulação procura sementes até achar o presságio, com orçamento `BIAS_BUDGET = { worker: 6000, local: 3000 }` (`domain/presim.ts:82`).
- Com a renderização por software (todos os E2E) e a máquina ocupada, 6 s não bastam. O `omen.spec` falhou 3 a 5 de 15 em todo E2E, **também no `main` antes do HUD** (armadilhas.md).

Leia antes de começar:
- `src/modules/arremesso/CLAUDE.md`, `domain/presim.ts` (`presimulateFor`, o laço por semente), `domain/presim.worker.ts`, `scene/LoopDoArremesso.tsx` (quem pede ao worker) e `domain/vies.ts`
- [docs/contexto/armadilhas.md](../contexto/armadilhas.md), o item "Botão de teste de presságio é lento em máquina lenta"
- `e2e/omen.spec.ts`, os testes "test button …"

Decisões do orquestrador:

1. **O orçamento vem de quem pede.**
   - O `LoopDoArremesso` manda junto do pedido ao worker (e ao cálculo local) um `orcamento` em ms.
   - O worker e o local usam esse valor no lugar da constante.
   - O worker não importa `shared/plataforma`, então quem decide é a thread principal.
2. **O valor:**
   - com `renderizadorPorSoftware()`: **20000 ms** no worker e 10000 ms no local;
   - sem ele: os 6000 e 3000 de hoje;
   - deixe esses números em `BIAS_BUDGET` (`{ worker, local, workerSoftware, localSoftware }`).
3. **O tempo do worker:**
   - o `WORKER_TIMEOUT` (2 s sem resposta) **não** pode cortar uma busca longa legítima;
   - **só com teste de presságio pedido,** o timeout passa a ser o orçamento mais 2 s. Sem teste pedido, nada muda;
   - confira o fluxo no `LoopDoArremesso`.
4. **Fora do botão de teste, nada muda.** Um arremesso normal não procura nada, e o orçamento só vale quando há presságio pedido.
5. **Teste:** o orçamento escolhido por modo (software ou não) é uma função pura, `orcamentoDaBusca(software)`, com teste.
6. **Docs:** no `CLAUDE.md` do módulo, e o item de `docs/contexto/armadilhas.md` passa a dizer que o software tem 20 s. O `armadilhas.md` não é do módulo, então **reporte o texto** e o orquestrador aplica.

Entregáveis:
1. O orçamento por pedido.
2. O timeout coerente.
3. O teste.
4. O `CLAUDE.md`.

Critérios de aceite:
- `npm run build`, `npm run lint` e `npm test` passam. O worker continua sem importar React nem `shared/plataforma`.
- **Sem E2E:** o orquestrador roda o `omen.spec.ts` duas vezes depois de integrar.

Fora do escopo:
- O que o botão testa, a física, o viés (`vies.ts`) e os presságios.

Se precisar de algo fora disso: pare e reporte. Não implemente.
