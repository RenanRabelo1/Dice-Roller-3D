# Ordem de serviço: testes dentro dos módulos e barramento de eventos

Ordem: OS-0004 (F-1 + F-2, fundação, dev de shared)
Escopo de escrita: `vite.config.ts` (só o bloco `test`), `tsconfig.app.json`, `tsconfig.test.json`, `server/vitest.config.ts`, `src/shared/events.ts` (novo), `src/shared/tests/events.test.ts` (novo), `docs/contexto/testes.md`
Objetivo: o Vitest passa a achar testes dentro de `src/**/tests/`, e existe o sinal síncrono do ADR 0005, provado por esses testes.

As duas fundações vão juntas porque a F-1 sozinha não tem como ser verificada: ainda não existe teste dentro de `src/`. O `events.test.ts` é o primeiro.

Leia antes de começar:
- `docs/adr/0005-barramento-de-eventos.md` (a interface e as regras de entrega)
- `docs/adr/0007-diferencas-de-stack.md`, ponto 9 (onde ficam os testes)
- `vite.config.ts`, `tsconfig.app.json`, `tsconfig.test.json`, `server/vitest.config.ts`, `server/tsconfig.json`

Entregáveis:
1. **Configuração (F-1):**
   - `vite.config.ts`: `test.include` passa a ser `['tests/**/*.test.ts', 'src/**/tests/**/*.test.ts']`.
   - `tsconfig.app.json`: `exclude: ['src/**/tests/**']`. O build do app não compila testes.
   - `tsconfig.test.json`: `include` ganha `src/**/tests/**`, para os testes terem os tipos do Node.
   - `server/vitest.config.ts`: `include` ganha `src/**/tests/**/*.test.ts`, mantendo `test/**/*.test.ts`. O `server/tsconfig.json` já inclui `src`; não mexa nele.
2. **Sinal (F-2):** `src/shared/events.ts`, com exatamente a interface do ADR 0005:
   ```ts
   export interface Signal<T> { emit(payload: T): void; subscribe(listener: (payload: T) => void): () => void }
   export function createSignal<T>(): Signal<T>
   ```
   - A entrega é síncrona, na ordem de inscrição, no mesmo tique do `emit`.
   - Um ouvinte que lança erro é isolado com `try/catch` e `console.error`: os outros ouvintes recebem e o `emit` não lança.
   - O `subscribe` devolve a função que cancela a inscrição. Cancelar duas vezes não tem efeito.
   - Um ouvinte que se cancela, ou que inscreve outro, durante a entrega não altera a rodada em curso: a rodada usa uma cópia da lista de inscritos.
   - Sem dependência nova. Nenhum evento concreto nem nome de negócio no arquivo.
   - Use só sintaxe apagável (`erasableSyntaxOnly`) e nenhum import, para o servidor poder importar o arquivo no futuro.
3. **Testes:** `src/shared/tests/events.test.ts`, cobrindo cada regra do item 2: síncrono, a ordem, o isolamento do erro (com `console.error` espionado), o cancelamento idempotente e a mudança na lista durante a entrega. O teste importa `../events.ts`.
4. **Doc:** em `docs/contexto/testes.md`, registre que os unitários também moram em `src/**/tests/` (ADR 0007) e que o `tests/` da raiz fica para o que atravessa módulos.

Critérios de aceite:
- `npm test` roda os 22 arquivos de hoje e mais o `src/shared/tests/events.test.ts`, todos passando.
- `npm run build` passa. O teste é verificado pelo projeto de testes, não pelo do app: `npx tsc -p tsconfig.app.json --listFilesOnly` não lista nada em `src/**/tests/`, e `npx tsc -p tsconfig.test.json --listFilesOnly` lista o `events.test.ts`. O `tsc -b` roda os dois projetos, então um erro de tipo no teste continua quebrando o build. Isso é desejado.
- `npm run lint` e `npm run test:server` passando.
- Nenhum outro arquivo de `src/` alterado. Ninguém importa o `events.ts` ainda; quem vai usá-lo são as ordens de extração.

Fora do escopo:
- Qualquer arquivo fora do escopo de escrita.
- Mover testes que já existem em `tests/`. Isso acontece na extração de cada módulo.
- Barramento no servidor (ADR 0005: não há).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Arquivos: `vite.config.ts` (bloco `test`), `tsconfig.app.json`, `tsconfig.test.json`, `server/vitest.config.ts`, `docs/contexto/testes.md`; novos `src/shared/events.ts` (21 linhas, sem import) e `src/shared/tests/events.test.ts`. TDD: os testes falharam por falta do módulo e passaram depois.

8 testes:
- síncrono;
- ordem de inscrição;
- erro isolado (`console.error` espionado, `emit` não lança, os outros recebem);
- cancelamento idempotente;
- mesmo ouvinte inscrito duas vezes (cada cancelamento retira uma);
- cancelar outro durante a entrega (recebe nesta rodada, não na próxima);
- ouvinte que se cancela;
- inscrever durante a entrega (só recebe no próximo `emit`).

**Divergência:** o `tsconfig.test.json` usa `src/**/tests` em vez de `src/**/tests/**`, porque o TypeScript recusa `**` no fim de um `include` (TS5010). Um último segmento sem curinga vale como diretório, então o efeito é o mesmo. O `exclude` do app ficou `src/**/tests/**`, que é aceito.

## Parecer do revisor

**APROVADO.**
- ✅ (a) Só arquivos do escopo; `server/tsconfig.json` intacto.
- ✅ (b) `shared/` sem regra de negócio: sem import, sem evento concreto, sem mapa global.
- ✅ (c) 8 casos cobrem o item 2.
- ✅ (d) Segue o ADR 0005: interface literal, `Set` em ordem de inserção, `try/catch` + `console.error`, rodada sobre `[...entries]`, `Set.delete` idempotente.
- ✅ (e) `testes.md` registra o novo `include` e a divisão `src/**/tests` × `tests/`.
- ✅ (f) Os `include`/`exclude` conferem; ninguém importa `events.ts` ainda.

Observações sem bloqueio:
1. O teste do ouvinte que se cancela não prova a cópia (o `Set` já tolera apagar durante a iteração). A cópia está provada pelos outros dois casos.
2. O mesmo ouvinte pode se inscrever duas vezes; o ADR não proíbe, e há teste.
3. Uma frase de `testes.md` confundia o `tests/` da raiz com o do módulo; corrigida pelo orquestrador neste commit.

## Gate

2026-11-13, rodado pelo orquestrador. Sem E2E: a ordem não toca cena, UI nem `e2e/` (plano §4).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ (os mesmos chunks sob demanda: `presim.worker`, `HDRLoader`, `ImportDie`, `tableFile`, `importer`) |
| `npm run lint` | ✅ |
| `npm test` | ✅ 23 arquivos, 339 testes (+8) |
| `npm run test:server` | ✅ 23 testes |
