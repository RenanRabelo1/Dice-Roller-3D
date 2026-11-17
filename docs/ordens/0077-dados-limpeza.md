# Ordem de serviço: limpeza da auditoria, dados

Ordem: OS-0077 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: `dados`
Escopo de escrita:
- `src/modules/dados/**`

Objetivo:
- Porta mais estreita e a álgebra de `shared/math`.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **Sem `export`** (Anexo A): `forgetModel` (`domain/modelo.ts`). Confira com `rg`, porque o `meus-dados` pode usar.
2. **Fora da porta** (Anexo B): `AparenciaDaGema`, `Face`, `Label`, `RotuloNaCena` e `SymbolName`; e o `INK_COLORS`, trocando o import do teste do módulo, se não houver consumidor de fora.
3. **As cópias de `cross`/`unit`/`dot`/`sub`** em `domain/solidos.ts:27-30` e `domain/gravacao.ts:10` passam a vir de `shared/math`.
   - **Este é o módulo mais sensível da limpeza:** a geometria dos sólidos e a leitura da gravação decidem o resultado.
   - O `polyhedra.test.ts` e os testes de gravação têm de passar **sem mudança**.
   - Se a OS-0072 tiver registrado diferença de semântica (o vetor zero no `unit`), confira que nenhum caminho do módulo depende dela.
4. **`CLAUDE.md`:** a seção "Expõe" fica com a porta nova.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
