# Ordem de serviço: achados da auditoria de aceite de `regras`

Ordem: OS-0017 (extração nº 1, `regras`, correção do aceite)
Módulo: `regras`

Escopo de escrita:
- `src/dice/custom.ts`, só as linhas 6 e 7 (o reexport)
- os arquivos que recebem `isCustom`, `CustomBase` ou `CustomKind` por `custom.ts`, só nos imports. São estes: `src/dice/notation.ts`, `src/dice/polyhedra.ts`, `src/dice/importer.ts`, `src/physics/presim.ts`, `src/physics/presim.worker.ts`, `src/scene/Die.tsx`, `src/scene/Hand.tsx`, `src/store.ts`, `src/ui/Controls.tsx` e `src/ui/ImportDie.tsx`. Confirme com `grep`, e inclua também `tests/` e `e2e/` se algum importar esses nomes de `custom`.
- `server/src/app.ts` e `server/src/rolls.ts`, só o `maxItems`
- `server/src/rules.ts`, só a função `clean`
- `src/modules/regras/CLAUDE.md`, só os dois acréscimos do item 4

Objetivo: fechar os achados da auditoria de aceite de `regras` (seção 8 do guia: um achado de auditoria vira ordem de correção, com prioridade sobre o resto). São três coisas:
- nenhum arquivo do legado continua repassando símbolos de `regras`;
- o servidor para de repetir o limite de dados e a regra do d20 com `omens`;
- o `CLAUDE.md` do módulo passa a descrever tudo o que o código faz.

O comportamento não muda.

Leia antes de começar:
- `src/modules/regras/CLAUDE.md` e `src/modules/regras/index.ts`
- `src/dice/custom.ts:1-10`
- a linha de `maxItems` em `server/src/app.ts` e em `server/src/rolls.ts`, e a função `clean` em `server/src/rules.ts`
- as linhas de import dos arquivos do escopo

Entregáveis:
1. **Fim do reexport em `custom.ts`.** Saem as linhas 6 e 7: `export { isCustom }` e `export type { CustomBase, CustomKind }`. Quem usava esses nomes passa a importá-los de `regras/index`. Siga o estilo de cada arquivo: se ele já importa de `regras` com `.ts`, junte os nomes nessa mesma linha. O `custom.ts` continua importando de `regras` o que usa por dentro.
2. **Limite no servidor.** Em `server/src/app.ts:25` e `server/src/rolls.ts:20`, o `maxItems: 10` passa a ser `maxItems: MAX_DICE`, importado de `regras`. O valor continua o mesmo, então o validador da coleção não muda.
3. **Regra do d20 no servidor.** Em `server/src/rules.ts`, o `clean` troca `base === 'd20' && omens === true` por `tipoParaPresagio({ kind, base, omens }) === 'd20'`. Para dados importados, as duas expressões são equivalentes, porque `clean` só chega a esse ramo quando `isCustom(kind)`. O documento gravado não muda.
4. **Lacunas do `CLAUDE.md` de `regras`.** Acrescente duas coisas, sem passar de 50 linhas:
   - na seção "Regras de negócio": um tipo embutido desconhecido é inválido (`valoresValidos` devolve `null`);
   - na seção "Expõe": uma nota de que o tipo de entrada `DieInput` fica no `contracts.ts`, sem ser reexportado pelo `index.ts`.

Critérios de aceite:
- O grep `grep -rnE "import[^;]*\b(isCustom|CustomBase|CustomKind)\b[^;]*from '[./]*(dice/)?custom'" src tests e2e` volta vazio. Confira também os imports de várias linhas.
- O grep `grep -rn "maxItems: 10" server/src` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. Os 23 testes do servidor não mudam.
- O `npm run e2e` completo passa; quem roda é o orquestrador.

Fora do escopo:
- O `FACES` de `importer.ts`, o `ImportDie.tsx:271` e o `omenTest.ts:39`. Eles ficam registrados nas specs de `meus-dados` e `pressagios`.
- Padronizar a extensão dos imports. Isso fica para a fase 7.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- **`custom.ts`:** sai o reexport (linhas 6-7). Os 10 arquivos passam a importar `isCustom`, `CustomBase` e `CustomKind` de `regras/index`, juntando os nomes na linha de `regras` quando ela já existia. O `presim.worker.ts` ganha um `import type` novo.
- **Servidor:** `app.ts` e `rolls.ts` usam `maxItems: MAX_DICE`, e o `clean` de `rules.ts` usa `tipoParaPresagio(...) === 'd20'`.
- **`CLAUDE.md` de `regras`:** ganha as duas notas (tipo desconhecido inválido; `DieInput` só no contrato). Fica com 39 linhas.
- **Divergência:** a linha 3 de `custom.ts` também vira `import type`. Sem o reexport, o `isCustom` ficaria sem uso e quebraria o build e o lint.

## Parecer do revisor

**APROVADO.** A divergência é aceitável, porque é consequência direta do entregável 1. Itens 1, 2, 4, 5, 6, 8 e 9 ✅; 3 e 7 não se aplicam.

Pontos conferidos:
- **`clean`:** a regra é equivalente para todo `kind` custom. Com `base` `livre` ou ausente e `omens` `undefined` ou `false`, os dois caminhos dão `false`.
- **`MAX_DICE`:** vale 10, então o validador `$jsonSchema` não muda.
- **Pendência:** o comentário "at most 10" em `rolls.ts:5` continua fixo. Vai para a OS-0018, que move o arquivo.

## Gate

2026-11-13, rodado pelo orquestrador. Sem E2E, pela regra de gate da OS-0017: o E2E de aceite de `regras` é o da OS-0016. As mudanças desta ordem só tocam imports, o `maxItems` com o mesmo valor e o `clean`, que é equivalente, e entram no E2E de aceite do `historico`.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test` | ✅ 34 arquivos, 415 testes |
| `npm run test:server` | ✅ 23 testes |

**Módulo `regras` concluído.** A spec `docs/specs/regras.md` foi removida, absorvida pelo `src/modules/regras/CLAUDE.md` e pelo `contracts.ts`.
