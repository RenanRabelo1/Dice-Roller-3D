# Ordem de serviço: testes de arquitetura, exceções zeradas e as brechas da heurística

Ordem: OS-0049 (fase 7, limpeza, parte 3)
Módulo: nenhum. A ordem é da suíte `tests/arquitetura/`, que atravessa os módulos (ADR 0006, ADR 0009).

Escopo de escrita:
- `tests/arquitetura/`: `config.ts`, `donos.ts`, `regras.ts`, `leitor.ts` (se precisar), os `*.test.ts` e `fixtures/`.
- `docs/contexto/testes.md`, só a seção dos testes de arquitetura.

Objetivo: fechar a fase 7 do plano, com as "exceções zeradas nos testes de arquitetura", e as duas brechas que ficaram anotadas.
- `DADOS_LEGADO` ainda tem uma entrada: o store da falha, em `src/shared/plataforma/falha.ts`, que o ADR 0008 permite. É uma permissão definitiva, não um legado à espera de sair.
- A regra do zustand só reconhece `create` de `'zustand'`. Não vê `createStore` nem `'zustand/vanilla'` (ressalva R2 da OS-0024). Os módulos usam `createStore` de `zustand/vanilla`, então hoje a regra não enxerga os stores deles.
- Os testes da raiz (`tests/*.ts`) não são lidos pela suíte. Por isso nada impedia que eles importassem o `store.ts` de um módulo, como aconteceu até a OS-0047.

Leia antes de começar:
- `CLAUDE.md` da raiz.
- `docs/adr/0003*`, `0006*`, `0008*` e `0009*`.
- `tests/arquitetura/` inteiro.
- `docs/contexto/testes.md`, a seção da arquitetura.
- `src/shared/plataforma/falha.ts`.
- Os `store.ts` dos módulos, só os imports do zustand (`grep -rn "zustand" src`).

Decisões do orquestrador:
1. **Exceção zerada.**
   - A permissão do ADR 0008 sai de `DADOS_LEGADO` e entra na própria regra 5, nomeada: o zustand é permitido em `src/modules/<m>/store.ts` e em `src/shared/plataforma/falha.ts`. O motivo fica num comentário que cita o ADR 0008.
   - `DADOS_LEGADO` fica `[]`, como o `CICLOS_CONHECIDOS`.
   - O mecanismo das duas listas fica, para uma exceção futura com ADR.
2. **Brecha do zustand.**
   - A regra passa a reconhecer `create` de `'zustand'` e `createStore` de `'zustand/vanilla'`, por nome e por namespace, como hoje faz com `create`.
   - Ganha fixtures que disparam com `createStore` fora de `store.ts` e que passam dentro.
   - Antes de mudar a regra, rode-a e confira que nenhum arquivo de produção viola. Se algum violar, **pare e reporte**, sem mexer em produção.
3. **Os testes da raiz pelas portas.**
   - Uma regra nova lê `tests/*.ts` e `tests/helpers/**`, sem `tests/arquitetura/`. Ela exige que o import de `src/modules/<m>/` vá só por `index.ts`, `cena.ts` ou `contracts.ts` com `import type`, a mesma porta única da regra 1.
   - Ganha uma fixture que dispara e uma que passa.
   - Se algum teste da raiz violar hoje, **pare e reporte** a lista. A OS-0047 já tirou os `store.ts`.
   - Os testes dentro dos módulos continuam como estão.
4. **Textos da suíte.** O comentário de `regras.ts:91` ("shell, legacy or modules") e a mensagem de `moduloSemLegado` (`:141`, "importa arquivo do legado ou da casca") passam a dizer só o que existe hoje: "arquivo fora dos módulos e de `src/shared`". O nome da função pode ficar. Se o nome da mensagem for conferido em algum teste, atualize o teste junto (OS-0048, ressalva 3).
5. **Docs.** A seção da arquitetura em `docs/contexto/testes.md` diz:
   - que as duas listas de exceção estão vazias;
   - que a permissão do ADR 0008 está na regra;
   - que a regra do zustand vê `createStore`;
   - que os testes da raiz também passam pela porta única.

