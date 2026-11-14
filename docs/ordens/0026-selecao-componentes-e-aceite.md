# Ordem de serviço: `selecao`, componentes e CLAUDE.md

Ordem: OS-0026 (extração nº 4, `selecao`, parte 3 de 3)
Módulo: `selecao`
Escopo de escrita:
- `src/modules/selecao/`: `ui/*.tsx` (novo), `cena.ts`, `tests/` e `CLAUDE.md` (novo).
- **Legado:**
  - `src/ui/Chat.tsx`, que sai com `git mv`;
  - `src/ui/Controls.tsx`, que passa a usar os componentes do módulo.
- **Testes** que importem `src/ui/Chat`, se houver.
- **Docs:**
  - `docs/contexto/dados.md`: a parte de notação e chat sai, porque vai para o `CLAUDE.md` do módulo, e entra um ponteiro;
  - `docs/contexto/visao-geral.md`, na árvore.

Objetivo: os componentes de escolher dados passam a ser do `selecao`, e o módulo ganha o `CLAUDE.md`. O HTML gerado, os textos, `aria-label`, roles e classes ficam **idênticos**, porque são contrato dos E2E e do CSS. O comportamento não muda.

Leia antes de começar:
- `docs/specs/selecao.md`, nas seções do `CLAUDE.md`
- `src/modules/selecao/index.ts`, `cena.ts` e `contracts.ts`
- `src/ui/Controls.tsx`, inteiro (107 linhas), e `src/ui/Chat.tsx`, inteiro (65 linhas)
- `src/modules/dados/CLAUDE.md`, como modelo de formato
- `docs/contexto/dados.md`, só as seções de notação e chat

Decisões do orquestrador:
1. **Componentes**, em `src/modules/selecao/ui/`, exportados por `cena.ts`:
   - **`<Chat/>`:** o `Chat.tsx` inteiro, movido com `git mv` e sem mudança de código. Só os imports passam a ser relativos ao módulo.
   - **`<BotaoDeDado kind/>`:** o par "Adicionar"/"Remover" de hoje, as linhas 61-64 de `Controls.tsx`, como **fragmento**, sem o `div.pick`. Ele lê a mão com `useSelecao()` e chama `adicionar`/`remover`.
   - **`<BotoesDeDados/>`:** o `div.selection` do grupo "Dados", com `KINDS.map` e cada tipo num `div.pick` contendo `<BotaoDeDado kind/>`.
   - **`<ResumoDaMao/>`:** o `<p className="pool" aria-live="polite">{formatDice(dice)}</p>`.
2. **`Controls.tsx`:**
   - usa `<BotoesDeDados/>`, `<ResumoDaMao/>` e `<Chat/>`;
   - no grupo "Meus dados", continua montando o `div.pick` de cada importado, com `<BotaoDeDado kind/>` dentro, seguido do `InkButton` e da lixeira, que são de `meus-dados` e ficam no legado;
   - deixa de importar `adicionar`/`remover`/`formatDice`/`useSelecao`, se não usar mais;
   - mantém o `thrown` para o `resultText`.
3. **DOM idêntico.** Compare o HTML do cabeçalho antes e depois, num teste de componente (por exemplo, `react-dom/server` `renderToStaticMarkup` de `<Controls/>` com a mão `['d20']` e com `['d6','d6']`). Se o projeto não tiver ambiente para isso, compare à mão e registre no relatório.
4. **`CLAUDE.md` do módulo.** Tem os cinco blocos da spec: Responsabilidade, Regras de negócio, Expõe, Consome e Fora do escopo. Fica entre 30 e 50 linhas e usa os nomes reais. Ele diz:
   - as duas portas;
   - que toda chamada aceita emite `selecaoAlterada`, mesmo quando a mão não muda, e que a recusa não emite;
   - que `removido` do catálogo sempre emite;
   - que a cópia `dice` no store legado é dos dados do arremesso, e não da mão;
   - o que o módulo possui: a mão, no `store.ts` vanilla.
5. **`docs/contexto/dados.md`.** O que trata de notação, chat e apelido passa ao `CLAUDE.md` do módulo. Na doc fica uma linha apontando para ele. O que é de importação ("adicionar dado", calibração) fica, porque é de `meus-dados`.

Entregáveis:
1. Os quatro componentes e o `cena.ts` atualizado.
2. O `Controls.tsx` com os componentes, e o `Chat.tsx` movido.
3. O teste de DOM da decisão 3, ou o registro da comparação.
4. O `CLAUDE.md` do módulo e as docs.

Critérios de aceite:
- `src/ui/Chat.tsx` não existe.
- `grep -n "adicionar\|remover\|formatDice" src/ui/Controls.tsx` não mostra lógica de mão, só o que a decisão 2 mantém.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O `index.ts` continua sem React, e a arquitetura passa.
- **Sem E2E no dev.** O orquestrador roda o E2E de aceite do `selecao` depois da revisão (`chat`, `controls`, `roll`, `import` em especial).

