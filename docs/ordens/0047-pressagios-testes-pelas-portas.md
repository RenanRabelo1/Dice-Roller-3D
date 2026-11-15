# Ordem de serviço: `pressagios`, os testes da raiz pelas portas e o kraken no módulo

Ordem: OS-0047 (fase 7, limpeza, parte 1)
Módulo: `pressagios`
Escopo de escrita:
- `src/modules/pressagios/`: `store.ts`, `index.ts`, `tests/` e `CLAUDE.md` (só o bloco Expõe).
- **Testes da raiz:** `tests/omen.test.ts` e `tests/store.test.ts`, só os imports e o `beforeEach`.
- **Testes da `vitrine`:** `src/modules/vitrine/tests/kraken.test.ts`. Sai dele o que só testa `pressagios`; o que testa a `vitrine` fica.

Objetivo:
- Nenhum teste fora do módulo lê o `store.ts` de outro módulo (regra 1 do `CLAUDE.md` raiz, ADR 0003). Hoje `tests/omen.test.ts` e `tests/store.test.ts` importam `arremesso/store.ts` e `pressagios/store.ts` só para reiniciar o estado no `beforeEach`.
- Cada teste fica no módulo que ele testa (regra 7). Hoje `vitrine/tests/kraken.test.ts` tem blocos que só usam `pressagios`.

O comportamento não muda.

Leia antes de começar:
- O `CLAUDE.md` da raiz.
- `src/modules/pressagios/CLAUDE.md`, `index.ts` e `store.ts`.
- `src/modules/arremesso/index.ts` e `store.ts`, só o `reiniciar` e o `getInitialState`.
- `tests/omen.test.ts` e `tests/store.test.ts`.
- `src/modules/vitrine/tests/kraken.test.ts`.

Decisões do orquestrador:
1. **`pressagios.reiniciar()`.**
   - Exporte pelo `index.ts` uma função que volta o store dos presságios ao estado inicial. O efeito é o mesmo de `store.setState(store.getInitialState(), true)` hoje.
   - Ela entra no Expõe do `CLAUDE.md`, que diz para que serve: os testes e a casca, se um dia precisarem.
   - O nome no `index` pode ser `reiniciarPresagio`, se `reiniciar` colidir em quem importa os dois módulos.
2. **O `arremesso` nos testes da raiz.**
   - O `arremesso.reiniciar()` de hoje faz `set((s) => selection(s))`. Isso não é o mesmo que `setState(getInitialState(), true)`.
   - Troque por ele e confira que os testes continuam passando **com as mesmas asserções**.
   - Se algum teste depender do estado inicial completo, como `throwId`, `force` ou `results`, **pare e reporte**. Não altere o `arremesso`, porque ele é de outra ordem.
3. **`kraken.test.ts`.**
   - Os blocos que só chamam funções de `pressagios`, sem `showcasePoses` nem nada da `vitrine`, vão para `src/modules/pressagios/tests/`. Pode ser um arquivo novo ou um que já exista, se o tema for o mesmo.
   - Os blocos que usam `showcasePoses` ficam em `vitrine/tests/kraken.test.ts`.
   - O código de cada teste não muda; só os imports. Liste no relatório quais blocos foram e quais ficaram.
4. **Contagem.** O número total de testes do `npm test` não muda.

Entregáveis:
1. A função de reinício no `pressagios`.
2. Os testes da raiz sem `store.ts`.
3. O `kraken.test.ts` dividido.

Critérios de aceite:
- `grep -rn "store.ts'" tests/*.ts` volta vazio.
- `grep -n "pressagios" src/modules/vitrine/tests/kraken.test.ts` mostra só o que os testes da `vitrine` usam.
- `npm test` (com o mesmo total), `npm run build`, `npm run lint` e `npm run test:server` passam.
- **Sem E2E.**

Fora do escopo:
- O `arremesso` e os testes de arquitetura (uma regra que proíba isso nos testes é da OS-0049).

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- **Decisão 1.** `reiniciarPresagio()` em `pressagios/store.ts` faz `store.setState(store.getInitialState(), true)` e sai pelo `index.ts`. Entrou no Expõe do `CLAUDE.md`. O nome evita colidir com o `reiniciar` do `arremesso` nos testes que importam os dois.
- **Decisão 2.** `tests/omen.test.ts` e `tests/store.test.ts` não importam mais nenhum `store.ts`: o `beforeEach` chama `reiniciar()` e `reiniciarPresagio()`. O `arremesso` não mudou.
- **Divergência aceita pelo orquestrador (saída b).** O `reiniciar()` não zera o `throwId`. Por isso o `roll()` de `omen.test.ts` devolve `arremesso().throwId` e cada `publish(1, …)` e cada `throwId: 1` usam esse id. Em `store.test.ts`, o id fica guardado em `base` e as asserções esperam `base` e `base + 1`. A intenção dos testes é a mesma. Sem essa troca, 6 testes falham.
- **Kraken, foram para `pressagios/tests/kraken.test.ts`:** os `describe` inteiros "temporary tray fragments" e "trayBrokenAt". Também foi o `it` "only a positive d100 critical…", num `describe` novo com o título de origem, já que ele não usa nada do escopo. O código dos `it` não mudou.
- **Kraken, ficaram na `vitrine`:** o resto do "d100 = 1…" e o "d100 = 100: the storm", que usam `showcasePoses`. Depois do dev, o orquestrador moveu também "the tentacle holds…" e "breaks the tray…", que só usam `krakenAt`, para o `describe` do `pressagios`. O `grep` de `pressagios` na vitrine mostra só `KRAKEN`, `krakenDieAt`, `STORM`, `stormAt` e `stormDieAt`.
- **Contagem:** 558 testes antes e depois. Os arquivos passaram de 68 para 69 por causa do arquivo novo.
- **Gate:** `build`, `lint`, `npm test` (558/558) e `test:server` (23/23) passam. `grep -rn "store.ts'" tests/*.ts` volta vazio. Sem E2E e sem commit.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Asserções:** nenhuma ficou mais fraca. Os 13 `it` do kraken foram copiados sem mudança: 9 foram para `pressagios` e 4 ficaram na `vitrine`. O `base`/`base + 1` reproduz o 1 → 2 de antes.
- **Contagem:** 558 testes em 69 arquivos. O `reiniciarPresagio` tem o mesmo efeito do reinício anterior. Os testes da raiz não importam nenhum `store.ts`, e o Expõe está atualizado.

Ressalvas:
1. O `reiniciar` do `arremesso` não zera `aim`, `chargeMode`, `raw` e `ready`. Nenhum teste dos dois arquivos depende deles. Aceito, porque é o reinício que a porta oferece e o `arremesso` fica fora desta ordem.
2. O relatório do dev estava desatualizado sobre os dois `it` que o orquestrador moveu. Corrigido.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (o completo vem no fim da fase 7).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 69 arquivos, 558 testes (mesmo total) |
| `npm run test:server` | ✅ 23 testes |
