# Ordem de serviço: limpeza da auditoria, selecao

Ordem: OS-0078 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: `selecao`
Escopo de escrita:
- `src/modules/selecao/**`

Objetivo:
- Porta mais estreita e a classe `panel` sem efeito.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **Fora da porta** (Anexo B): `LeituraDaNotacao`. O `SelecaoAlterada` é o tipo de um sinal: se só os testes do módulo usam, troque o import do teste; se alguém de fora usa, fica. O `remover` segue a mesma regra.
2. **A classe `panel`** sai do `<aside>` do `Chat`, e o `chat` fica. O `componentes.test.ts` acompanha.
3. **`CLAUDE.md`:** a seção "Expõe" fica com a porta nova.
4. **Fica:** o `typing` de `ui/campoDeTexto.ts`, que é duplicação intencional (auditoria, seção 3).

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
