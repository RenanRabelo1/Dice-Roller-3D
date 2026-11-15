# Ordem de serviço: `vitrine`, a cena da vitrine, inspeção e CLAUDE.md

Ordem: OS-0044 (extração nº 9, `vitrine`, parte 4 de 4)
Módulo: `vitrine`
Escopo de escrita:
- `src/modules/vitrine/`: `scene/Vitrine.tsx` (novo), `index.ts`, `cena.ts`, `contracts.ts` (só para acrescentar), `tests/`, `CLAUDE.md` (novo) e `NOTAS.md` (novo).
- **Legado movido** com `git mv`: `src/scene/Hand.tsx` vai para `src/modules/vitrine/scene/Vitrine.tsx` (o componente `Hand` vira `Vitrine`). A pasta `src/scene/` deixa de existir.
- **Casca:** `src/app/Cena.tsx`.
  - Composição: `<Vitrine/>` no lugar de `<Hand/>`.
  - Test hook: `highlights`, `inkGlow` e `meshes` (decisão 3).
- **Testes:** `tests/kraken.test.ts` vai para o módulo, se não depender mais do legado. Se depender, só mudam os imports.
- **Docs:** `docs/contexto/apresentacao.md` sai, porque o conteúdo vai para o `CLAUDE.md`/`NOTAS.md` da vitrine. Também os links para ele (`grep -rn "apresentacao.md" docs CLAUDE.md src`, fora de `docs/ordens`, `docs/diagnostico*` e `docs/superpowers`), e `docs/contexto/visao-geral.md`.

Objetivo: fechar a `vitrine` e, com ela, a extração dos módulos.
- A cena que mostra o resultado passa ao módulo: o voo até a câmera, os números em destaque, a gravação acesa, a moeda e o percurso de presságio perguntado a `pressagios`.
- O test hook deixa de procurar `result-highlights` e `ink-glow-i` pelo nome e passa a usar o `inspecao()` do módulo.
- O módulo ganha `CLAUDE.md` e `NOTAS.md`.

O comportamento e o visual não mudam.

Leia antes de começar:
- `docs/specs/vitrine.md`, inteiro
- `src/modules/vitrine/index.ts`, `cena.ts`, `store.ts` e `domain/*`
- `src/scene/Hand.tsx`, inteiro
- `src/app/Cena.tsx`, a composição e o test hook (`meshes`, `highlights`, `inkGlow`)
- `docs/contexto/apresentacao.md`, inteiro
- `src/modules/pressagios/CLAUDE.md` e `NOTAS.md`, como modelo

Decisões do orquestrador:
1. **`Vitrine`.**
   - É o `Hand.tsx` movido, com o mesmo código. Mudam só os imports, para as portas de `arremesso`, `pressagios`, `dados` e `regras`, e o nome.
   - O `cena.ts` o exporta.
   - A casca o põe **no mesmo lugar** do `<Hand/>`, logo depois de `<MaoDoArremesso/>` e dentro do `<Physics>`.
2. **Só a vitrine move os dados em `settled`.** Isso já vale desde a OS-0043, porque o `Hand` chama `moverDado`. Confira que continua valendo.
3. **`inspecao(cena)`** no `index.ts`.
   - Devolve `{ highlights(), inkGlow(i) }`, com o mesmo formato e o mesmo cálculo de `Cena.tsx` hoje.
   - Os nomes `result-highlights` e `ink-glow-i` passam a existir só dentro do módulo.
   - O `meshes` do test hook, que procura `gem-i`, passa a usar `gemaNaRaiz` do `dados`.
   - O `DiceHook` não muda.
4. **`CLAUDE.md` e `NOTAS.md`.**
   - O `CLAUDE.md` tem os cinco blocos da spec, entre 30 e 50 linhas, com os nomes reais. Ele diz:
     - as duas portas;
     - que a vitrine espera `presagioTocando()`;
     - o layout e a linha do tempo, em resumo;
     - que os dados com percurso seguem `movimentoNoPresagio`;
     - `moverDado`;
     - `vitrineConcluida`;
     - o movimento reduzido;
     - `PainelDoResultado`;
     - o que o módulo possui: `showcased` e o cache do brilho.
   - O detalhe de `docs/contexto/apresentacao.md` que for da vitrine vai para `NOTAS.md`. O que for de presságio já está no `NOTAS.md` dos `pressagios`, e esse fica só como ponteiro, se necessário.
   - `docs/contexto/apresentacao.md` sai.

Entregáveis:
1. `scene/Vitrine.tsx` e o `cena.ts`.
2. `inspecao()` e o test hook sem procurar nomes.
3. O teste movido, se der.
4. `CLAUDE.md`, `NOTAS.md` e as docs.

Critérios de aceite:
- `src/scene/` não existe, e `docs/contexto/apresentacao.md` também não.
- `grep -n "getObjectByName" src/app/Cena.tsx` não mostra `result-highlights`, `ink-glow` nem `gem-`.
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O `index` fica sem React, o worker não cresce e a arquitetura passa.
- **Sem E2E no dev.** O orquestrador roda o E2E completo de aceite.