Entregáveis:
1. A regra 5 com a permissão nomeada e `DADOS_LEGADO = []`.
2. A regra do zustand com `createStore`/`zustand/vanilla`, com fixtures.
3. A regra dos testes da raiz, com fixtures.
4. A doc.

Critérios de aceite:
- `CICLOS_CONHECIDOS` e `DADOS_LEGADO` são `[]`.
- `npm test` passa, com os testes novos de fixture. `npm run build`, `npm run lint` e `npm run test:server` também passam.
- **Sem E2E.**

Fora do escopo: qualquer arquivo de produção (`src/`, `server/src/`) e os `e2e/`.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- **Exceção zerada:** `DADOS_LEGADO = []` (comentário em `config.ts` diz que a permissão definitiva fica na regra). A regra 5 de `donos.ts` permite o zustand em `src/modules/<m>/store.ts` e em `ZUSTAND_EM_SHARED = 'src/shared/plataforma/falha.ts'`, com comentário citando o ADR 0008; a mensagem passou a "create/createStore do zustand fora de src/modules/<m>/store.ts e de src/shared/plataforma/falha.ts" (referência + ADR 0008). Um teste novo confere `DADOS_LEGADO` e `CICLOS_CONHECIDOS` iguais a `[]`.
- **Zustand:** antes da mudança, conferi por grep que todo `createStore` de produção está em `src/modules/<m>/store.ts` (nenhuma violação). A regra reconhece, por nome (renomeado também) e por namespace, `create` e `createStore` de `'zustand'` e `createStore` de `'zustand/vanilla'` (`FABRICAS_DO_ZUSTAND`). Fixtures em `fixtures/dados/`: `mesa/vanilla.ts`, `mesa/vanillaEspaco.ts`, `mesa/createStoreDaRaiz.ts` e `shared/plataforma/outra.ts` disparam; `meus-dados/store.ts` (createStore) e `shared/plataforma/falha.ts` passam.
- **Testes da raiz:** a regra nova `testesDaRaizPelasPortas` (`regras.ts`) reusa o critério da porta única (helper `pelaPorta`, agora também em `portaUnica`). Ela lê `RAIZES_TESTES_DA_RAIZ = ['tests']` sem `FORA_DOS_TESTES_DA_RAIZ = ['tests/arquitetura']`, pelo parâmetro novo `fora` de `lerGrafo` (`leitor.ts`). A fixture `fixtures/testes/` tem `tests/portaErrada.ts` → `store.ts` (dispara), `tests/helpers/pelaPorta.ts` → index/cena/contracts type (passa) e `tests/arquitetura/ignorado.ts` (não é lido). Nenhum teste da raiz viola hoje.
- **TDD:** cada teste e fixture foi escrito antes e falhou (lista de 9 em vez de 12, `DADOS_LEGADO` não vazia, regra inexistente) antes de a regra mudar.
- **Textos:** os comentários de `sharedIsolado` e `moduloSemLegado` e a mensagem desta passaram a "módulo importa arquivo fora dos módulos e de src/shared". Nenhum teste conferia essa mensagem, só os pares.
- **Doc:** a seção da arquitetura em `docs/contexto/testes.md` diz que as duas listas estão vazias, que a permissão do ADR 0008 está na regra, que a regra vê `createStore` (a heurística agora só cita `createWithEqualityFn` como não visto) e que os testes da raiz passam pela porta única.
- **Divergências:** (1) a regra também reconhece `createStore` de `'zustand'`, porque a raiz do pacote reexporta `zustand/vanilla` e seria a mesma brecha. (2) A regra dos testes lê `tests/` sem `tests/arquitetura/`, que hoje é exatamente `tests/*.ts` + `tests/helpers/**`; uma pasta nova em `tests/` também fica coberta. (3) A referência de `moduloSemLegado` trocou "plano §3, Convivência com o legado" por "regra 1 do guia; ADR 0006", porque o legado não existe mais.
- **Gate:** `npm run build` ok, `npm run lint` ok (exit 0), `npm test` 69 arquivos / 562 testes ok, `npm run test:server` 2 arquivos / 23 testes ok. Sem E2E e sem commit, como pedido. Nenhum arquivo de `src/` ou `server/src/` foi tocado.
- **Ressalva 1 (store cru):** antes, conferi que nenhum `index.ts`/`cena.ts` de produção reexporta `store` (só funções de `./store.ts`). A regra nova `storeCruNaPorta` (`regras.ts`, AST do swc no nível de cima da porta) dispara com `export { store }`, `export { store as x }`, `export *`/`export * as x` de `./store.ts`, nome importado como `store` (ou namespace) e reexportado, e `export default` desse nome. Na fixture `fixtures/store-cru/`, `dispara/` dá 4 violações e `passa/` (funções do store, store usado dentro de função) nenhuma; o teste falhou antes de a regra existir. A frase vencida da doc foi trocada.
- **Ressalvas 2 e 3:** a heurística da regra dos testes da raiz em `testes.md` registra que ela não vê `vi.mock`/`vi.doMock`/`vi.importActual` nem import interno de `server/src/modules/<m>/` ("a revisão confere"). A base passou a ser "regra 1 do guia; ADR 0006" em `config.ts`, na referência da regra em `regras.ts` (e no teste que a confere) e no bullet da doc. O "ADR 0007 ponto 9" que fica em `testes.md:32` e `config.ts:27` é o de `REGRAS_TESTES_PODEM_IMPORTAR`, que está certo, e não foi mexido.
- **Gate depois das ressalvas:** `npm test` 69 arquivos / 564 testes ok, `npm run lint` ok, `npm run build` ok. Sem commit e sem E2E.

