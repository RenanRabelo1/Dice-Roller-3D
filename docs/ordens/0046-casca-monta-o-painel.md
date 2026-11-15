# Ordem de serviço: casca, o painel sai do legado

Ordem: OS-0046 (fase 6, desacoplamento, parte 2)
Módulo: nenhum, só a casca (a raiz de composição)
Escopo de escrita:
- **Legado movido** com `git mv`: `src/ui/Controls.tsx` vai para `src/app/Painel.tsx`, e o componente `Controls` vira `Painel`. A pasta `src/ui/` deixa de existir.
- **Casca:** `src/App.tsx` (o import e o `<Painel />`) e `src/app/testHook.ts`, só o comentário desatualizado acima de `installTestHook`.
- **Docs**, só para trocar a citação do `ui/Controls.tsx` (ou "o `Controls` (legado)") pelo `Painel` da casca (`src/app/Painel.tsx`):
  - `CLAUDE.md` da raiz (linha 5 e a tabela "Onde ficam as coisas");
  - `docs/contexto/visao-geral.md` (linhas 9, 39 e 62);
  - `docs/contexto/dados.md` (linhas 3 e 69);
  - `docs/mapa-modulos.md`, se citar `Controls`;
  - nas docs dos módulos: `src/modules/vitrine/CLAUDE.md:22`, `vitrine/NOTAS.md:16`, o comentário de `vitrine/cena.ts:6`, `mesa/NOTAS.md:22` e o comentário de `arremesso/ui/BarraDeForca.tsx:3`.
  - Os comentários dos testes que dizem o que o `src/ui/Controls.tsx` renderizava **antes** da mudança são históricos e ficam como estão.

Objetivo: tirar o último arquivo do legado. O `Controls.tsx` só compõe o cabeçalho e o rodapé com os componentes que cada módulo expõe, e isso é papel da casca (decisão 6 das fronteiras, em `docs/mapa-modulos.md`). Depois desta ordem, fora de `src/modules/` ficam só a casca (`main.tsx`, `App.tsx`, `app/`) e `src/shared/`. O comportamento, o DOM e o CSS não mudam.

Leia antes de começar:
- `CLAUDE.md` da raiz
- `src/ui/Controls.tsx` e `src/App.tsx`
- `src/app/testHook.ts`
- `docs/mapa-modulos.md`, a seção "Fronteiras discutíveis", item 6
- `tests/arquitetura/regras.ts`, a regra `moduloSemLegado` (linhas 130 a 140)

Decisões do orquestrador:
1. **`Painel`.** É o `Controls.tsx` movido, com o mesmo JSX e a mesma lógica: o `phase === 'charging'` que mostra a `<BarraDeForca/>` fica na casca, como hoje. Mudam só o nome e os imports: as portas `cena.ts`, com a extensão `.ts`, como no `App.tsx`.
2. **O comentário do `testHook.ts`** passa a dizer o que é verdade hoje: a casca monta o hook com o `inspecao` de cada módulo (ADR 0003, ADR 0008).
3. **Arquitetura.** A regra `moduloSemLegado` continua igual. Confira que nenhum módulo importa `src/app/Painel.tsx`. Se o comentário da regra (linha 135) listar `ui` como legado, deixe como está: a limpeza dela é da fase 7.

Entregáveis:
1. `src/app/Painel.tsx` e o `App.tsx`.
2. O comentário do `testHook.ts`.
3. As docs.

Critérios de aceite:
- `src/ui/` não existe.
- `grep -rn "ui/Controls" CLAUDE.md docs/contexto docs/mapa-modulos.md src --include=*.md --include=*.ts --include=*.tsx` só mostra os comentários históricos dos testes (`tests/componentes.test.ts` de `arremesso`, `meus-dados` e `selecao`, e `vitrine/tests/painel.test.ts`).
- `npm test`, `npm run build`, `npm run lint` e `npm run test:server` passam. O worker não cresce além de 2379,76 kB, e a lista de chunks do build é a mesma de antes, sem chunk novo nem chunk sumido.
- **Sem E2E no dev.** O orquestrador roda o E2E completo no fim da fase 6.

