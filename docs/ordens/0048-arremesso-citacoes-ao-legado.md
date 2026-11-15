# Ordem de serviço: `arremesso`, as citações ao legado que não existe mais

Ordem: OS-0048 (fase 7, limpeza, parte 2)
Módulo: `arremesso`
Escopo de escrita (**só comentários e docs, nenhuma linha de código muda**):
- `src/modules/arremesso/`: `cena.ts:3-4`, `CLAUDE.md` (linhas 14, 31, 34 e 35), `NOTAS.md` (linhas 30, 36 e 49), `scene/corpos.ts:2`, `scene/MaoDoArremesso.tsx:17` e `scene/LoopDoArremesso.tsx:15`.
- **Docs e comentários de outros módulos** (só a citação):
  - `src/modules/mesa/NOTAS.md:33`, onde o `QuebraDaMesa` aparece como "legado de `pressagios`" e agora é do módulo `pressagios`;
  - `src/modules/mesa/domain/tableImages.ts:74`, onde está "marked by Stage", mas quem marca é a casca, `app/Cena.tsx`, por `marcarRenderizadorPorSoftware()`;
  - `src/modules/meus-dados/CLAUDE.md:19` e `src/modules/selecao/CLAUDE.md:24`, onde "o cabeçalho legado" passa a ser "o cabeçalho de antes da extração (fixture)". Faça o mesmo em `arremesso/CLAUDE.md:19`.
- **Testes de arquitetura:** `tests/arquitetura/regras.ts:135`, só o comentário que lista as pastas do legado. Hoje não existe legado: o comentário passa a dizer que fora dos módulos ficam só a casca e `src/shared`, e que a regra continua valendo para qualquer arquivo que apareça fora deles.

Objetivo: as docs e os comentários do `arremesso` ainda falam do `Hand` do legado, que virou a `Vitrine` na OS-0044, do "presságio (legado)", que é o módulo `pressagios` desde a OS-0040, e de "ponte para o store legado". Quem lê fica achando que ainda existe legado. O texto passa a dizer o que é verdade hoje. O código não muda.

Leia antes de começar:
- `src/modules/arremesso/CLAUDE.md` e `NOTAS.md`
- As linhas listadas acima
- `src/app/Cena.tsx`, a composição: a ordem de `<MaoDoArremesso/>` e `<Vitrine/>`, e quem passa o `omenTest` ao `<LoopDoArremesso/>`
- `src/modules/vitrine/CLAUDE.md` e `src/modules/pressagios/CLAUDE.md`, só o Expõe

Decisões do orquestrador:
1. **Os nomes de hoje.** `Hand` do legado vira a `Vitrine` (`vitrine/scene/Vitrine.tsx`). "O presságio (legado)" vira `pressagios` (o store dele assina `resultadoPublicado`). "Legacy store" vira `pressagios`.
2. **`omenTest` por prop.** Não é uma ponte provisória. É inversão de dependência: `pressagios` depende de `arremesso`, e o `arremesso` não pode importar `pressagios` sem criar um ciclo. Por isso a casca passa `presagio().omenTest` como função. O `CLAUDE.md:31` e o comentário de `LoopDoArremesso.tsx:15` passam a dizer isso, sem "legado" nem "ponte".
3. **`dadoNaCena` (`CLAUDE.md:35`).** Fica a nota de que ele não existe por falta de chamador, citando a `Vitrine` no lugar do `Hand`.
4. **Nenhuma linha de código muda.** Confira com `git diff --stat` e `git diff`: o diff tem só linhas de comentário e de Markdown.

Entregáveis: as citações corrigidas.

Critérios de aceite:
- `grep -rn "Hand\`\|legacy\|legado" src/modules/arremesso` não mostra citação a legado que não existe. As palavras `hand` e `HAND` do domínio, que nomeiam a fase e a mão, ficam.
- `grep -n "Stage" src/modules/mesa/domain/tableImages.ts` volta vazio.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam.
- **Sem E2E.**

Fora do escopo: qualquer mudança de código.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- Corrigidas as citações listadas: o `Hand` virou a `Vitrine` (`cena.ts:4`, `corpos.ts:2`, `MaoDoArremesso.tsx:17`, `CLAUDE.md:34-35` e `NOTAS.md:30, 36, 49`), "o presságio (legado)" virou o store de `pressagios` que assina `resultadoPublicado` (`CLAUDE.md:14`) e o "legado de `pressagios`" de `mesa/NOTAS.md:33` virou "do módulo `pressagios`".
- `omenTest` (`CLAUDE.md:31`, `LoopDoArremesso.tsx:15`) agora é descrito como inversão de dependência: `pressagios` depende de `arremesso`, então a casca passa `() => presagio().omenTest`. Saíram "legado" e "ponte". No `.tsx` o comentário ganhou uma linha.
- "Cabeçalho/rodapé legado" virou "de antes da extração (fixture)" em `arremesso`, `meus-dados` e `selecao`. Em `tableImages.ts:74`, `Stage` virou a casca `app/Cena.tsx` por `marcarRenderizadorPorSoftware()`. Em `regras.ts:135`, o comentário diz que fora dos módulos ficam só a casca e `src/shared`, e que a regra vale para qualquer outro arquivo.
- `git diff`: 11 arquivos, 19+/17-, e todas as linhas alteradas são comentário ou Markdown. Os greps de aceite foram verificados, e `grep Stage tableImages.ts` volta vazio.
- Sobras fora do escopo, não tocadas: `arremesso/tests/componentes.test.ts:1` (comentário "legacy footer") e `:29` (nome do `describe`, que é código). `NOTAS.md:27` ("o `useDice` legado deixou de existir") foi mantida porque é histórica e verdadeira.
- `npm run build`, `npm run lint`, `npm test` (558) e `npm run test:server` (23) passam. Sem E2E, sem commit.

## Parecer do revisor

**APROVADO COM RESSALVAS.** Todos os hunks são comentário ou Markdown, e o texto novo bate com o código: a ordem `MaoDoArremesso` → `Vitrine` → `LoopDoArremesso`, o `omenTest` vindo de `presagio()` pela casca, `marcarRenderizadorPorSoftware` só em `Cena.tsx:42`, os leitores de `registroDeCorpos` e o `pressagios → arremesso` em sentido único.

1. `tests/arquitetura/regras.ts:135`: o comentário novo deixava de dizer que importar a casca falha. O orquestrador corrigiu.
2. `arremesso/tests/componentes.test.ts:1,29` e `NOTAS.md:27` ficam: o primeiro está fora do escopo e o `:29` é código; a nota é histórica e verdadeira.
3. Sobras de "legado" em código de teste (`regras.ts:91` e a mensagem de `:141`; `mesa/tests/painel.test.ts:1,24`). A mensagem de `:141` e o `:91` vão para a OS-0049, que é da suíte de arquitetura. Os nomes nos testes de componente ficam, porque são o nome do fixture de antes da extração.

## Gate

2026-11-14, rodado pelo orquestrador, sem E2E (o completo vem no fim da fase 7).

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB |
| `npm run lint` | ✅ |
| `npm test` | ✅ 69 arquivos, 558 testes |
| `npm run test:server` | ✅ 23 testes |
