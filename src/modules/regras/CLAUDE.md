# Módulo `regras`

Pura, compartilhada com o servidor (ADR 0002). A porta é `index.ts`; tipos em `contracts.ts`, código em `domain/`.

## Responsabilidade
Regras do jogo que valem igual no navegador e no servidor: quais tipos de dado existem, que valores cada um pode dar, quantos dados cabem num arremesso, como se soma o total e quando um resultado é crítico, falha ou dualidade. Só funções puras e constantes, sem estado e sem dependências.

## Regras de negócio
- Tipos embutidos, em ordem canônica (é a ordem da UI): `d4 d6 d8 d10 d12 d20 d100 vtm hunger coin`.
- Base física de cada tipo embutido: `vtm`/`hunger` → d10, os demais são a própria base.
- Um dado importado tem o tipo `custom:<id>`. A base dele é um destes: `d4 d6 d8 d10 d12 d20 livre`. d100 e moeda nunca são importados.
- Faces válidas: embutido ou importado padrão vai de 1 a `SIDES[base]` (d10 de 1 a 10, d100 de 1 a 100, moeda de 1 a 2). Forma livre aceita inteiros de −99 a 999. Importado sem base é inválido. Tipo embutido desconhecido também é inválido (`valoresValidos` devolve `null`).
- Máximo de 10 dados por arremesso (`MAX_DICE`).
- Total = soma dos valores, exceto moedas (1 = cara, 2 = coroa).
- Crítico: 20 no d20 ou 1 no d100. Falha: 1 no d20 ou 100 no d100. Crítico e falha no mesmo arremesso = dualidade.
- Um importado conta como d20 para presságio só se a base é `d20` e o jogador ligou `omens`. A forma livre nunca conta.
- Sem presságio de d20/d100, o primeiro 10 no d10 Fome dispara crítico bestial. Depois, os dois primeiros 10 no d10 Vampiro disparam crítico em par. Por último, o primeiro 1 no d10 Fome dispara falha bestial. Só os tipos literais `vtm` e `hunger` contam.

## Expõe
- Tipos: `Shape`, `BuiltinKind`, `CustomKind`, `DieKind`, `CustomBase`, `Omen` (`{ crits, fumbles }`, índices), `OmenKind`.
- Constantes: `KINDS`, `BASE`, `SIDES`, `CUSTOM_BASES`, `FREE_VALUES`, `MAX_DICE`.
- `isCustom(kind)`.
- `valoresValidos(die: { kind, base? }) → [min, max] | null`.
- `total(dice: { kind, value }[]) → number`.
- `tipoParaPresagio(die: { kind, base?, omens? }) → DieKind`: devolve `'d20'` para um importado que conta como d20 e o próprio `kind` nos outros casos.
- `omenOf(kinds, results) → Omen | null`, que recebe os tipos já normalizados por `tipoParaPresagio`: reconhece d20 só pelo `'d20'` literal.
- `omenKind(omen) → OmenKind`.
- `presagioVampiro(kinds, results) → PresagioVampiro | null`, com `tipo: TipoVampiro` e os índices em `dados`.
- O tipo de entrada `DieInput` fica em `contracts.ts` e não é reexportado por `index.ts`.

## Consome
Nada. Não importa `three`, React, zustand nem outro módulo. Usa só sintaxe apagável e imports relativos com extensão `.ts`, porque o servidor roda estes arquivos direto no Node. O teste de arquitetura confere.

## Fora do escopo
- Geometria, leitura da face e nomes de exibição: `dados`.
- Notação do chat: `selecao`.
- Durações e efeitos dos presságios: `pressagios`.
- O registro dos dados importados: `dados` e `meus-dados`.
- O que o histórico grava: `historico`.

As regras de resultado ficam aqui. A apresentação e a duração dos presságios pertencem a `pressagios`.
