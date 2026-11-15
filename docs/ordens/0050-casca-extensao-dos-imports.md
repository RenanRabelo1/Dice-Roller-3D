# Ordem de serviço: a extensão dos imports na casca e nos testes da raiz, e o código sem uso

Ordem: OS-0050 (fase 7, limpeza, parte 4, a última)
Módulo: nenhum. A ordem cobre a casca e os testes da raiz.
Escopo de escrita:
- **Casca:** `src/App.tsx`, `src/app/Cena.tsx` e `src/app/testHook.ts`, só os imports.
- **Testes da raiz:** `tests/*.ts` e `tests/helpers/*.ts`, só os imports. Também `tests/arquitetura/*.ts`, só os imports, e **sem as `fixtures/`**, que testam o leitor com imports sem extensão de propósito.
- **Docs:** `docs/backlog.md`, para registrar o levantamento do código sem uso (decisão 3), e `docs/contexto/testes.md` ou `visao-geral.md`, se houver uma convenção de import escrita.

Objetivo: dois itens que a fase 7 do plano deixou pendentes.
- **Extensão dos imports.** A OS-0017 adiou para a fase 7 padronizar a extensão. Hoje 596 imports relativos de `src/` usam `.ts`/`.tsx` e 21 não usam, todos na casca: `App.tsx` (3), `app/Cena.tsx` (14) e `app/testHook.ts` (4). Os testes da raiz têm mais alguns.
- **Código sem uso.** O orquestrador levantou as funções exportadas que nenhum arquivo de produção usa:
  - `clampHandX` (`arremesso/domain/world.ts`) e `checkTheme` (`mesa/domain/tableTheme.ts`): só os testes usam;
  - `assinarArremesso` (`arremesso`), `SYMBOLS` (`dados`), `pisoEstaOculto` (`mesa`) e `carregarImportador` (`meus-dados`): também só os testes, mas existem de propósito para os testes e o pré-carregamento.

O comportamento não muda.

Leia antes de começar:
- `CLAUDE.md` da raiz.
- `src/App.tsx`, `src/app/Cena.tsx` e `src/app/testHook.ts`.
- `tsconfig.app.json` e `tsconfig.test.json`, onde fica `allowImportingTsExtensions`.
- `tests/arquitetura/leitor.ts`, para saber como ele resolve a extensão.
- `docs/backlog.md`.

Decisões do orquestrador:
1. **A convenção.** Todo import relativo de arquivo TypeScript leva a extensão (`.ts` ou `.tsx`), como já fazem os módulos. Os imports de `src/shared/plataforma` e de outras pastas com `index.ts` passam a apontar para o arquivo: `.../plataforma/index.ts`. Os imports de pacote não mudam.
2. **Onde aplicar.** Na casca e nos testes da raiz, inclusive `tests/arquitetura/*.ts`, mas sem as `fixtures/`. Confira com o grep do critério de aceite.
3. **O código sem uso não é apagado nesta ordem.**
   - `clampHandX` e `checkTheme` são de módulos (`arremesso` e `mesa`), e a regra 6 pede uma ordem por módulo.
   - `checkTheme` valida uma mesa importada. Pode ser que a validação tenha se perdido numa feature antiga, e nesse caso é um defeito, não sobra. Decidir isso muda comportamento e não é refatoração.
   - Registre os dois no `docs/backlog.md`, numa seção "Achados da refatoração", com o que se sabe e a pergunta. Os outros quatro ficam: existem para os testes e o pré-carregamento.
4. **Equivalência.** `npm run build` gera os mesmos arquivos, com os mesmos hashes, porque a resolução não muda.

Entregáveis:
1. Os imports com extensão.
2. O backlog.

Critérios de aceite:
- `grep -rnoE "from '\.{1,2}/[^']+'" src tests --include=*.ts --include=*.tsx | grep -v fixtures | grep -vE "\.(tsx?|css|json|mjs|js)'$"` volta vazio.
- `npm test`, `npm run build` (mesmos arquivos e hashes), `npm run lint` e `npm run test:server` passam.
- **Sem E2E no dev.** O orquestrador roda o E2E completo no fim da fase 7.

Fora do escopo: os módulos, `server/` e `e2e/`.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- 39 imports passaram a ter extensão, em 13 arquivos: casca (`App.tsx` 3, `app/Cena.tsx` 14, `app/testHook.ts` 4), `tests/*.ts` e `tests/helpers/*.ts` (7) e `tests/arquitetura/*.ts` (11). As `fixtures/` não foram tocadas. Cada alvo foi resolvido no disco (`.ts`, `.tsx` ou `/index.ts`). `shared/plataforma` ficou `.../plataforma/index.ts`.
- O grep do critério volta vazio. Também não sobrou `import()` nem `new URL()` relativo sem extensão.
- Build: o `diff` da lista de `dist/` com a de antes (`chunks-antes-0050.txt`) deu igual, com 14 arquivos e os mesmos hashes.
- `npm run build`, `npm run lint` (sem avisos), `npm test` (69 arquivos, 564 testes) e `npm run test:server` (2 arquivos, 23 testes) passam. Não rodei E2E.
- Backlog: entrou a seção "6. Achados da refatoração", com `clampHandX` (em produção a mão é limitada por `vortexCenter`), `checkTheme` (nada valida o tema lido do IndexedDB nem o importado, e fica a pergunta: defeito ou sobra?) e os quatro que ficam de propósito.
- `testes.md` e `visao-geral.md` não têm convenção de extensão escrita, então não mudei os dois. O `testes.md` só descreve o leitor, que aceita os dois jeitos.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Imports:** os 23 alvos distintos dos 39 imports foram conferidos no disco, e cada um é o mesmo arquivo de antes. O grep de aceite volta vazio.
- **Diff:** o orquestrador conferiu que todas as linhas alteradas em `src/` e `tests/` são de import, e que o build gera os mesmos 14 arquivos, com os mesmos hashes.
- **Sem uso:** `clampHandX` e `checkTheme` só aparecem nos testes.

Ressalvas, corrigidas pelo orquestrador em `docs/backlog.md`:
1. O `.glb` importado já é validado por `readExtras`. Sem checagem fica o tema do IndexedDB, que só passa pelo filtro `version === 1`, e as cores de `colors`. O texto agora mostra o quadro real.
2. A citação a `docs/diagnostico.md` agora aponta a seção 10, item 6 (linha 232).

## Gate

2026-11-14, rodado pelo orquestrador. É o fim da fase 7 e da refatoração (OS-0047 a OS-0050).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB; os mesmos 14 arquivos, com os mesmos hashes de antes da ordem |
| `npm run lint` | ✅ |
| `npm test` | ✅ 69 arquivos, 564 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` (completo, fim da fase 7) | ✅ 98 de 98 (18,7 min) |
