# Ordem de serviço: limpeza da auditoria, historico

Ordem: OS-0080 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: `historico` (cliente e servidor)
Escopo de escrita:
- `src/modules/historico/**`
- `server/src/modules/historico/**`

Objetivo:
- Duas linhas da auditoria.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **`clamp01`** de `shared/math` no lugar de `Math.min(1, Math.max(0, …))` em `src/modules/historico/index.ts:12` (auditoria 2.2).
2. **Sem `export`** (Anexo A): `RollDoc` em `server/src/modules/historico/repository.ts:9`.
3. **`CLAUDE.md` do módulo:** só se alguma frase citar o que mudou.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test && npm run test:server`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