Fora do escopo:
- O `InkButton`, a lixeira, `Importar dado` e o `ImportDie`, que são de `meus-dados`.
- `RollMode`, `Force` e o resultado, que são do `arremesso` e da `vitrine`.
- O CSS.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev
- `Chat.tsx` foi movido com `git mv` para `src/modules/selecao/ui/`, e só os imports mudaram (`../domain/notacao.ts` e `../store.ts`). Os componentes novos são `ui/BotaoDeDado.tsx` (fragmento), `ui/BotoesDeDados.tsx` e `ui/ResumoDaMao.tsx`, e o `cena.ts` reexporta os quatro e o hook.
- **Divergência:** o `useSelecao` passou do `cena.ts` para `ui/useSelecao.tsx`, que o `cena.ts` reexporta. Se os componentes importassem o `cena.ts`, haveria um ciclo de arquivo `cena.ts` ↔ `ui/*`, e a arquitetura falharia. O arquivo é `.tsx` para ficar no escopo `ui/*.tsx`.
- `Controls.tsx` usa `<BotoesDeDados/>`, `<ResumoDaMao/>` e `<Chat/>`. No grupo "Meus dados", o `div.pick` tem `<BotaoDeDado kind/>`, o `InkButton` e a lixeira. Saíram `adicionar`/`remover`/`formatDice`/`useSelecao`/`KINDS`/`MAX_DICE`/`isCustom`, e com isso o `isCustom` e o cast do `removeCustom` ficaram desnecessários. O `thrown` foi mantido.
- **DOM (decisão 3):** antes da mudança, um teste temporário renderizou o `<Controls/>` legado com `renderToStaticMarkup` em 4 mãos: `['d20']`, `['d6','d6']`, 10×d8 (no máximo) e d20 + importado. O cabeçalho capturado ficou em `tests/fixtures/cabecalho-antes.json`. Depois da mudança, a mesma captura saiu idêntica byte a byte (`cmp`), e o teste temporário foi apagado.
- O teste permanente é `tests/componentes.test.ts`. Ele compara os componentes do módulo com a fixture, porque o módulo não pode importar o legado. No SSR, o zustand lê o estado inicial, por isso o teste aponta `store.getInitialState` para o estado vivo.
- O `CLAUDE.md` do módulo tem 40 linhas e os cinco blocos. Em `dados.md`, a seção de notação virou um ponteiro; `resultText` e o papel do `Controls` ficaram, e as menções ao chat no dado livre e na receita foram ajustadas. A árvore do `visao-geral.md` ganhou `modules/selecao/` e perdeu o Chat em `ui/`.
- **Gate:** `npm test` 47 arquivos e 462 testes ok, com a arquitetura; `test:server` 23 ok; build ok, worker 2379,76 kB, igual; lint ok (exit 0). `src/ui/Chat.tsx` não existe, e o grep de `Controls.tsx` não acha nada. E2E não foi rodado, como pede a ordem.

## Parecer do revisor

**APROVADO** (revisão da OS e auditoria de aceite do `selecao`). Na primeira tentativa o revisor travou e foi retomado.
- **Decisões 1 a 5:** cumpridas.
- **`Chat.tsx`:** movido com 96% de similaridade; só os imports mudaram.
- **DOM:** conferido de forma independente. Com `renderToStaticMarkup` do `<Controls/>` do HEAD e do novo, nas 4 mãos, a saída é igual byte a byte, e igual à fixture.
- **Fixture e `useSelecao`:** a fixture está em `src/modules/selecao/tests/fixtures/`, dentro do módulo. O `useSelecao` em `ui/` evita o ciclo com o `cena.ts`.
- **`CLAUDE.md`:** 40 linhas, cobrindo o que a decisão 4 pede.

**Auditoria:**
- só `selecao/store.ts` escreve a mão;
- o arremesso legado se reinicia pelo evento, com teste;
- textos e `aria-*` são iguais;
- os testes de notação estão no módulo, sem mudar asserções;
- tudo o que a spec "Expõe" existe. Os nomes da notação ficaram em inglês.

**Observações sem bloqueio:**
1. O teste de componentes não confere a posição de `ResumoDaMao`/`Chat` dentro do cabeçalho. A comparação do revisor cobre isso.
2. O patch do `getInitialState` não é desfeito, mas o Vitest isola cada arquivo.

## Gate

2026-11-14, rodado pelo orquestrador. É o **aceite do módulo `selecao`**, com E2E.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 47 arquivos, 462 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` | ⚠️ 95 de 98 (28,3 min). Falharam os botões de teste **Kraken**, **Tempestade** e **Dualidade** (`omen.spec.ts:144`) |

**Diagnóstico das 3 falhas:** é carga da máquina, não regressão. Os três são os presságios mais raros: o Kraken e a Tempestade pedem um valor exato de d100, chance de 1 em 100, e a Dualidade pede crítico e falha juntos, 1 em 200. O Raio e o Fogo pedem 1 em 20. A busca do worker tem 6000 ms (`BIAS_BUDGET.worker`), e com a máquina carregada não acha o arremesso.
- **Contexto:** 2 GB de memória livre, VS Code e Firefox abertos, e a suíte levou 28 min em vez de 20.
- **Isolados:** rodados sozinhos, os três falham de novo.
- **Teste A/B:** no código de `dee50db`, onde esses testes passaram no aceite do `dados`, eles falham igual (2 de 3) nas mesmas condições.
- **Pendência:** os três voltam a rodar na próxima rodada de E2E com a máquina livre.
