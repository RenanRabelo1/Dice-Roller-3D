# Ordem de serviço: limpeza da auditoria, shared

Ordem: OS-0072 (limpeza da auditoria, [docs/limpeza-auditoria.md](../limpeza-auditoria.md))
Módulo: nenhum: `src/shared/`
Escopo de escrita:
- `src/shared/**`
- `docs/hud-imersivo.md`, só a menção velha ao `useMovimentoReduzido` (auditoria O-3)

Objetivo:
- Dar a `shared/math` as operações de `Vec3` que quatro módulos copiaram, e tirar de `shared` o que ninguém usa.

Antes de começar, leia [docs/limpeza-auditoria.md](../limpeza-auditoria.md) (as regras comuns) e as seções de [docs/auditoria-codigo.md](../auditoria-codigo.md) citadas abaixo.

Decisões do orquestrador:

1. **`src/shared/math.ts`** ganha, puras e sem import:
   - `sub(a, b)`, `dot(a, b)`, `cross(a, b)` e `unit(a)` para `Vec3`;
   - com a mesma semântica das cópias em `arremesso/domain/vortex.ts:30-31`, `dados/domain/solidos.ts:27-30`, `dados/domain/gravacao.ts:10` e `meus-dados/domain/importador.ts:97-99` (auditoria 2.2). Leia as quatro e confirme que são iguais.
   - Se alguma diferir num caso de borda (vetor zero no `unit`, por exemplo), escolha o comportamento de `dados/domain/solidos.ts` e registre a diferença no relatório. As ordens dos módulos precisam saber.
   - Teste em `src/shared/tests/math.test.ts`: os quatro, mais o `unit` do vetor zero.
   - `shared/math` já é item de `shared` (ADR 0008). Isso é extensão, não item novo: não precisa de ADR.
2. **`useMovimentoReduzido` sai:** o hook e o re-export da porta `plataforma/index.ts`, e o `useSyncExternalStore`, se ficar sem uso (auditoria 1.2). Na `docs/hud-imersivo.md`, a menção a ele (auditoria O-3) passa a dizer que a casca lê o movimento reduzido por `aoMudarMovimentoReduzido` e escreve `data-movimento` no `.app`.
3. **Sem `export`** (Anexo A): `Store` em `shared/db.ts` e `Signal` em `shared/events.ts`. Confira com `rg` que ninguém de fora importa.
4. **Não troque** os módulos para usar as funções novas: cada módulo faz isso na sua ordem (OS-0075, 0077 e 0079).

Critérios de aceite:
- `git diff --stat` só no escopo de escrita.
- O gate do dev passa (regra 8 das regras comuns): `npm run build && npm run lint && npm test`.
- O relatório final traz o hash, os arquivos, o gate, cada item feito e cada item mantido, com o porquê (consumidor achado, teste que precisa, risco de comportamento).
- **Sem E2E nem servidor de dev.** O orquestrador roda o E2E completo no fim da limpeza.

Se precisar de algo fora disso: pare e reporte. Não implemente.
