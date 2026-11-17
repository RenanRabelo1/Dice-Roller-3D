# Ordem de serviço: limpeza da auditoria, vitrine

Ordem: OS-0081 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: `vitrine`
Escopo de escrita:
- `src/modules/vitrine/**`

Objetivo:
- Porta mais estreita, o `clamp01`, o tipo sem uso e o `live` copiado do `arremesso`.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **O `live` do `Vitrine.tsx`** (l.62-67, a mesma lógica do `MaoDoArremesso`) passa a usar `corposVivos()` da porta do `arremesso` (OS-0075).
2. **`clamp01`** de `shared/math` em `domain/destaque.ts` e em `scene/Vitrine.tsx` (a auditoria cita a l.187).
3. **`TextoDoPainel`** (`contracts.ts`), sem nenhum uso, sai.
4. **Sem `export`** (Anexo A): `DestaqueInspecionado` e `BrilhoInspecionado` (`contracts.ts`), `Highlight` (`domain/highlight.ts`), `UP_INK` (`domain/inkGlow.ts`) e `View` (`domain/showcase.ts`).
   - **O `MESMA_FACE` (OS-0070) fica exportado no arquivo:** o teste usa.
   - Se ele só é usado pelo teste do módulo, sai da porta.
5. **Fora da porta** (Anexo B):
   - **`index.ts`:** `BrilhoInspecionado`, `DestaqueInspecionado`, `EstadoDaVitrine`, `TextoDoPainel`, `VitrineInspecionada`, `View`, `Highlight` e `UP_INK`;
   - **`cena.ts`:** `useVitrine`;
   - e os da última linha do Anexo B, trocando o import dos testes do módulo. Atenção ao `window.__dice` (`inspecao`) e à casca (`vitrineConcluida`).
6. **`CLAUDE.md`:** a seção "Expõe" fica com a porta nova.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
