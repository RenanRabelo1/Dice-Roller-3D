# Ordem de serviço: `shared/db` sem nome de store

Ordem: OS-0007 (F-4, fundação, dev de shared)
Escopo de escrita: `src/shared/db.ts` (novo, no lugar de `src/indexedDb.ts`), `src/shared/tests/db.test.ts` (novo), `src/indexedDb.ts` (removido), `src/dice/customStore.ts`, `src/scene/tableStore.ts`, `docs/contexto/dados.md`, `docs/contexto/mesa.md`, `docs/contexto/visao-geral.md` (só as linhas que citam `indexedDb.ts`)
Objetivo: o banco `dice-roller` passa a ser aberto por `src/shared/db.ts`, que não conhece o nome de nenhuma store. Cada store é declarada pelo arquivo que a usa (ADR 0003, ponto 5; ADR 0008).

Leia antes de começar:
- `docs/adr/0008-casca-e-shared-do-cliente.md`, item `db/`
- `docs/adr/0003-estado-do-cliente-e-dono-dos-dados.md`, ponto 5
- `src/indexedDb.ts` (30 linhas), `src/dice/customStore.ts`, `src/scene/tableStore.ts`
- `e2e/table.spec.ts:198-227` (o teste da atualização v1 → v2, que precisa continuar passando)

Desenho (decidido pelo orquestrador):

```ts
// src/shared/db.ts
export interface Store { run<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> }
export function defineStore(name: string): Store
```

- **Registro de stores.** `defineStore` registra o nome e devolve um `run` preso àquela store. Cada arquivo dono chama `defineStore` no topo do módulo:
  - `customStore.ts`: `const store = defineStore('customDice')`;
  - `tableStore.ts`: `const store = defineStore('tables')`.
- **Abertura.** Continua igual: banco `dice-roller`, versão 2, promessa única, que é descartada se falhar. A versão fica como constante em `shared/db.ts`, com o comentário "uma store nova exige subir a versão". No `onupgradeneeded`, cria as stores registradas que ainda não existem, com `keyPath: 'id'`, como hoje.
- **Erro de ordem.** Chamar `defineStore` depois de o banco ter sido aberto é erro de programação, porque a store nova não seria criada na atualização. Nesse caso `defineStore` lança, com uma mensagem clara. Chamar duas vezes com o mesmo nome também lança.
- **Mensagens de erro iguais às de hoje:** `'sem IndexedDB'`, `'IndexedDB bloqueado'` e `'gravação cancelada'`.
- **Restrições.** Nenhum nome de store, nenhum import de módulo e nenhuma regra de negócio em `shared/db.ts`.

Entregáveis:
1. `src/shared/db.ts` como descrito, com o comportamento de `openDb`/`run` de hoje preservado linha a linha.
2. `src/indexedDb.ts` removido. Nenhum import aponta para ele.
3. `customStore.ts` e `tableStore.ts` usam `defineStore`. As funções exportadas e as assinaturas não mudam. Atualize também o comentário "see indexedDb.ts".
4. `src/shared/tests/db.test.ts`, em Node, sem dependência nova. Use um `indexedDB` falso mínimo, instalado em `globalThis` só no teste. Os casos:
   - sem `indexedDB`, `run` rejeita com `'sem IndexedDB'`, e a próxima chamada tenta abrir de novo (a promessa foi descartada);
   - a atualização cria só as stores registradas que faltam, com `keyPath: 'id'`;
   - `defineStore` depois da abertura lança;
   - `defineStore` com nome repetido lança.

   O registro e a promessa são estado de módulo. Para cada caso começar limpo, use `vi.resetModules()` com import dinâmico, sem criar API de teste no `db.ts`.
5. Docs: troque as citações de `indexedDb.ts` por `shared/db.ts` em `docs/contexto/dados.md`, `mesa.md` e `visao-geral.md`.

Critérios de aceite:
- `grep -rn "indexedDb" src tests e2e` volta vazio, exceto a string `indexedDB` (API do navegador).
- `grep -n "customDice\|tables" src/shared/db.ts` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passando.
- `npm run e2e` completo, que o orquestrador roda. Em especial, `table.spec.ts` (atualização v1 → v2, mesas salvas) e `import.spec.ts` (dados importados sobrevivem ao recarregar).

Fora do escopo:
- Qualquer arquivo fora do escopo de escrita.
- Mudar o nome do banco, a versão, o `keyPath` ou o formato dos registros.
- Mover `customStore.ts`/`tableStore.ts` para módulos. Isso acontece na extração de `meus-dados` e `mesa`.
- O `localStorage` de `mesa.ativa`, que fica em `tableStore.ts` como está.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Arquivos:
- novos: `src/shared/db.ts` (sem import, sem nome de store) e `src/shared/tests/db.test.ts`;
- removido: `src/indexedDb.ts`;
- alterados: `customStore.ts` (`defineStore('customDice')`), `tableStore.ts` (`defineStore('tables')`) e as três docs de contexto.

As funções exportadas, o banco, a versão 2, o `keyPath`, as mensagens de erro e o formato dos registros ficaram iguais.

O teste usa um `indexedDB` falso mínimo, instalado com `vi.stubGlobal`. Para isolar o estado de módulo, usa `vi.resetModules()` com import dinâmico. São 7 casos, escritos antes da implementação e vistos falhar:
- sem IndexedDB, rejeita e tenta abrir de novo;
- a atualização cria só as stores registradas que faltam;
- abre uma vez para várias stores;
- `defineStore` lança depois da abertura e durante ela;
- `defineStore` é aceito depois de uma abertura que falhou;
- `defineStore` lança se o nome se repetir.

Divergências:
- `dados.md` não citava `indexedDb.ts`. A linha de persistência dizia "v1", o que era falso, e foi corrigida para v2.
- `visao-geral.md` ganhou a linha de `shared/db.ts`.

Verificação do dev:
- `npm test`: 350;
- build e lint: ok;
- `test:server`: 23;
- `table` + `import`: 19/19, incluindo a atualização v1 → v2.

## Parecer do revisor

**APROVADO.**
- ✅ (a) Só arquivos do escopo.
- ✅ (b) `shared/db.ts` não tem nome de store nem import.
- ✅ (c) Os casos da ordem estão cobertos, e mais um.
- ✅ (d) Comportamento igual, comparado linha a linha com o original. `openDb` deixou de ser exportado, mas ninguém o importava.
- ✅ (e) Docs corrigidas, incluindo o "v1" falso.
- ✅ (f) Os dois greps batem.

Registro das stores: a cadeia `main → App → store/tableState → customStore/tableStore` é toda estática. Nenhum `import()` traz os arquivos que declaram store.

Observações atendidas nesta ordem:
- as regex frouxas dos asserts de erro foram trocadas pelas mensagens reais;
- os casos "durante a abertura" e "depois de abertura que falhou" foram acrescentados;
- o aviso sobre o HMR foi registrado em `armadilhas.md` pelo orquestrador.

Observação que fica: o ADR 0008 fala em pasta `db/` e a entrega é `db.ts`, no mesmo padrão de `math.ts`.

## Gate

2026-11-13, pelo orquestrador.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ Mesmos chunks sob demanda, com o mesmo tamanho. Mudou o hash de `ImportDie`, `tableFile` e `importer`, porque o chunk comum mudou. O worker de física ficou com o hash igual. |
| `npm run lint` | ✅ |
| `npm test` | ✅ 25 arquivos, 350 testes, depois do ajuste dos asserts |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ✅ 98 passaram (19,2 min) |
