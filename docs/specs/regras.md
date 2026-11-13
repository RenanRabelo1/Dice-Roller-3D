# Spec: `regras`

Pasta: `src/modules/regras/`. Pura, compartilhada com o servidor (ADR 0002). Extração nº 1.

## CLAUDE.md (formato final)

### Responsabilidade
Regras do jogo que valem igual no navegador e no servidor: quais tipos de dado existem, que valores cada um pode dar, quantos dados cabem num arremesso, como se soma o total e quando um resultado é crítico, falha ou dualidade. Só funções puras e constantes, sem estado e sem dependências.

### Regras de negócio
- Tipos embutidos, em ordem canônica (é a ordem da UI): `d4 d6 d8 d10 d12 d20 d100 vtm hunger fire coin`.
- Base física de cada tipo embutido: `vtm`/`hunger` → d10, `fire` → d6, os demais são a própria base.
- Um dado importado tem o tipo `custom:<id>`. A base dele é um destes: `d4 d6 d8 d10 d12 d20 livre`. d100 e moeda nunca são importados.
- Faces válidas: embutido ou importado padrão vai de 1 a `SIDES[base]` (d10 de 1 a 10, d100 de 1 a 100, moeda de 1 a 2). Forma livre aceita inteiros de −99 a 999. Importado sem base é inválido.
- Máximo de 10 dados por arremesso (`MAX_DICE`).
- Total = soma dos valores, exceto moedas (1 = cara, 2 = coroa).
- Crítico: 20 no d20 ou 1 no d100. Falha: 1 no d20 ou 100 no d100. Crítico e falha no mesmo arremesso = dualidade.
- Um importado conta como d20 para presságio só se a base é `d20` e o jogador ligou `omens`. A forma livre nunca conta.

### Expõe
- Tipos: `Shape`, `BuiltinKind`, `CustomKind`, `DieKind`, `CustomBase`, `Omen` (`{ crits, fumbles }`, índices), `OmenKind`.
- Constantes: `KINDS`, `BASE`, `SIDES`, `CUSTOM_BASES`, `FREE_VALUES`, `MAX_DICE`.
- `isCustom(kind)`.
- `valoresValidos(die: { kind, base? }) → [min, max] | null`.
- `total(dice: { kind, value }[]) → number`.
- `tipoParaPresagio(die: { kind, base?, omens? }) → DieKind`: devolve `'d20'` para um importado que conta como d20 e o próprio `kind` nos outros casos.
- `omenOf(kinds, results) → Omen | null`, que recebe os tipos já normalizados por `tipoParaPresagio`.
- `omenKind(omen) → OmenKind`.

### Consome
Nada. Não importa `three`, React, zustand nem outro módulo. Usa só sintaxe apagável e imports relativos com extensão `.ts`.

### Fora do escopo
- Geometria, leitura da face e nomes de exibição: `dados`.
- Notação do chat: `selecao`.
- Durações e efeitos dos presságios: `pressagios`.
- O registro dos dados importados: `dados` e `meus-dados`.
- O que o histórico grava: `historico`.

## Dados de que é dono
Nenhum.

## Origem do código

| De | O quê |
|---|---|
| `src/dice/kinds.ts` | tudo, **exceto** `omenD20s` (que sai; ver abaixo) |
| `src/dice/omen.ts` | `Omen`, `OmenKind`, `omenOf`, `omenKind`. Ficam no legado `omen.ts`: `OMEN_MS`, `DUALITY_HIT`, `omenMs` e `isD20` (vão para `pressagios`) |
| `src/dice/polyhedra.ts:253` | `MAX_DICE` |
| `server/src/rules.ts:9-16` | `range` → `valoresValidos` |
| `server/src/rules.ts:26-27`, `src/dice/notation.ts:43` | total sem moedas → `total`; "importado d20 com opt-in" → `tipoParaPresagio` |
| `src/dice/custom.ts:56` | a regra `base === 'd20' && omens` → `tipoParaPresagio` |

**Sobre `omenD20s`.** Hoje `isD20(kind)` consulta o `Set`. Na extração, o `Set` sai de `regras` e continua no legado (`src/dice/custom.ts`), junto com `isD20`, que passa a ser `regras.tipoParaPresagio(customDie(kind) ?? { kind }) === 'd20'`. Quem chama `omenOf` no cliente (`store.publish`) normaliza os tipos antes. O `isD20` sai do legado quando `dados` e `pressagios` forem extraídos.

**Pontos de chamada a trocar** (legado e servidor):
- quem importa `kinds.ts`, `omen.ts` ou `MAX_DICE`, direto ou pelo reexport de `polyhedra.ts`;
- `server/src/app.ts`, `rolls.ts` e `rules.ts` (passam a importar `../../src/modules/regras/index.ts`);
- os testes `tests/omen.test.ts`, `tests/notation.test.ts` e os que importam `KINDS`/`MAX_DICE`.

## Critérios de aceite da extração
- `src/modules/regras/` com `CLAUDE.md`, `index.ts`, `contracts.ts`, `domain/` e `tests/`. Os testes cobrem faces válidas por base (incluindo d10 = 10, moeda, forma livre −99/999, importado sem base), total com moedas, crítico/falha/dualidade em d20, d100 e importado, e `tipoParaPresagio`.
- `server/` importa só `src/modules/regras/index.ts`. `cd server && npm test` e `npm run typecheck` passam.
- `src/dice/kinds.ts` não existe mais; nenhum arquivo importa `kinds.ts` nem o `omenOf` de `omen.ts`.
- O teste de arquitetura passa: `regras` não importa nada de fora.
- O gate completo passa, mais a suíte do servidor.
