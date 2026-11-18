# Ordem de serviço: arremesso, busca dos testes de vampiro

Ordem: OS-0094
Módulo: `arremesso`
Escopo de escrita:
- `src/modules/arremesso/**`

Objetivo:
- Os botões de teste podem pedir os três presságios de vampiro.
- A busca por semente (física real) acha um arremesso que os toca.

Leia antes de começar:
- `src/modules/arremesso/CLAUDE.md`, `contracts.ts` (`OmenTest`, `RollRequest.bias`), `domain/vies.ts` (`plays`, `omenKinds`), `domain/presim.ts` (`presimulateFor`)
- `src/modules/regras/contracts.ts`: `TipoVampiro`, `PresagioVampiro` e `presagioVampiro` (OS-0090)

Decisões do orquestrador (mudança de contrato aprovada):

1. **`OmenTest` ganha três valores:** `'par-de-criticos' | 'critico-bestial' | 'falha-bestial'`, os mesmos nomes de `TipoVampiro`. Os cinco atuais ficam como estão.
   - O `'fire'` daqui é o presságio de **fogo do d20** e **fica**. Não tem relação com o d6 Fogo removido.
2. **`plays(test, kinds, results)`:**
   - nos três novos, `presagioVampiro(kinds, results)?.tipo === test`;
   - os cinco antigos não mudam;
   - reorganize o retorno antecipado (`if (!o) return false`) para não barrar os novos.
   - A regra de quem tem prioridade já está em `presagioVampiro`. Não a repita.
3. **`omenKinds`** continua igual: `vtm` e `hunger` passam como estão.

Entregáveis:
1. O contrato e o `plays`.
2. Testes:
   - `plays` nos três: positivo, negativo, e um d20 = 20 junto, que dá falso;
   - uma pré-simulação real com viés para cada um, que acha o valor pedido. Use o padrão de `pressagios/tests/omenTest.test.ts`, mas dentro de `arremesso/tests/`:
     - par: `['vtm', 'vtm']` com os dois em 10;
     - bestial: `['hunger']` com 10;
     - falha: `['hunger']` com 1.
3. `CLAUDE.md` do módulo atualizado.

Critérios de aceite:
- `npx vitest run src/modules/arremesso` passa.
- O worker continua sem React e sem `shared/plataforma`.

Fora do escopo:
- Os botões, a escolha dos dados na mão (`withDiceFor`) e o efeito visual: ficam com `pressagios`, na OS-0095.

Se precisar de algo fora disso: pare e reporte. Não implemente.