Fora do escopo:
- Mudar o que o painel mostra ou quando mostra, e os comentários históricos dos testes.

Se precisar de algo fora disso: pare e reporte. Não implemente.

## Relatório do dev

- `git mv src/ui/Controls.tsx src/app/Painel.tsx`: `Controls` virou `Painel`, mesmo JSX e mesma lógica (o `phase === 'charging'` fica na casca), imports pelas portas `cena.ts` com extensão. O `git mv` deixou `src/ui/` vazia no disco e eu a removi com `rmdir`. `App.tsx` importa e monta `<Painel />`.
- `testHook.ts`: o comentário agora diz que a casca (`app/Cena.tsx`) monta o hook com o `inspecao` de cada módulo (ADR 0003, ADR 0008).
- Docs: `CLAUDE.md` da raiz (linha 5, e na tabela a linha do legado saiu e o `app/Painel.tsx` entrou na linha da casca), `visao-geral.md` (9, 39 e 62; a linha `ui/` da árvore saiu e o conteúdo dela foi para a linha `app/`), `dados.md` (3 e 69), `mapa-modulos.md` (decisão 6), `vitrine/CLAUDE.md`, `vitrine/NOTAS.md`, `vitrine/cena.ts`, `mesa/NOTAS.md` e `BarraDeForca.tsx`.
- Divergência pequena: no `mapa-modulos.md` a decisão 6 ainda cita o `Controls.tsx`, agora no passado ("Estava no `Controls.tsx` (legado)… desde a OS-0046 é o `Painel`"), porque o item registra uma decisão. Os comentários históricos dos testes ficaram como estavam, e o comentário da regra `moduloSemLegado` também (a limpeza é da fase 7).
- Arquitetura: nenhum módulo importa `src/app/Painel.tsx`. Ele só aparece em comentários de `vitrine/cena.ts` e `BarraDeForca.tsx`. O grep de `ui/Controls` mostra só os 4 comentários históricos dos testes.
- Build: `presim.worker` com 2.379,76 kB, igual ao de antes. Chunks, iguais antes e depois, com os mesmos hashes: index.html, presim.worker, index.css, modelo, rolldown-runtime, HDRLoader, selecao, BufferGeometryUtils, AssistenteDeImportacao, tableFile, ler, index, three.module, rapier.
- Gate: build ok, lint ok (oxlint), `npm test` com 68 arquivos e 558 testes ok, `test:server` com 2 arquivos e 23 testes ok. E2E não rodado, como a ordem manda.

## Parecer do revisor

**APROVADO COM RESSALVAS.**
- **Painel:** é o `Controls.tsx` movido. Mudaram só o nome e os imports, e o JSX e o `phase === 'charging'` são os mesmos.
- **Arquitetura:** nenhum módulo importa `src/app/`, e `semCasca`/`moduloSemLegado` passam.
- **Grep de aceite:** só os 4 comentários históricos dos testes.

Ressalvas, sem ação nesta ordem:
1. Os ADRs 0006 (linha 12), 0007 (23) e 0008 (11) ainda citam o legado. São registros de decisão e ficam como estão.
2. A decisão 6 do `mapa-modulos.md` cita o `Controls.tsx` no passado, apontando para o `Painel`. Aceito, porque o item registra uma decisão.
3. O comentário de `moduloSemLegado` (`tests/arquitetura/regras.ts:135`) ainda lista `ui`. Fica para a fase 7, como diz a decisão 3.

## Gate

2026-11-14, rodado pelo orquestrador. É o fim da fase 6: com as OS-0045 e OS-0046, a casca fica sem pontes e `src/` fica sem legado.

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ worker 2379,76 kB; os mesmos 14 arquivos, com os mesmos hashes de antes da ordem |
| `npm run lint` | ✅ |
| `npm test` | ✅ 68 arquivos, 558 testes |
| `npm run test:server` | ✅ 23 testes |
| `npm run e2e` (completo, fim da fase 6) | ✅ 98 de 98 (18,7 min) |
