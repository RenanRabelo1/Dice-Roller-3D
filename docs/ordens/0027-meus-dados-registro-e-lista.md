# Ordem de serviço: `meus-dados`, gravação e lista

Ordem: OS-0027 (extração nº 5, `meus-dados`, parte 1 de 3)
Módulo: `meus-dados`
Escopo de escrita:
- **Módulo novo** `src/modules/meus-dados/`: `contracts.ts`, `index.ts`, `store.ts`, `repository.ts`, `cena.ts`, `ui/*.tsx` (só o hook) e `tests/`. O `CLAUDE.md` fica para a parte 3.
- **Legado:**
  - `src/dice/customStore.ts` vira `src/modules/meus-dados/repository.ts`, com `git mv`;
  - `src/store.ts` perde `customs`, `sessionOnly`, `loadCustoms`, `addCustom`, `updateCustom` e `removeCustom`, e os imports que só eles usam.
- **Pontos de chamada, só os imports e as chamadas:**
  - `src/App.tsx:19`;
  - `src/app/Cena.tsx:237`;
  - `src/ui/Controls.tsx:18,56,67`;
  - `src/ui/ImportDie.tsx:106,277`.
- **Arquitetura:** `tests/arquitetura/config.ts`. Sai a exceção `src/dice/customStore.ts` × `customDice`, porque o arquivo agora está no módulo dono.
- **Testes:** os de `tests/` que usem essas ações (`grep`).

Objetivo: os dados importados do jogador passam a ser do `meus-dados`.
- A gravação no IndexedDB (store `customDice`) fica no módulo.
- A lista "Meus dados" e o aviso de sessão (`sessionOnly`) ficam num store do módulo.
- Também ficam no módulo as ações de carregar, salvar, mudar a tinta e excluir.
- Cada dado continua sendo entregue ao catálogo de `dados` por `registerCustom`/`unregisterCustom`.

O comportamento não muda.

Leia antes de começar:
- `docs/specs/meus-dados.md`, inteiro
- `src/modules/selecao/store.ts`, `index.ts` e `cena.ts`, como modelo de store vanilla, porta pura e hook
- `src/store.ts:1-120` e `src/dice/customStore.ts`
- `docs/contexto/armadilhas.md`, no item "Store do IndexedDB se declara no topo do módulo"
- as linhas citadas dos pontos de chamada

Decisões do orquestrador:
1. **Nomes**, novos e em português:
   - `carregar()` é o `loadCustoms`;
   - `salvar(die)` é o `addCustom`, e devolve `null` ou a mensagem;
   - `atualizar(die)` é o `updateCustom`;
   - `excluir(kind)` é o `removeCustom`;
   - `meusDados()` lê `{ customs, sessionOnly }`;
   - `useMeusDados()` é o hook, em `ui/useMeusDados.tsx`, reexportado por `cena.ts`. Ele fica fora do `cena.ts` para não haver ciclo, como no `selecao`.

   As mensagens em pt-BR e a lógica de erro (`QuotaExceededError` contra outra falha) são copiadas sem mudar.
2. **Store.** `src/modules/meus-dados/store.ts` é vanilla (`zustand/vanilla`), com `customs: CustomDie[]` e `sessionOnly: boolean`. Ninguém fora do módulo o lê.
3. **Repositório.**
   - O `repository.ts` (o `customStore.ts` movido) **continua sendo importado estaticamente** pelo `store.ts` do módulo, e este pelo `index.ts`.
   - O `defineStore` roda no carregamento, antes da primeira abertura do banco.
   - Confira que o caminho `main → App → meus-dados/index` existe. O `App.tsx` chama `carregar()`.
4. **Ordem do `excluir`**, a mesma do `removeCustom` de hoje:
   - `deleteCustomDie` (com o `catch`);
   - `unregisterCustom(kind)`, que emite `catalogoAlterado`, a que o `selecao` reage;
   - por último, `set({ customs: customList() })`.
5. **Pontos de chamada:**
   - `App.tsx` chama `carregar()`;
   - `Cena.tsx:237` usa `meusDados().customs`;
   - `Controls.tsx` usa `useMeusDados()`, `atualizar` e `excluir`;
   - `ImportDie.tsx` usa `useMeusDados()` e `salvar`.

   Fora isso, nada muda nesses arquivos.
6. **Testes.**
   - As ações ganham testes no módulo, com IndexedDB falso. Veja como os testes de hoje simulam o IndexedDB (`grep -rn "indexedDB" tests`). Se não houver jeito simples, teste com o repositório substituído por injeção ou `vi.mock`.
   - Os casos são:
     - `carregar` registra no catálogo e preenche `customs`;
     - `salvar` com quota cheia não registra e devolve a mensagem;
     - `salvar` com outra falha registra e liga `sessionOnly`;
     - `atualizar` aplica antes de gravar;
     - `excluir` tira do catálogo e da lista.

