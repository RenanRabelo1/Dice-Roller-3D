# Ordem de serviço: histórico, sem o d6 Fogo

Ordem: OS-0093 (consumidor da OS-0090; fecha o grupo OS-0090 a OS-0093)
Módulo: `historico` (cliente `src/modules/historico/` e servidor `server/src/modules/historico/`)
Escopo de escrita:
- `src/modules/historico/**`, `server/src/modules/historico/**`
- `tests/custom.test.ts` (ampliação autorizada pelo orquestrador durante a execução): só a troca dos apelidos reservados obsoletos `fogo`/`boladefogo` (linhas 33 e 124) por palavras que continuam reservadas, porque o gate do grupo precisa disso

Objetivo:
- A API e o cliente do histórico seguem corretos sem o `fire`.
  - Uma jogada nova com `fire` é recusada pelo esquema, que já usa `KINDS`.
  - Um registro antigo com `fire`, já gravado no Mongo, ainda pode ser lido.

Leia antes de começar:
- `src/modules/historico/CLAUDE.md`
- `server/src/modules/historico/contracts.ts`, `repository.ts` (validador `$jsonSchema`), `service.ts`
- `tests/api.test.ts`: o caso que manda `{ kind: 'fire', value: 6 }`

Entregáveis:
1. O teste da API usa outro dado no lugar do `fire`. Mantenha o total: troque por `{ kind: 'd6', value: 6 }`.
2. Um teste novo: um `POST` com `fire` responde 400.
3. **Leitura do antigo.** Confira que a leitura (`GET`) não valida a saída contra `KINDS` a ponto de falhar com um documento antigo `fire`.
   - Se falhar, ajuste só a saída para aceitar qualquer `kind` texto, com um teste.
   - Não mexa no validador do Mongo além do que vem de `KINDS`.
4. `CLAUDE.md` do módulo, se o comportamento mudou.

Critérios de aceite:
- `npm run test:server` passa.
- **Fim do grupo:** `npm run build && npm run lint && npm test` passam com as OS-0090 a OS-0093 juntas.

Fora do escopo:
- Migrar ou apagar dados no Atlas.

Se precisar de algo fora disso: pare e reporte. Não implemente.
