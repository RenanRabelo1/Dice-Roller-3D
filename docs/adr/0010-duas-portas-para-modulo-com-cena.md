# ADR 0010: Duas portas para módulo com cena

Status: aceito pelo responsável humano em 2026-11-13, na OS-0021.

## Contexto

A regra 1 do guia diz que um módulo só é acessado pelo `index.ts`. Na OS-0021, o `index.ts` de `dados` passou a exportar também os componentes React/R3F da cena (`AparenciaDoDado`, `GemMaterial`, `usePainted`). Com isso, quem só precisa da parte pura do módulo passou a carregar React:

- **O worker de física** (`presim.worker.ts`) registra os sólidos dos importados e lê o catálogo. Ele cresceu 7,3 KB com o runtime do React.
- **Os testes em Node** passaram a carregar React e three com componentes, e apareceu o aviso `THREE_CJS_DEPRECATED`.

O mesmo vai acontecer com os próximos módulos de cena: `arremesso`, cuja pré-simulação roda no worker, `mesa`, `pressagios` e `vitrine`.

## Decisão

1. Um módulo que tem cena ou componentes React tem **duas portas**:
   - **`index.ts`**: a parte pura (funções, constantes, tipos, eventos, `inspecao()`). Não importa `react`, `@react-three/*` nem arquivo do módulo que importe esses pacotes. É a porta que o worker, os testes em Node e os outros módulos usam para regra e dado.
   - **`cena.ts`**: os componentes React/R3F e os hooks do módulo. Quem desenha (a casca e os componentes de outros módulos) importa daqui.
2. O `contracts.ts` continua sendo importável só com `import type`.
3. O teste de arquitetura aceita `index.ts`, `cena.ts` e `contracts.ts` (este último, só tipo) como destinos de fora do módulo. Ele também verifica que o `index.ts` não alcança `react` nem `@react-three/*`, nem direta nem transitivamente, dentro do módulo.
4. Um módulo sem cena (`regras`, `historico`) continua com uma porta só.

## Consequências

- O worker e os testes em Node voltam a carregar só a parte pura.
- Os pontos de chamada de componente passam a importar de `cena.ts`, o que deixa claro no import quem depende de React.
- A regra 1 do `CLAUDE.md` raiz menciona as duas portas.
- Fica uma porta a mais para manter por módulo de cena. O teste de arquitetura impede que ela vire acesso a arquivo interno.

## Alternativas descartadas

- **Aceitar React no worker e nos testes.** O custo cresce a cada módulo de cena e mistura a dependência de UI no código que roda fora do navegador.
- **Componentes na casca, fora do módulo.** Contraria o desenho aprovado (ADR 0001, specs), em que cada módulo leva a própria cena.
- **Depender de tree-shaking.** Não funciona com o React publicado em CJS e não ajuda os testes em Node.
