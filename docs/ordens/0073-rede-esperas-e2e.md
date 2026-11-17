# Ordem de serviço: limpeza da auditoria, a rede de segurança

Ordem: OS-0073 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: nenhum: a rede de segurança
Escopo de escrita:
- `e2e/**`
- `tests/helpers/**`

Objetivo:
- Tirar dos specs os helpers copiados e o helper de teste sem uso.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **`e2e/esperas.ts`** (novo), com os helpers repetidos da auditoria 2.1:
   - `ready(p, n?)`, `settled(p)`, `throwWithSpace(p)` e `advance(page, ms)`;
   - `dice(p)` e `panel(p)` (`#table-panel`);
   - o objeto de arquivo para upload (`file`/`glbFile`).
   - Cada spec passa a importar daí.
   - **Variantes que diferem ficam no spec:** o `shown` com timeout de 60 s do `hud.spec`, o `roll` de 300 ms do `hud`/`omen` e os `topValue` com retornos diferentes. A ideia é tirar cópia idêntica, não forçar uma versão só.
   - O comportamento de cada teste não muda: mesmos timeouts, mesmas teclas, mesmos tempos.
2. **`tests/helpers/models.ts`:** `stockPoly` sai (Anexo A). Confira com `rg`.
3. **Gate:** `npm run lint` (os specs passam pelo TypeScript do lint) e `npm test`. O orquestrador roda o E2E.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
