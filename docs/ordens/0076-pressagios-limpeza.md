# Ordem de serviço: limpeza da auditoria, pressagios

Ordem: OS-0076 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: `pressagios`
Escopo de escrita:
- `src/modules/pressagios/**`

Objetivo:
- Porta mais estreita, exports só internos e um nome enganoso a menos.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **Sem `export`** (Anexo A): `FAR` (`domain/krakenMotion.ts`), `COR_DUALIDADE` (`domain/luz.ts`) e `SHARD_DEFAULT` (`scene/Kraken.ts`).
2. **Fora da porta** (Anexo B):
   - **`index.ts`:** `EstadoDoPresagio`, `MovimentoNoPresagio`, `PlanoDoPresagio`, `PresagioInspecionado`, `DUALITY_HIT` e `OMEN_TESTS`;
   - **`cena.ts`:** `SHARD_DEFAULT`;
   - e os da última linha do Anexo B, trocando o import dos testes do módulo, se não houver consumidor de fora. Atenção: a `mesa` e a `vitrine` consomem partes desta porta, então confira com `rg`.
3. **Renomeie** o `easeOut` de `scene/PresagiosNaCena.tsx:26` para `easeOutCubica` (auditoria 2.2). É uma curva diferente da do `shared/math`, e o nome igual convida a "unificar" e mudar a animação. Só renomeia; a curva fica.
4. **`CLAUDE.md`:** a seção "Expõe" fica com a porta nova.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
