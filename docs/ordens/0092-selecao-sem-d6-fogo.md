# Ordem de serviço: seleção, sem o d6 Fogo

Ordem: OS-0092 (consumidor da OS-0090)
Módulo: `selecao`
Escopo de escrita:
- `src/modules/selecao/**`
- `e2e/chat.spec.ts`: só o teste `"bola de fogo" puts 8 fire d6 in the hand…`, que sai

Objetivo:
- A notação e o chat deixam de aceitar o Fogo.
  - `6fogo`, `8d6fogo`, `bola de fogo` e `Bola de Fogo + d20` passam a dar o erro comum ("Não entendi"), como qualquer texto desconhecido.
  - O botão "Adicionar d6 Fogo" some, porque a lista vem do catálogo.

Leia antes de começar:
- `src/modules/selecao/CLAUDE.md`
- `domain/notacao.ts`: o alias `['6fogo', 'fire']` e o atalho "bola de fogo", que põe 8 `fire`
- `tests/notacao.test.ts`

Entregáveis:
1. A notação sem os aliases e sem o atalho.
2. Os testes:
   - os casos de Fogo trocados por um teste de que `bola de fogo` e `8d6fogo` são recusados;
   - o `formatDice` sem `fire`.
3. Se houver mão ou seleção persistida, confira que um `fire` antigo não quebra a carga. Se a carga validar os tipos pelo catálogo, já basta; caso contrário, descarte o tipo desconhecido e escreva um teste.
4. `CLAUDE.md` do módulo atualizado.

Critérios de aceite:
- `npx vitest run src/modules/selecao` passa.
- `grep -rni "fogo\|'fire'" src/modules/selecao` vazio, exceto o teste de recusa.

Fora do escopo:
- Qualquer outro alias.

Se precisar de algo fora disso: pare e reporte. Não implemente.
