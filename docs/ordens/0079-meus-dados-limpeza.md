# Ordem de serviço: limpeza da auditoria, meus-dados

Ordem: OS-0079 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: `meus-dados`
Escopo de escrita:
- `src/modules/meus-dados/**`

Objetivo:
- Porta mais estreita, a álgebra de `shared/math` e a classe `panel` sem efeito.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **Fora da porta** (Anexo B): `DadoInspecionado` (`index.ts`) e `useMeusDados` (`cena.ts`); e os da última linha (`excluir`, `montarDado`, `salvar`, `tintaPermitida`, `PedidoDeMontagem`), trocando o import dos testes do módulo, se não houver consumidor de fora.
2. **As cópias de `cross`/`unit`/`dot`/`sub`** em `domain/importador.ts:97-99` passam a vir de `shared/math`. O `importador.test.ts` tem de passar sem mudança.
   - **Mantenha o carregamento sob demanda do importador:** `shared/math` é leve, mas confira que o `leitor.test.ts` continua vendo o `import()` do `cena.ts`.
3. **A classe `panel`** sai dos `<aside>` do `MeusDados` e do `AssistenteDeImportacao`, e o `chat` fica. Os testes e fixtures do módulo acompanham.
4. **`CLAUDE.md`:** a seção "Expõe" fica com a porta nova.

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