## Parecer do revisor

**APROVADO COM RESSALVAS.** Nenhuma regra perdeu cobertura, e `src/` e `server/src/` não têm diff. O revisor criou arquivos temporários para testar a suíte e apagou todos depois:
- um `createStore` de `zustand/vanilla` em `src/modules/mesa/` fez falhar o teste real;
- um `createStore` em `src/shared/plataforma/` fora de `falha.ts` disparou a regra, porque a permissão do ADR 0008 vale só para o arquivo;
- as fixtures disparam e passam como o relatório diz.

A regra dos testes da raiz cobre `import` estático, `export from`, `import type` de arquivo interno e `import()`. As três escolhas do dev fazem sentido.

Ressalvas, corrigidas nesta ordem:
1. A regra não vê `vi.mock`, `vi.doMock` nem `vi.importActual`, e não vê import interno de `server/src/modules/<m>/`. Nenhum teste usa isso hoje. A lacuna foi registrada na heurística de `docs/contexto/testes.md`, e a revisão confere.
2. `testes.md:52` ainda dizia que a regra "nenhum `index.ts` reexporta o store cru" entraria "com o primeiro módulo que tiver store", mas 6 módulos já têm store. O orquestrador mandou criar a regra: `storeCruNaPorta`, em `regras.ts`, pega `export { store }`, `export { store as x }` e `export *` de `./store.ts` no `index`/`cena`, com fixture que falhou antes. Nenhuma porta de produção viola.
3. A base da regra dos testes da raiz é a regra 1 do guia mais o ADR 0006, e não o ADR 0007 ponto 9. Corrigido em `config.ts` e na doc. O ADR 0007 ponto 9 que continua em `testes.md:32` é o do `REGRAS_TESTES_PODEM_IMPORTAR`, e está certo.

O orquestrador conferiu o diff da correção (a regra nova e a fixture) e rodou o gate.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (o completo vem no fim da fase 7).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 69 arquivos, 564 testes |
| `npm run test:server` | ✅ 23 testes |
