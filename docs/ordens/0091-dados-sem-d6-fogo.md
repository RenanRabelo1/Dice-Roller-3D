# Ordem de serviço: dados, sem o d6 Fogo

Ordem: OS-0091 (consumidor da OS-0090)
Módulo: `dados`
Escopo de escrita:
- `src/modules/dados/**`
- `e2e/roll.spec.ts`: só o laço `for (const kind of ['d4', 'd8', 'fire'] ...)`, que passa a usar `['d4', 'd8', 'd6']`

Objetivo:
- O módulo `dados` deixa de conhecer o `fire`: aparência, cor, nome de exibição, ordenação e testes.

Leia antes de começar:
- `src/modules/dados/CLAUDE.md`
- `domain/aparencia.ts`, que tem `fire` em três tabelas
- `tests/nome.test.ts`, `tests/polyhedra.test.ts`, `tests/read.test.ts`

Entregáveis:
1. Nenhuma ocorrência de `fire`, `Fogo` ou `Fireball` em `src/modules/dados/**`. A exceção é o que trata do presságio de fogo, que não é deste módulo; aqui não deve haver nenhum.
2. Testes ajustados:
   - sai o "Fireball d6";
   - a ordem esperada de `KINDS` fica sem `fire`;
   - `toResults` sem o `fire`.
3. `CLAUDE.md` do módulo sem o "d6 Fogo".

Critérios de aceite:
- `npx vitest run src/modules/dados` passa.
- `grep -rn "fire\|Fogo" src/modules/dados` vazio.

Fora do escopo:
- O presságio de fogo do d20 (`pressagios`), que **fica**.

Se precisar de algo fora disso: pare e reporte. Não implemente.