Entregáveis:
1. O módulo com `contracts.ts`, `index.ts` (puro), `store.ts`, `repository.ts`, `cena.ts` e `ui/useMeusDados.tsx`. Ele só importa `regras`, `dados`, `selecao`, `src/shared/*` e `zustand`.
2. O `store.ts` legado sem os campos e as ações de dados importados.
3. Os pontos de chamada trocados.
4. A exceção removida de `config.ts`.
5. Os testes da decisão 6.

Critérios de aceite:
- `src/dice/customStore.ts` não existe.
- `grep -rnE "\b(loadCustoms|addCustom|updateCustom|removeCustom)\b|s\.customs|s\.sessionOnly" src tests` volta vazio, fora o `sessionOnly` de `tableState`/`TablePanel` (`mesa`).
- A arquitetura passa: o teste de dono aceita `customDice` em `src/modules/meus-dados/repository.ts`, sem exceção, e não há ciclo novo.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. Os chunks sob demanda não mudam (`ImportDie`, `tableFile`, `HDRLoader`, `ler`, `modelo`). O worker não cresce além de 2379,76 kB.
- **Sem E2E** (regra de gate).

Fora do escopo:
- O importador, o `ImportDie`, o `InkChoice` e a montagem do `CustomDie`, que são a OS-0028.
- O grupo "Meus dados" do `Controls`, o `InkButton`, o `inspecao()` e o `CLAUDE.md`, que são a OS-0029.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Módulo `src/modules/meus-dados/`: `contracts.ts` (`MeusDados`), `store.ts` (vanilla, com `carregar`/`salvar`/`atualizar`/`excluir`/`meusDados`, cuja lógica e mensagens foram copiadas do `useDice`), `index.ts` (puro), `cena.ts` → `ui/useMeusDados.tsx`, e `repository.ts` (`git mv` do `customStore.ts`, com imports `.ts` e um comentário sobre o `defineStore`). O módulo importa só `dados`, `regras`, `shared/db` e `zustand`.
- O `repository.ts` entra estaticamente: `main → App → meus-dados/index → store → repository`.
- `excluir` segue a ordem `deleteCustomDie` (com `catch`), depois `unregisterCustom` e por último `set`.
- `src/store.ts`: saíram os 6 campos e ações e os imports de `dados`/`customStore`/`CustomKind`. O `get` do `create` ficou sem uso e saiu (`(set) =>`).
- Pontos de chamada: `App.tsx`, `Cena.tsx:237`, `Controls.tsx` e `ImportDie.tsx`, onde também saiu o `import { useDice }`, que perdeu o uso.
- `config.ts`: removida a exceção `customStore.ts` × `customDice`.
- Testes (TDD, falharam antes do código) em `tests/acoes.test.ts`, com o repositório sob `vi.mock`. São 9 casos: os 5 da decisão 6 e mais `carregar` sem banco, `salvar` bem-sucedido, `atualizar` com quota cheia e `excluir` com falha no banco. Nenhum teste em `tests/` usava as ações.
- Gate: `npm test` 48 arquivos e 471 testes ok; `test:server` 23 ok; `build` ok, worker com 2379,76 kB e os chunks `ImportDie`/`tableFile`/`HDRLoader`/`ler`/`modelo` presentes; `lint` ok (exit 0). Os greps de aceite voltam vazios. Sem E2E.
- Pendência fora do escopo: os comentários em `dados/contracts.ts:28` e `dados/domain/catalogo.ts:6` ainda citam `customStore.ts`.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- As decisões 1 a 6 estão cumpridas.
- As ações são cópia fiel do HEAD, linha a linha.
- O `defineStore` é estático: `main → App → meus-dados/index → store → repository`.
- A ordem do `excluir` é a do HEAD.
- Não sobra exceção para `customDice` e não há ciclo.
- No build, o chunk compartilhado do `ImportDie` mudou de nome (`plataforma` → `dados`), porque o `ImportDie` deixou de importar `../store`. Nenhum chunk sob demanda mudou.

Ressalvas:
1. `docs/contexto/dados.md:65,87` citavam `updateCustom`. Corrigido pelo orquestrador.
2. `docs/mapa-modulos.md:15` passou para o estado "em extração", e a linha 67 cita o store de `meus-dados`. Corrigido pelo orquestrador. Ele também atualizou as citações de `customStore.ts` em `armadilhas.md`, `mesa.md`, `visao-geral.md` e `dados.md`, e os comentários de `dados/contracts.ts:28` e `dados/domain/catalogo.ts:6`.
3. Opcional, sem bloqueio: dois testes poderiam ser mais fortes. Um é a ordem do `excluir` no mock (`acoes.test.ts:88`). O outro é o `sessionOnly` já `true` antes do `salvar` (`:57`). Fica para a OS-0029, junto com os testes do módulo.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (regra de gate).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 48 arquivos, 471 testes |
| `npm run test:server` | ✅ 23 testes |
