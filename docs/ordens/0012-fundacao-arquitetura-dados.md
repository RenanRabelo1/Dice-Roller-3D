# Ordem de serviço: testes de arquitetura — dono dos dados

Ordem: OS-0012 (F-7, parte 2 de 2, fundação, dev de shared)
Escopo de escrita: `tests/arquitetura/**` (novo `dados.test.ts`, mais o que precisar em `config.ts`/`fixtures/`), `docs/contexto/testes.md`
Objetivo: um teste no `npm test` bloqueia acesso a dado de outro dono (regra 2, ADR 0006 parte B), lendo o bloco `donos-dos-dados` de `docs/mapa-modulos.md` como fonte única.

Leia antes de começar:
- `docs/adr/0006-testes-de-arquitetura.md`, parte B
- `docs/adr/0003-estado-do-cliente-e-dono-dos-dados.md`, pontos 1, 2 e 5
- `docs/mapa-modulos.md`: o bloco ` ```json donos-dos-dados ` e a tabela de módulos (coluna de dados)
- `tests/arquitetura/config.ts` e `tests/arquitetura/regras.ts`, para seguir o mesmo padrão de exceções nomeadas com motivo
- Os pontos atuais, que você encontra com `grep -rn "localStorage\|sessionStorage\|indexedDB\|defineStore(\|collection\|\$lookup\|from 'zustand'" src server/src`

Regras (varrem só arquivos de produção de `src/` e `server/src/`; ficam de fora `**/tests/**`, `tests/` e `e2e/`):

1. **Fonte única.** O teste lê o bloco JSON `donos-dos-dados` do mapa. Se o bloco faltar ou o JSON for inválido, o teste falha com mensagem clara.
2. **IndexedDB.**
   - `indexedDB` só aparece em `src/shared/db.ts`.
   - Todo `defineStore('<nome>')` usa um nome que está no bloco.
   - Cada nome do bloco é definido **uma vez**, e no módulo dono: o arquivo fica em `src/modules/<dono>/`.
3. **`localStorage`/`sessionStorage`.**
   - Todo arquivo que os usa contém o literal de uma chave do bloco. Se não tiver nenhuma, o teste falha com "chave não declarada no mapa".
   - O arquivo fica no módulo dono da chave: `src/modules/<dono>/repository.ts`.
4. **MongoDB.**
   - Toda coleção acessada (`.collection('<nome>')` ou a forma que o `server/` usar hoje; descubra) está no bloco.
   - O acesso só acontece no `repository.ts` do dono ou em `server/src/shared/db.ts`.
   - Um `$lookup`/`$graphLookup` para coleção de outro dono falha.
5. **zustand.** `create(` de `zustand` só aparece em `src/modules/*/store.ts`.
6. **Exceções nomeadas.**
   - Vão em `config.ts` (`DADOS_LEGADO`), uma por arquivo e por dado, cada uma com o motivo e o ADR/plano.
   - Hoje há três grupos: os acessos do legado (ainda não há módulo), a store de falha da plataforma (`src/shared/plataforma/falha.ts`, permitida pelo ADR 0008) e o servidor antes da extração do `historico`.
   - Como em `CICLOS_CONHECIDOS`, o teste também falha quando uma exceção deixa de ser usada. O erro manda tirá-la.

Os acessos de hoje (confira com o grep; esta lista é o ponto de partida):
- `src/dice/customStore.ts`: `defineStore('customDice')`. Dono: `meus-dados`.
- `src/scene/tableStore.ts`: `defineStore('tables')` e `localStorage['mesa.ativa']`. Dono: `mesa`.
- `src/api/history.ts`: `localStorage['diceroller.player']`. Dono: `historico`.
- `src/store.ts`: `localStorage['diceroller.rolagem']` (modo de rolagem). Dono: `arremesso`. A chave foi acrescentada ao mapa pelo orquestrador nesta data.
- `src/store.ts`, `src/scene/tableState.ts`, `src/shared/plataforma/falha.ts`: `create(` do zustand.
- `server/src/…`: a coleção `rolls`. Dono: `historico`.

Entregáveis:
1. `tests/arquitetura/dados.test.ts` com as regras 1 a 6, mais as exceções em `config.ts`.
2. **Prova de que cada regra dispara**, com fixtures em `tests/arquitetura/fixtures/dados/`. O teste recebe a raiz e o bloco por parâmetro, como já se faz com as fixtures de módulos. Casos:
   - um módulo que usa store de IndexedDB de outro dono;
   - `localStorage` com uma chave que não está no bloco;
   - `indexedDB` fora de `shared/db.ts`;
   - `create(` fora de `store.ts`;
   - um `$lookup` para coleção de outro dono;
   - uma exceção sem uso.
3. Em `docs/contexto/testes.md`, documente: como declarar um dado novo (bloco do mapa), como funcionam as exceções e o fato de a varredura ser heurística (ADR 0006: "pega o caso comum").

Critérios de aceite:
- `npm test` passa, e a suíte de arquitetura continua com menos de cerca de 15 s.
- Cada fixture falha com uma mensagem que diz a regra, o arquivo, o dado e o dono esperado.
- `npm run build`, `npm run lint` e `npm run test:server` passam.

Fora do escopo:
- Mudar `docs/mapa-modulos.md`. Se o bloco estiver incompleto, pare e reporte.
- Qualquer arquivo de `src/` ou `server/`.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

Arquivos: novos `tests/arquitetura/dados.test.ts`, `donos.ts` e `fixtures/dados/` (com um `mapa.md` próprio e um caso por regra); `config.ts` ganha `RAIZES_DADOS`, `MAPA_DE_DONOS` e `DADOS_LEGADO`; `leitor.ts` passa a exportar `texto`, `listar` e `posixDe` e o `texto` deixa de quebrar em tipo template literal (sem efeito no grafo de imports); `docs/contexto/testes.md`.

Método (tudo pela AST do `@swc/core`): fonte única = regex do bloco + `JSON.parse` + três grupos; IndexedDB = membro/identificador `indexedDB` e `defineStore(literal)` contado por nome; storage = membro `localStorage`/`sessionStorage` + literal de chave do bloco no arquivo, e `getItem/setItem/removeItem` com literal fora do bloco falha; MongoDB = `.collection`, `.createCollection`, `listCollections({name})`, `command({collMod|create|drop})`, `.dropCollection`, e o `from` de `$lookup`/`$graphLookup`; zustand = `create` importado de `zustand` (também renomeado ou por namespace).

Além da ordem: store do mapa sem `defineStore` falha; exceção repetida falha; `defineStore`/coleção sem nome literal falha.

**`DADOS_LEGADO`** (9, todas usadas): `src/dice/customStore.ts`/`customDice` (meus-dados); `src/scene/tableStore.ts`/`tables` e `mesa.ativa` (mesa); `src/api/history.ts`/`diceroller.player` (historico); `src/store.ts`/`diceroller.rolagem` (arremesso) e zustand (`useDice`, some módulo a módulo); `src/scene/tableState.ts`/zustand (`useTable` → `mesa/store.ts`); `src/shared/plataforma/falha.ts`/zustand (ADR 0008); `server/src/rolls.ts`/`rolls` (historico). Cada uma cita ADR 0003/0004/0008 e o plano §8.

## Parecer do revisor

**APROVADO.**
- ✅ (a) Só `tests/arquitetura/` e `testes.md`, mais a mudança do orquestrador no mapa/spec (coerente: coluna de dados de `arremesso`, bloco e spec dizem o mesmo).
- ✅ (b) Nada em `src/`/`server/`.
- ✅ (c) Cada fixture falha com regra, arquivo, dado e dono; exceção sem uso e repetida provadas.
- ✅ (d) Regras 1–6 cobertas; cada nome do bloco definido exatamente uma vez.
- ✅ (e) As 9 exceções batem com acessos reais e citam ADR/plano.
- ✅ (f) Doc atualizada.

Sondado direto: pega `window.localStorage`, `globalThis.localStorage`, `self.indexedDB`, `window['localStorage']`, desestruturação de `window`, `create as mk`, `import * as z`, `$lookup` em variável; não acusa chave de objeto. Nenhum acesso real escapa do grep. Fonte única: bloco ausente/inválido/sem grupo falha.

Observações registradas em `testes.md` (heurística) pelo orquestrador: `createStore`/`createWithEqualityFn` e `$unionWith` não são vistos; a regra "`index.ts` não reexporta o store cru" entra com o primeiro módulo que tiver store. ADR 0006 ganhou nota de que a lista atual é a do bloco.

## Gate

2026-11-13, pelo orquestrador. Sem E2E: a ordem não toca `src/`, `server/` nem `e2e/` (plano §4).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 31 arquivos, 396 testes (30 de arquitetura, ~0,6–1,1 s) |
| `npm run test:server` | ✅ 23 testes |