Fora do escopo:
- `src/ui/Controls.tsx` (fase 6/7) e mudanças de comportamento.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- **Vitrine:** `git mv src/scene/Hand.tsx src/modules/vitrine/scene/Vitrine.tsx`. Mudaram só os imports (portas de `dados`, `regras`, `arremesso`, `pressagios`, `shared`, com `.ts`; o próprio módulo direto de `domain/` e `store.ts`), o nome `Hand` → `Vitrine` e a 1ª linha do comentário. `src/scene/` saiu. `cena.ts` exporta `Vitrine`; a casca o monta no lugar do `<Hand/>`.
- **Decisão 2:** `moverDado` só é chamado pela `Vitrine` (grep), e ele mesmo ignora fora de `settled`.
- **inspecao(cena)** no `index.ts` → `{ highlights(), inkGlow(i) }`, mesmo formato e cálculo. Tipos novos em `contracts.ts`: `VitrineInspecionada`, `DestaqueInspecionado`, `BrilhoInspecionado`. Para o `index` ficar puro (sem troika), `text` usa `typeof o.text === 'string'` no lugar de `o instanceof Text`: os filhos do grupo são `Text` e as malhas de símbolo (sem `text`), então o resultado é o mesmo.
- **Casca:** `highlights`/`inkGlow` pela `inspecao`; `meshes` usa `gemaNaRaiz(dice.current, i)`; saíram os imports de `Mesh`, `Material` e `Text`. `DiceHook` igual.
- **Teste:** `tests/kraken.test.ts` → `src/modules/vitrine/tests/` (só módulos; imports relativos).
- **Docs:** `CLAUDE.md` (36 linhas) e `NOTAS.md` da vitrine; `apresentacao.md` removido (`git rm`); links em `CLAUDE.md`, `docs/contexto/dados.md`, `visao-geral.md`, `mapa-modulos.md` e no `CLAUDE.md`/`NOTAS.md` dos `pressagios`. Além do link, troquei `Hand.tsx` → `Vitrine` em `pressagios/NOTAS.md` (percurso do d100) e no comentário de `vitrine/domain/inkGlow.ts`.
- **Gate:** `npm test` 66 arquivos/555 ok; `test:server` 23 ok; build ok, worker 2.379,76 kB (igual); lint exit 0; greps de aceite vazios.
- **Ressalva do revisor:** `tests/inspecao.test.ts` novo, com cena à mão (um `Object3D` com `text` no lugar do `Text` do troika, uma malha de símbolo e `ink-glow-0` com 2 triângulos). Confere `highlights()` e `inkGlow(0)`/`inkGlow(1)`. `npm test` 67 arquivos/557 ok; lint exit 0.
- **Pendências fora do escopo:** `Hand.tsx`/`src/scene` ainda citados em `CLAUDE.md:27` (tabela do legado), `docs/contexto/dados.md:61,100`, `docs/backlog.md:70`, `docs/mapa-modulos.md:97` e no comentário de `pressagios/ui/BotoesDeTeste.tsx:12`.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Vitrine:** é o `Hand.tsx` movido, com o mesmo código; mudaram só os imports e o nome. Está no mesmo lugar da cena.
- **Pose em `settled`:** só a `Vitrine` chama `moverDado`.
- **`inspecao`:** mesmo formato e cálculo da casca. O `typeof o.text === 'string'` dá o mesmo resultado do `instanceof Text` nos filhos do grupo, e o `index` continua sem React e sem troika.
- **Casca:** sem `getObjectByName` de `result-highlights`, `ink-glow` ou `gem-`; `DiceHook` igual.
- **Worker:** igual.

Ressalvas:
1. Faltava teste da `inspecao`. O dev criou `tests/inspecao.test.ts`.
2. `CLAUDE.md:20` da vitrine não dizia que o `showcased` da spec é `vitrine().showcased`. Corrigido pelo orquestrador.
3. Menções antigas ao `Hand`/legado no `arremesso` (`cena.ts`, `CLAUDE.md`, `NOTAS.md`, `scene/corpos.ts`, `MaoDoArremesso.tsx`, `LoopDoArremesso.tsx`) e no `mesa/NOTAS.md`. Ficam para a fase 7.
4. A parte de `vitrine/tests/kraken.test.ts` que só testa `pressagios` vai para `pressagios/tests` na fase 7.

O orquestrador também corrigiu as pendências do relatório do dev: `CLAUDE.md` raiz (linhas 5 e 27), `docs/contexto/dados.md:61`, `docs/backlog.md:70`, `docs/mapa-modulos.md` (vitrine concluída, linhas 13 e 66), o comentário de `pressagios/ui/BotoesDeTeste.tsx:12` e o link para `specs/` em `docs/plano-refatoracao.md:3`. `docs/specs/vitrine.md`, a última spec, saiu, e a pasta `docs/specs/` deixou de existir.

## Gate

2026-11-14, rodado pelo orquestrador. É o aceite do módulo `vitrine` e o fim da extração dos 9 módulos.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB (`BHo0CnSe`, igual) |
| `npm run lint` | ✅ |
| `npm test` | ✅ 67 arquivos, 557 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` (completo, aceite do módulo) | ✅ 98 de 98 (18,5 min) |
